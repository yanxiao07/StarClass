from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import Class
from app.models.chat import ChatMessage

router = APIRouter()


class SendMessageRequest(BaseModel):
    content: str
    imageUrl: Optional[str] = None


@router.get("/class/{class_id}")
async def get_class_messages(
    class_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "student" and user.class_id != class_id:
        raise HTTPException(status_code=403, detail="无权访问该班级消息")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.class_id == class_id)
        .order_by(ChatMessage.created_at)
        .all()
    )

    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.user_id).first()
        result.append({
            "id": msg.id,
            "sender": {
                "id": msg.user_id,
                "name": sender.name if sender else "未知用户",
                "nickname": sender.nickname if sender else "",
                "role": sender.role if sender else "",
                "avatar": sender.avatar if sender else "",
            },
            "content": msg.content or "",
            "imageUrl": msg.image_url or "",
            "createdAt": msg.created_at.isoformat() if msg.created_at else "",
        })

    return result


@router.post("/class/{class_id}")
async def send_class_message(
    class_id: str,
    request: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "student" and user.class_id != class_id:
        raise HTTPException(status_code=403, detail="无权在该班级发送消息")

    message = ChatMessage(
        id=str(uuid.uuid4()),
        class_id=class_id,
        user_id=user.id,
        content=request.content,
        image_url=request.imageUrl,
        created_at=datetime.utcnow(),
    )

    db.add(message)
    db.commit()

    return {
        "id": message.id,
        "sender": {
            "id": user.id,
            "name": user.name,
            "nickname": user.nickname or user.name,
            "role": user.role,
        },
        "content": message.content,
        "imageUrl": message.image_url or "",
        "createdAt": message.created_at.isoformat(),
        "message": "消息发送成功",
    }


@router.post("/upload-chat-image")
async def upload_chat_image(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raise HTTPException(status_code=501, detail="图片上传功能暂未实现")


@router.post("/students/{student_id}/mute")
async def mute_student(
    student_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以禁言学生")
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学生不存在")
    student.is_muted = True
    db.commit()
    return {"message": "学生已禁言"}


@router.post("/students/{student_id}/unmute")
async def unmute_student(
    student_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以解除禁言")
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学生不存在")
    student.is_muted = False
    db.commit()
    return {"message": "学生已解除禁言"}


@router.post("/classes/{class_id}/mute-all")
async def mute_all_students(
    class_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以全员禁言")
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="班级不存在")
    cls.is_all_muted = True
    db.commit()
    return {"message": "已开启全员禁言"}


@router.post("/classes/{class_id}/unmute-all")
async def unmute_all_students(
    class_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以解除全员禁言")
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="班级不存在")
    cls.is_all_muted = False
    db.commit()
    return {"message": "已解除全员禁言"}
