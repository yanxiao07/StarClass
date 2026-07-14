from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class Pet(Base):
    """宠物种类定义表"""
    __tablename__ = "pets"

    id = Column(String(50), primary_key=True)  # 如 "pet_fox"
    name = Column(String(50), nullable=False)  # 如 "星灵狐"
    species = Column(String(50), nullable=False)  # 如 "fox"
    description = Column(String(200))
    price = Column(Integer, default=100)
    model_type = Column(String(50))  # 3D模型标识，如 "fox","cat","dragon","bird"
    color_primary = Column(String(20))  # 主色
    color_secondary = Column(String(20))  # 副色


class UserPet(Base):
    """用户拥有的宠物实例表"""
    __tablename__ = "user_pets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    pet_type_id = Column(String(50), ForeignKey("pets.id"), nullable=False)
    name = Column(String(50))  # 用户给宠物起的名字
    level = Column(Integer, default=1)  # 1-8级
    exp = Column(Integer, default=0)  # 当前经验值
    hunger = Column(Integer, default=80)  # 饱腹度 0-100，越低越饿
    mood = Column(Integer, default=80)  # 心情值 0-100
    is_active = Column(Boolean, default=False)  # 是否为当前展示宠物
    hatched = Column(Boolean, default=True)  # 是否已孵化
    last_fed_at = Column(DateTime, default=datetime.utcnow)
    last_interaction_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    pet_type = relationship("Pet")


class Purchase(Base):
    """购买记录表"""
    __tablename__ = "purchases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    item_id = Column(String(100), nullable=False)  # 商品id
    item_type = Column(String(50))  # theme/bubble/avatar/pet/blindbox
    item_name = Column(String(100))
    price = Column(Integer)
    purchased_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
