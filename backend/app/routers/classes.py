from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
import random
import string
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import Class

router = APIRouter()


class CreateClassRequest(BaseModel):
    name: str


class JoinClassRequest(BaseModel):
    classCode: str
    class_code: Optional[str] = None

    model_config = {"populate_by_name": True}


def generate_class_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


def format_class(cls: Class, db: Session, include_students: bool = False) -> dict:
    students_q = db.query(User).filter(User.class_id == cls.id, User.role == "student")
    student_count = students_q.count()
    result = {
        "id": cls.id,
        "name": cls.name,
        "classCode": cls.class_code,
        "teacherId": cls.teacher_id,
        "isAllMuted": cls.is_all_muted or False,
        "createdAt": cls.created_at.isoformat() if cls.created_at else "",
        "updatedAt": cls.updated_at.isoformat() if cls.updated_at else "",
        "_count": {"students": student_count},
    }
    if include_students:
        students = students_q.all()
        result["students"] = [
            {
                "id": s.id,
                "name": s.name or s.nickname or "",
                "email": s.email,
                "studentId": s.student_id or "",
                "stars": s.stars or 0,
                "level": s.level or 1,
                "isMuted": s.is_muted or False,
                "avatar": s.avatar or "",
            }
            for s in students
        ]
    return result


@router.get("/teacher")
async def get_teacher_classes(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以查看班级列表")

    classes = db.query(Class).filter(Class.teacher_id == user.id).all()
    return [format_class(cls, db, include_students=True) for cls in classes]


@router.get("")
async def get_my_classes(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "teacher":
        classes = db.query(Class).filter(Class.teacher_id == user.id).all()
    else:
        if not user.class_id:
            return []
        classes = db.query(Class).filter(Class.id == user.class_id).all()
    return [format_class(cls, db) for cls in classes]


@router.get("/{class_id}")
async def get_class(
    class_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="班级不存在")
    return format_class(cls, db)


@router.post("")
async def create_class(
    request: CreateClassRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以创建班级")

    class_code = generate_class_code()
    while db.query(Class).filter(Class.class_code == class_code).first():
        class_code = generate_class_code()

    cls = Class(
        id=str(uuid.uuid4()),
        name=request.name,
        class_code=class_code,
        teacher_id=user.id,
        created_at=datetime.utcnow(),
    )

    db.add(cls)
    db.commit()
    db.refresh(cls)

    return format_class(cls, db)


@router.post("/join")
async def join_class(
    request: JoinClassRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="只有学生可以加入班级")

    code = request.classCode or request.class_code or ""
    cls = db.query(Class).filter(Class.class_code == code.upper()).first()
    if not cls:
        raise HTTPException(status_code=404, detail="班级不存在")

    user.class_id = cls.id
    db.commit()

    return {"message": "加入班级成功", "className": cls.name}


@router.delete("/{class_id}/students/{student_id}")
async def remove_student(
    class_id: str,
    student_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以移除学生")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="班级不存在")

    if cls.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="无权操作该班级")

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学生不存在")

    student.class_id = None
    db.commit()

    return {"message": "学生已移除"}
