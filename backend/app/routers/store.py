from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import random
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.pet import Pet, UserPet, Purchase

router = APIRouter()

# 商店商品列表（持久化到数据库 Purchase 表）
STORE_ITEMS = [
    # 主题
    {"id": "theme_default", "name": "经典主题", "description": "默认浅色主题，清爽简洁", "price": 0, "type": "theme", "icon": "☀️"},
    {"id": "theme_starry", "name": "星空主题", "description": "深蓝星空背景主题，含闪烁星星", "price": 50, "type": "theme", "icon": "🌟"},
    {"id": "theme_sakura", "name": "樱花主题", "description": "粉色樱花背景主题", "price": 80, "type": "theme", "icon": "🌸"},
    {"id": "theme_dark", "name": "暗夜主题", "description": "纯黑暗夜模式", "price": 100, "type": "theme", "icon": "🌙"},
    # 气泡
    {"id": "bubble_rainbow", "name": "彩虹气泡", "description": "彩虹渐变聊天气泡", "price": 30, "type": "bubble", "icon": "🌈"},
    {"id": "bubble_ocean", "name": "海洋气泡", "description": "海洋蓝渐变气泡", "price": 30, "type": "bubble", "icon": "🌊"},
    {"id": "bubble_gold", "name": "金色气泡", "description": "金色渐变气泡", "price": 50, "type": "bubble", "icon": "✨"},
    # 头像
    {"id": "avatar_cat", "name": "猫咪头像", "description": "可爱猫咪头像框", "price": 40, "type": "avatar", "icon": "🐱"},
    {"id": "avatar_robot", "name": "机器人头像", "description": "科技感机器人头像框", "price": 60, "type": "avatar", "icon": "🤖"},
    # 宠物
    {"id": "pet_fox", "name": "星灵狐", "description": "灵动的星灵狐", "price": 150, "type": "pet", "icon": "🦊",
     "species": "fox", "model_type": "fox", "color_primary": "#FF9F1C", "color_secondary": "#FFBF69"},
    {"id": "pet_cat", "name": "星云猫", "description": "神秘的星云猫", "price": 150, "type": "pet", "icon": "🐱",
     "species": "cat", "model_type": "cat", "color_primary": "#9B5DE5", "color_secondary": "#F15BB5"},
    {"id": "pet_dragon", "name": "星辉龙", "description": "威严的星辉龙", "price": 200, "type": "pet", "icon": "🐉",
     "species": "dragon", "model_type": "dragon", "color_primary": "#00BBF9", "color_secondary": "#00F5D4"},
    {"id": "pet_bird", "name": "星辰鸟", "description": "自由的星辰鸟", "price": 150, "type": "pet", "icon": "🐦",
     "species": "bird", "model_type": "bird", "color_primary": "#FEE440", "color_secondary": "#F15BB5"},
    # 宠物食物
    {"id": "pet_food_basic", "name": "普通宠物粮", "description": "基础宠物食物，+10饱腹度+5经验", "price": 10, "type": "pet_food", "icon": "🍖"},
    {"id": "pet_food_premium", "name": "高级宠物粮", "description": "高级宠物食物，+30饱腹度+15经验", "price": 30, "type": "pet_food", "icon": "🍗"},
    # 盲盒
    {"id": "blindbox_lucky", "name": "幸运盲盒", "description": "随机奖励星星、经验或宠物", "price": 50, "type": "blindbox", "icon": "🎁"},
]

# 一次性购买的商品类型（不可重复购买）
ONE_TIME_TYPES = {"theme", "bubble", "avatar", "pet"}


def find_item(item_id: str):
    return next((i for i in STORE_ITEMS if i["id"] == item_id), None)


def get_or_create_pet_type(db: Session, item: dict) -> Pet:
    """根据商品信息获取或创建宠物种类记录"""
    pet_type = db.query(Pet).filter(Pet.id == item["id"]).first()
    if not pet_type:
        pet_type = Pet(
            id=item["id"],
            name=item["name"],
            species=item.get("species", ""),
            description=item.get("description", ""),
            price=item["price"],
            model_type=item.get("model_type", ""),
            color_primary=item.get("color_primary", ""),
            color_secondary=item.get("color_secondary", ""),
        )
        db.add(pet_type)
        db.flush()
    return pet_type


