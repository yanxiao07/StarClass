from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.class_ import Class
from app.models.submission import Submission
from app.models.homework import Homework

router = APIRouter()


class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = None
    name: Optional[str] = None
    avatar: Optional[str] = None
    stars: Optional[int] = None  # 游戏大厅扣除星星解锁游戏用


class RewardStarsRequest(BaseModel):
    studentId: str
    student_id: Optional[str] = None
    stars: int


def format_user(user: User, db: Session = None) -> dict:
    class_name = ""
    if db and user.class_id:
        cls = db.query(Class).filter(Class.id == user.class_id).first()
        if cls:
            class_name = cls.name

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "nickname": user.nickname or user.name,
        "role": user.role,
        "classId": user.class_id,
        "className": class_name,
        "studentId": user.student_id or "",
        "stars": user.stars or 0,
        "level": user.level or 1,
        "avatar": user.avatar or "",
        "theme": getattr(user, "theme", "default") or "default",
        "isMuted": getattr(user, "is_muted", False) or False,
        "createdAt": user.created_at.isoformat() if user.created_at else "",
    }


@router.get("/me")
async def get_current_user_info(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return format_user(user, db)


@router.put("/me")
async def update_user(
    request: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if request.name is not None:
        user.name = request.name
    if request.nickname is not None:
        user.nickname = request.nickname
    if request.avatar is not None:
        user.avatar = request.avatar
    if request.stars is not None:
        # 游戏解锁扣除星星，校验不为负
        user.stars = max(0, request.stars)

    db.commit()
    db.refresh(user)
    return format_user(user, db)


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await update_user(request, user, db)


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    if current_user.role != "teacher" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="无权访问该用户信息")

    return format_user(user, db)


@router.post("/reward-stars")
async def reward_stars(
    request: RewardStarsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以奖励星星")

    student_id = request.studentId or request.student_id
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学生不存在")

    student.stars = (student.stars or 0) + request.stars
    new_level = max(1, student.stars // 100 + 1)
    student.level = new_level

    db.commit()
    db.refresh(student)

    return {
        "message": "奖励成功",
        "stars": student.stars,
        "level": student.level,
    }


@router.get("/me/my-stats")
async def get_my_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "student":
        return {
            "id": user.id,
            "studentId": user.student_id or "",
            "homeworkCompletion": 0,
            "accuracy": 0,
            "participation": 0,
            "creativity": 0,
            "teamwork": 0,
            "improvement": 0,
            "level": user.level or 1,
        }

    submissions = db.query(Submission).filter(Submission.student_id == user.id).all()
    total = len(submissions)
    graded = [s for s in submissions if s.status == "graded" and s.grade is not None]

    avg_grade = sum(s.grade for s in graded) / len(graded) if graded else 0

    return {
        "id": user.id,
        "studentId": user.student_id or "",
        "homeworkCompletion": min(100, total * 10),
        "accuracy": int(avg_grade),
        "participation": min(100, total * 15),
        "creativity": int(avg_grade * 0.8),
        "teamwork": min(100, total * 12),
        "improvement": min(100, total * 8),
        "level": user.level or 1,
    }


@router.get("/me/stats")
async def get_my_stats_alt(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await get_my_stats(user, db)


@router.delete("/delete-account")
async def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(user)
    db.commit()
    return {"message": "账户已删除"}
