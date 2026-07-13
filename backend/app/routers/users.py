from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/me")
async def get_current_user_info(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "nickname": user.nickname,
        "role": user.role,
        "class_id": user.class_id,
        "stars": user.stars,
        "level": user.level,
        "created_at": user.created_at.isoformat(),
    }

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
    
    return {
        "id": user.id,
        "name": user.name,
        "nickname": user.nickname,
        "role": user.role,
        "class_id": user.class_id,
        "stars": user.stars,
        "level": user.level,
    }

@router.put("/me")
async def update_user(
    name: str = None,
    nickname: str = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if name:
        user.name = name
    if nickname:
        user.nickname = nickname
    
    db.commit()
    db.refresh(user)
    
    return {"message": "更新成功"}