from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

# 内存中的商店数据（无需数据库表）
STORE_ITEMS = [
    {"id": "theme_starry", "name": "星空主题", "description": "深蓝星空背景主题", "price": 50, "type": "theme", "icon": "🌟"},
    {"id": "theme_sakura", "name": "樱花主题", "description": "粉色樱花背景主题", "price": 80, "type": "theme", "icon": "🌸"},
    {"id": "theme_dark", "name": "暗夜主题", "description": "纯黑暗夜模式", "price": 100, "type": "theme", "icon": "🌙"},
    {"id": "bubble_rainbow", "name": "彩虹气泡", "description": "彩虹渐变聊天气泡", "price": 30, "type": "bubble", "icon": "🌈"},
    {"id": "bubble_ocean", "name": "海洋气泡", "description": "海洋蓝渐变气泡", "price": 30, "type": "bubble", "icon": "🌊"},
    {"id": "bubble_gold", "name": "金色气泡", "description": "金色渐变气泡", "price": 50, "type": "bubble", "icon": "✨"},
    {"id": "avatar_cat", "name": "猫咪头像", "description": "可爱猫咪头像框", "price": 40, "type": "avatar", "icon": "🐱"},
    {"id": "avatar_robot", "name": "机器人头像", "description": "科技感机器人头像框", "price": 60, "type": "avatar", "icon": "🤖"},
]

# 内存中的购买记录
purchases = {}

@router.get("/items")
async def get_store_items(user: User = Depends(get_current_user)):
    user_purchases = purchases.get(user.id, set())
    return [
        {
            **item,
            "purchased": item["id"] in user_purchases,
        }
        for item in STORE_ITEMS
    ]

@router.post("/items/{item_id}/purchase")
async def purchase_item(
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = next((i for i in STORE_ITEMS if i["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")

    if user.id not in purchases:
        purchases[user.id] = set()

    if item_id in purchases[user.id]:
        raise HTTPException(status_code=400, detail="已购买过该商品")

    if (user.stars or 0) < item["price"]:
        raise HTTPException(status_code=400, detail="星星不足")

    user.stars = (user.stars or 0) - item["price"]
    purchases[user.id].add(item_id)
    db.commit()

    return {
        "message": "购买成功",
        "item": item,
        "remainingStars": user.stars,
    }

@router.get("/purchases")
async def get_my_purchases(user: User = Depends(get_current_user)):
    user_purchases = purchases.get(user.id, set())
    return [
        {**item, "purchased": True}
        for item in STORE_ITEMS
        if item["id"] in user_purchases
    ]

@router.post("/items/{item_id}/use")
async def use_item(
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.id not in purchases or item_id not in purchases[user.id]:
        raise HTTPException(status_code=400, detail="未购买该商品")

    item = next((i for i in STORE_ITEMS if i["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")

    if item["type"] == "theme":
        user.theme = item["id"].replace("theme_", "")
    elif item["type"] == "bubble":
        user.chat_bubble_style = item["id"].replace("bubble_", "") if hasattr(user, "chat_bubble_style") else None

    db.commit()

    return {
        "message": "使用成功",
        "type": item["type"],
        "value": item["id"].replace("theme_", "").replace("bubble_", ""),
    }
