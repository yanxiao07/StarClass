from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.homework import Homework
from app.schemas.homework import HomeworkCreate, HomeworkResponse

router = APIRouter()

@router.get("", response_model=list[HomeworkResponse])
async def get_homeworks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "teacher":
        homeworks = db.query(Homework).filter(Homework.teacher_id == user.id).all()
    else:
        if not user.class_id:
            return []
        homeworks = db.query(Homework).filter(Homework.class_id == user.class_id).all()
    
    return [HomeworkResponse(
        id=hw.id,
        title=hw.title,
        description=hw.description,
        due_date=hw.due_date,
        subject=hw.subject,
        class_id=hw.class_id,
        teacher_id=hw.teacher_id,
        created_at=hw.created_at,
    ) for hw in homeworks]

@router.get("/{hw_id}", response_model=HomeworkResponse)
async def get_homework(
    hw_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    homework = db.query(Homework).filter(Homework.id == hw_id).first()
    if not homework:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    if user.role == "student" and homework.class_id != user.class_id:
        raise HTTPException(status_code=403, detail="无权访问该作业")
    
    return HomeworkResponse(
        id=homework.id,
        title=homework.title,
        description=homework.description,
        due_date=homework.due_date,
        subject=homework.subject,
        class_id=homework.class_id,
        teacher_id=homework.teacher_id,
        created_at=homework.created_at,
    )

@router.post("", response_model=HomeworkResponse)
async def create_homework(
    request: HomeworkCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以创建作业")
    
    homework = Homework(
        id=str(uuid.uuid4()),
        title=request.title,
        description=request.description,
        due_date=request.due_date,
        subject=request.subject,
        class_id=request.class_id,
        teacher_id=user.id,
        created_at=datetime.utcnow(),
    )
    
    db.add(homework)
    db.commit()
    db.refresh(homework)
    
    return HomeworkResponse(
        id=homework.id,
        title=homework.title,
        description=homework.description,
        due_date=homework.due_date,
        subject=homework.subject,
        class_id=homework.class_id,
        teacher_id=homework.teacher_id,
        created_at=homework.created_at,
    )

@router.delete("/{hw_id}")
async def delete_homework(
    hw_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    homework = db.query(Homework).filter(Homework.id == hw_id).first()
    if not homework:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    if homework.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="无权删除该作业")
    
    db.delete(homework)
    db.commit()
    
    return {"message": "作业删除成功"}