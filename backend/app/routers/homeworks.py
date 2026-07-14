from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.homework import Homework
from app.models.class_ import Class
from app.schemas.homework import HomeworkCreate, HomeworkUpdate, HomeworkResponse

router = APIRouter()


def format_homework(hw: Homework, db: Session = None) -> dict:
    """格式化作业数据为camelCase"""
    teacher_name = ""
    class_name = ""
    if db:
        teacher = db.query(User).filter(User.id == hw.teacher_id).first()
        if teacher:
            teacher_name = teacher.name or teacher.nickname or ""
        if hw.class_id:
            cls = db.query(Class).filter(Class.id == hw.class_id).first()
            if cls:
                class_name = cls.name

    return {
        "id": hw.id,
        "title": hw.title,
        "description": hw.description or "",
        "dueDate": hw.due_date.isoformat() if hw.due_date else "",
        "subject": hw.subject or "other",
        "className": class_name,
        "classId": hw.class_id or "",
        "teacherId": hw.teacher_id,
        "teacherName": teacher_name,
        "createdAt": hw.created_at.isoformat() if hw.created_at else "",
    }


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

    return [format_homework(hw, db) for hw in homeworks]


@router.get("/pending-count")
async def get_pending_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "student":
        from app.models.submission import Submission
        if not user.class_id:
            return {"pendingCount": 0}
        homeworks = db.query(Homework).filter(Homework.class_id == user.class_id).all()
        submitted_ids = set(
            s.homework_id for s in db.query(Submission).filter(Submission.student_id == user.id).all()
        )
        pending = sum(1 for hw in homeworks if hw.id not in submitted_ids)
        return {"pendingCount": pending}
    return {"pendingCount": 0}


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

    return format_homework(homework, db)


@router.post("", response_model=HomeworkResponse)
async def create_homework(
    request: HomeworkCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以创建作业")

    due_date_val = None
    if request.dueDate:
        due_date_val = datetime.fromisoformat(request.dueDate.replace("Z", ""))
    elif request.due_date:
        due_date_val = request.due_date
    else:
        due_date_val = datetime.utcnow()

    class_id_val = request.classId or request.class_id or None

    homework = Homework(
        id=str(uuid.uuid4()),
        title=request.title,
        description=request.description,
        due_date=due_date_val,
        subject=request.subject,
        class_id=class_id_val,
        teacher_id=user.id,
        created_at=datetime.utcnow(),
    )

    db.add(homework)
    db.commit()
    db.refresh(homework)

    return format_homework(homework, db)


@router.put("/{hw_id}", response_model=HomeworkResponse)
async def update_homework(
    hw_id: str,
    request: HomeworkUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    homework = db.query(Homework).filter(Homework.id == hw_id).first()
    if not homework:
        raise HTTPException(status_code=404, detail="作业不存在")

    if homework.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="无权修改该作业")

    if request.title is not None:
        homework.title = request.title
    if request.description is not None:
        homework.description = request.description
    if request.dueDate is not None:
        homework.due_date = datetime.fromisoformat(request.dueDate.replace("Z", ""))
    if request.subject is not None:
        homework.subject = request.subject
    if request.classId is not None:
        homework.class_id = request.classId if request.classId else None

    db.commit()
    db.refresh(homework)

    return format_homework(homework, db)


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
