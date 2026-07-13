from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import Class
from app.models.chat import ChatMessage

router = APIRouter()

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
    
    return [
        {
            "id": msg.id,
            "user_id": msg.user_id,
            "content": msg.content,
            "image_url": msg.image_url,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in messages
    ]

@router.post("/class/{class_id}")
async def send_class_message(
    class_id: str,
    content: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "student" and user.class_id != class_id:
        raise HTTPException(status_code=403, detail="无权在该班级发送消息")
    
    message = ChatMessage(
        id=str(uuid.uuid4()),
        class_id=class_id,
        user_id=user.id,
        content=content,
        created_at=datetime.utcnow(),
    )
    
    db.add(message)
    db.commit()
    
    return {"message": "消息发送成功"}