def create_user_pet(db: Session, user: User, item: dict) -> UserPet:
    """为用户创建一只宠物实例"""
    get_or_create_pet_type(db, item)
    new_pet = UserPet(
        id=str(uuid.uuid4()),
        user_id=user.id,
        pet_type_id=item["id"],
        name=item["name"],
        level=1,
        exp=0,
        hunger=80,
        mood=80,
        is_active=False,
        hatched=True,
        last_fed_at=datetime.utcnow(),
        last_interaction_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(new_pet)
    db.flush()
    return new_pet


@router.get("/items")
async def get_store_items(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """返回商品列表，purchased 字段从数据库查询"""
    # 查询当前用户所有已购买商品id
    purchased_ids = {
        p.item_id for p in db.query(Purchase).filter(Purchase.user_id == user.id).all()
    }
    return [
        {
            **item,
            "purchased": item["id"] in purchased_ids,
        }
        for item in STORE_ITEMS
    ]


@router.post("/items/{item_id}/purchase")
async def purchase_item(
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """购买商品：扣星星，写 Purchase 表；pet 类型同时创建 UserPet；blindbox 类型随机奖励"""
    item = find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")

    # 一次性商品检查是否已购买
    if item["type"] in ONE_TIME_TYPES:
        existing = (
            db.query(Purchase)
            .filter(Purchase.user_id == user.id, Purchase.item_id == item_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="已购买过该商品")

    # 检查星星是否充足
    if (user.stars or 0) < item["price"]:
        raise HTTPException(status_code=400, detail="星星不足")

    # 扣除星星
    user.stars = (user.stars or 0) - item["price"]

    reward = None

    if item["type"] == "blindbox":
        # 盲盒随机奖励：50%星星，30%经验，20%宠物
        roll = random.random()
        pet_items = [i for i in STORE_ITEMS if i["type"] == "pet"]
        if roll < 0.5:
            # 得 20-50 星星
            amount = random.randint(20, 50)
            user.stars = (user.stars or 0) + amount
            reward = {"type": "stars", "amount": amount}
        elif roll < 0.8:
            # 得 30 经验，加到当前展示宠物
            active_pet = (
                db.query(UserPet)
                .filter(UserPet.user_id == user.id, UserPet.is_active == True)
                .first()
            )
            if active_pet:
                active_pet.exp = (active_pet.exp or 0) + 30
                reward = {"type": "exp", "amount": 30, "petId": active_pet.id}
            else:
                # 没有展示宠物，折算为星星
                user.stars = (user.stars or 0) + 30
                reward = {"type": "stars", "amount": 30}
        else:
            # 得一个随机宠物
            chosen = random.choice(pet_items) if pet_items else None
            if chosen:
                new_pet = create_user_pet(db, user, chosen)
                reward = {"type": "pet", "petId": new_pet.id, "petTypeId": chosen["id"], "petName": chosen["name"]}
            else:
                user.stars = (user.stars or 0) + 30
                reward = {"type": "stars", "amount": 30}
    elif item["type"] == "pet":
        # 宠物类型：同时创建 UserPet 记录
        create_user_pet(db, user, item)

    # 写入购买记录
    purchase = Purchase(
        id=str(uuid.uuid4()),
        user_id=user.id,
        item_id=item_id,
        item_type=item["type"],
        item_name=item["name"],
        price=item["price"],
        purchased_at=datetime.utcnow(),
    )
    db.add(purchase)
    db.commit()

    return {
        "message": "购买成功",
        "item": item,
        "remainingStars": user.stars,
        "reward": reward,
    }


@router.get("/purchases")
async def get_my_purchases(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """从数据库查询购买记录"""
    records = (
        db.query(Purchase)
        .filter(Purchase.user_id == user.id)
        .order_by(Purchase.purchased_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "itemId": p.item_id,
            "itemType": p.item_type,
            "itemName": p.item_name,
            "price": p.price,
            "purchasedAt": p.purchased_at.isoformat() if p.purchased_at else "",
        }
        for p in records
    ]


@router.post("/items/{item_id}/use")
async def use_item(
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """使用商品：设置主题、气泡或头像"""
    item = find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")

    # 免费商品（如经典主题）无需购买即可使用
    if item.get("price", 0) > 0:
        purchased = (
            db.query(Purchase)
            .filter(Purchase.user_id == user.id, Purchase.item_id == item_id)
            .first()
        )
        if not purchased:
            raise HTTPException(status_code=400, detail="未购买该商品")

    value = ""
    if item["type"] == "theme":
        value = item["id"].replace("theme_", "")
        user.theme = value
    elif item["type"] == "bubble":
        value = item["id"].replace("bubble_", "")
        user.chat_bubble_style = value
    elif item["type"] == "avatar":
        value = item["id"]
        user.active_avatar = value
    else:
        raise HTTPException(status_code=400, detail="该商品类型不支持使用")

    db.commit()

    return {
        "message": "使用成功",
        "type": item["type"],
        "value": value,
    }
