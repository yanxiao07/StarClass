"""LLM 配置模型 - 教师可配置不同 LLM 提供商"""
from sqlalchemy import Column, String, Boolean, DateTime, Text
from datetime import datetime
import uuid

from app.core.database import Base


class LLMConfig(Base):
    __tablename__ = "llm_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String, nullable=False, index=True)  # 教师用户ID
    class_id = Column(String, nullable=True, index=True)     # 班级ID（null=全局默认配置）
    provider = Column(String, nullable=False, default="deepseek")  # openai/deepseek/qwen/ollama/custom
    model_name = Column(String, nullable=False, default="deepseek-chat")
    api_key = Column(Text, nullable=True)     # 加密存储的 API Key
    base_url = Column(String, nullable=True)  # 自定义 API 地址（中转站）
    temperature = Column(String, nullable=True, default="0.7")
    max_tokens = Column(String, nullable=True, default="2000")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
