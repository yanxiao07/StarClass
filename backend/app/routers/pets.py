from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.pet import Pet, UserPet, Purchase

router = APIRouter()

# 经验阈值表：当前等级升级所需经验
EXP_THRESHOLDS = {
    1: 40,    # Lv1→2
    2: 80,    # Lv2→3
    3: 140,   # Lv3→4
    4: 220,   # Lv4→5
    5: 320,   # Lv5→6
    6: 440,   # Lv6→7
    7: 580,   # Lv7→8
}
MAX_LEVEL = 8


class FeedRequest(BaseModel):
    # 前端发送 camelCase 的 foodType，用 alias 兼容
    food_type: str = Field(..., alias="foodType")

    model_config = ConfigDict(populate_by_name=True)


class RenameRequest(BaseModel):
    name: str


class HomeworkRewardRequest(BaseModel):
    exp: int = 10


def compute_decay(pet: UserPet):
    """计算饱腹度和心情的衰减值（基于 last_fed_at 和 last_interaction_at）。
    每过 6 小时 hunger-5，mood-3，最低 0。返回衰减后的当前值（不修改原对象）。"""
    now = datetime.utcnow()
    hunger_decay = 0
    mood_decay = 0
    if pet.last_fed_at:
        hours_fed = (now - pet.last_fed_at).total_seconds() / 3600
        hunger_decay = int(hours_fed // 6) * 5
    if pet.last_interaction_at:
        hours_inter = (now - pet.last_interaction_at).total_seconds() / 3600
        mood_decay = int(hours_inter // 6) * 3
    current_hunger = max(0, (pet.hunger or 80) - hunger_decay)
    current_mood = max(0, (pet.mood or 80) - mood_decay)
    return current_hunger, current_mood


def check_level_up(pet: UserPet):
    """检查并处理升级，exp 达到阈值自动升级。满级为 8 级。"""
    while pet.level < MAX_LEVEL and (pet.exp or 0) >= EXP_THRESHOLDS.get(pet.level, float("inf")):
        pet.exp = (pet.exp or 0) - EXP_THRESHOLDS[pet.level]
        pet.level += 1
    if pet.level >= MAX_LEVEL:
        pet.level = MAX_LEVEL


def format_pet(pet: UserPet, pet_type: Optional[Pet] = None) -> dict:
    """格式化宠物信息（含 pet_type 详情和衰减后状态）"""
    current_hunger, current_mood = compute_decay(pet)
    return {
        "id": pet.id,
        "userId": pet.user_id,
        "petTypeId": pet.pet_type_id,
        "name": pet.name or (pet_type.name if pet_type else ""),
        "level": pet.level or 1,
        "exp": pet.exp or 0,
        "hunger": current_hunger,
        "mood": current_mood,
        "isActive": pet.is_active,
        "hatched": pet.hatched,
        "lastFedAt": pet.last_fed_at.isoformat() if pet.last_fed_at else "",
        "lastInteractionAt": pet.last_interaction_at.isoformat() if pet.last_interaction_at else "",
        "createdAt": pet.created_at.isoformat() if pet.created_at else "",
        "petType": {
            "id": pet_type.id,
            "name": pet_type.name,
            "species": pet_type.species,
            "description": pet_type.description,
            "modelType": pet_type.model_type,
            "colorPrimary": pet_type.color_primary,
            "colorSecondary": pet_type.color_secondary,
        } if pet_type else None,
    }


def get_user_pet(db: Session, user: User, user_pet_id: str) -> UserPet:
    pet = db.query(UserPet).filter(UserPet.id == user_pet_id, UserPet.user_id == user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="宠物不存在")
    return pet


@router.get("/my")
async def get_my_pets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的所有宠物（含 pet_type 详情）"""
    pets = db.query(UserPet).filter(UserPet.user_id == user.id).all()
    result = []
    for p in pets:
        pet_type = db.query(Pet).filter(Pet.id == p.pet_type_id).first()
        result.append(format_pet(p, pet_type))
    return result


@router.get("/active")
async def get_active_pet(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前展示的宠物"""
    pet = (
        db.query(UserPet)
        .filter(UserPet.user_id == user.id, UserPet.is_active == True)
        .first()
    )
    if not pet:
        return None
    pet_type = db.query(Pet).filter(Pet.id == pet.pet_type_id).first()
    return format_pet(pet, pet_type)


@router.post("/{user_pet_id}/activate")
async def activate_pet(
    user_pet_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """设为展示宠物（其他设为非 active）"""
    pet = get_user_pet(db, user, user_pet_id)
    # 将该用户所有宠物设为非展示
    db.query(UserPet).filter(UserPet.user_id == user.id).update({UserPet.is_active: False})
    pet.is_active = True
    db.commit()
    db.refresh(pet)
    pet_type = db.query(Pet).filter(Pet.id == pet.pet_type_id).first()
    return format_pet(pet, pet_type)


@router.post("/{user_pet_id}/feed")
async def feed_pet(
    user_pet_id: str,
    request: FeedRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """喂养宠物：basic +10饱腹度+5经验，premium +30饱腹度+15经验，饱腹度上限100"""
    food_type = request.food_type
    if food_type not in ("basic", "premium"):
        raise HTTPException(status_code=400, detail="食物类型无效")

    # 检查用户是否拥有对应食物（查 Purchase 表）
    food_item_id = f"pet_food_{food_type}"
    has_food = (
        db.query(Purchase)
        .filter(Purchase.user_id == user.id, Purchase.item_id == food_item_id)
        .first()
    )
    if not has_food:
        raise HTTPException(status_code=400, detail="请先在商城购买宠物食物")

    pet = get_user_pet(db, user, user_pet_id)

    # 喂养数值
    if food_type == "basic":
        hunger_add, exp_add = 10, 5
    else:
        hunger_add, exp_add = 30, 15

    # 先应用衰减，再加上喂养值
    current_hunger, current_mood = compute_decay(pet)
    pet.hunger = min(100, current_hunger + hunger_add)
    pet.mood = current_mood
    pet.exp = (pet.exp or 0) + exp_add
    pet.last_fed_at = datetime.utcnow()

    # 升级检查
    old_level = pet.level
    check_level_up(pet)
    leveled_up = pet.level > old_level

    db.commit()
    db.refresh(pet)
    pet_type = db.query(Pet).filter(Pet.id == pet.pet_type_id).first()
    return {
        "message": "喂养成功",
        "pet": format_pet(pet, pet_type),
        "leveledUp": leveled_up,
    }


@router.post("/{user_pet_id}/interact")
async def interact_pet(
    user_pet_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """互动（抚摸）：mood+10上限100，exp+2，更新 last_interaction_at"""
    pet = get_user_pet(db, user, user_pet_id)

    # 先应用衰减，再加上互动值
    current_hunger, current_mood = compute_decay(pet)
    pet.hunger = current_hunger
    pet.mood = min(100, current_mood + 10)
    pet.exp = (pet.exp or 0) + 2
    pet.last_interaction_at = datetime.utcnow()

    # 升级检查
    old_level = pet.level
    check_level_up(pet)
    leveled_up = pet.level > old_level

    db.commit()
    db.refresh(pet)
    pet_type = db.query(Pet).filter(Pet.id == pet.pet_type_id).first()
    return {
        "message": "互动成功",
        "pet": format_pet(pet, pet_type),
        "leveledUp": leveled_up,
    }


@router.post("/{user_pet_id}/rename")
async def rename_pet(
    user_pet_id: str,
    request: RenameRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """修改宠物名字"""
    pet = get_user_pet(db, user, user_pet_id)
    pet.name = request.name
    db.commit()
    db.refresh(pet)
    pet_type = db.query(Pet).filter(Pet.id == pet.pet_type_id).first()
    return format_pet(pet, pet_type)


@router.get("/{user_pet_id}/status")
async def get_pet_status(
    user_pet_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取单个宠物状态，计算状态衰减（每过6小时 hunger-5，mood-3，最低0）"""
    pet = get_user_pet(db, user, user_pet_id)
    pet_type = db.query(Pet).filter(Pet.id == pet.pet_type_id).first()
    return format_pet(pet, pet_type)


@router.post("/reward/homework")
async def homework_reward(
    request: HomeworkRewardRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """内部接口：作业提交后调用。给当前 active 宠物加 exp + 饱腹度+5，触发升级检查"""
    active_pet = (
        db.query(UserPet)
        .filter(UserPet.user_id == user.id, UserPet.is_active == True)
        .first()
    )
    if not active_pet:
        return {"message": "暂无展示宠物", "pet": None}

    # 先应用衰减，再加上奖励值
    current_hunger, current_mood = compute_decay(active_pet)
    active_pet.hunger = min(100, current_hunger + 5)
    active_pet.mood = current_mood
    active_pet.exp = (active_pet.exp or 0) + request.exp

    # 升级检查
    old_level = active_pet.level
    check_level_up(active_pet)
    leveled_up = active_pet.level > old_level

    db.commit()
    db.refresh(active_pet)
    pet_type = db.query(Pet).filter(Pet.id == active_pet.pet_type_id).first()
    return {
        "message": "作业奖励已发放",
        "pet": format_pet(active_pet, pet_type),
        "leveledUp": leveled_up,
    }
