from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
import random
import string
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import Class

router = APIRouter()

def generate_class_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

@router.get("/teacher")
async def get_teacher_classes(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以查看班级列表")
    
    classes = db.query(Class).filter(Class.teacher_id == user.id).all()
    
    result = []
    for cls in classes:
        student_count = db.query(User).filter(User.class_id == cls.id).count()
        result.append({
            "id": cls.id,
            "name": cls.name,
            "class_code": cls.class_code,
            "student_count": student_count,
        })
    
    return result

@router.post("")
async def create_class(
    name: str,
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
        name=name,
        class_code=class_code,
        teacher_id=user.id,
        created_at=datetime.utcnow(),
    )
    
    db.add(cls)
    db.commit()
    db.refresh(cls)
    
    return {
        "id": cls.id,
        "name": cls.name,
        "class_code": cls.class_code,
    }

@router.post("/join")
async def join_class(
    class_code: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="只有学生可以加入班级")
    
    cls = db.query(Class).filter(Class.class_code == class_code.upper()).first()
    if not cls:
        raise HTTPException(status_code=404, detail="班级不存在")
    
    user.class_id = cls.id
    db.commit()
    
    return {"message": "加入班级成功", "class_name": cls.name}