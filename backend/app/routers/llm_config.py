"""LLM 配置管理路由 - 教师配置 LLM 提供商、API Key、模型"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.llm_config import LLMConfig

router = APIRouter()


# ========== 请求模型 ==========

class SaveConfigRequest(BaseModel):
    provider: str                    # openai/deepseek/qwen/ollama/custom
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: Optional[str] = "0.7"
    max_tokens: Optional[str] = "2000"
    class_id: Optional[str] = None   # null=全局配置, 有值=班级专属配置


class TestConnectionRequest(BaseModel):
    provider: str
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


# ========== 提供商模板 ==========

PROVIDER_TEMPLATES = [
    {
        "provider": "deepseek",
        "label": "DeepSeek 深度求索",
        "default_model": "deepseek-chat",
        "default_base_url": "https://api.deepseek.com/v1",
        "needs_api_key": True,
        "models": ["deepseek-chat", "deepseek-reasoner"],
        "description": "国内可用，性价比高，推荐使用",
        "api_key_url": "https://platform.deepseek.com/",
    },
    {
        "provider": "qwen",
        "label": "通义千问（阿里云）",
        "default_model": "qwen-plus",
        "default_base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "needs_api_key": True,
        "models": ["qwen-plus", "qwen-max", "qwen-turbo"],
        "description": "阿里云大模型，兼容 OpenAI 格式",
        "api_key_url": "https://dashscope.console.aliyun.com/",
    },
    {
        "provider": "openai",
        "label": "OpenAI",
        "default_model": "gpt-4o-mini",
        "default_base_url": "https://api.openai.com/v1",
        "needs_api_key": True,
        "models": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
        "description": "OpenAI 官方 API",
        "api_key_url": "https://platform.openai.com/api-keys",
    },
    {
        "provider": "ollama",
        "label": "Ollama 本地部署",
        "default_model": "llama3",
        "default_base_url": "http://localhost:11434/v1",
        "needs_api_key": False,
        "models": ["llama3", "qwen2", "phi3", "mistral"],
        "description": "本地部署，无需 API Key，隐私安全",
        "api_key_url": None,
    },
    {
        "provider": "custom",
        "label": "自定义中转站",
        "default_model": "",
        "default_base_url": "",
        "needs_api_key": True,
        "models": [],
        "description": "支持任何兼容 OpenAI 格式的中转站 API",
        "api_key_url": None,
    },
]


# ========== API 端点 ==========

@router.get("/providers")
async def get_providers(
    user: User = Depends(get_current_user),
):
    """获取可用的 LLM 提供商模板列表"""
    return PROVIDER_TEMPLATES


@router.get("/config")
async def get_config(
    class_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取教师当前 LLM 配置（优先班级专属 > 全局默认）"""
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以配置 LLM")

    # 先查班级专属配置
    if class_id:
        config = db.query(LLMConfig).filter(
            LLMConfig.teacher_id == user.id,
            LLMConfig.class_id == class_id,
            LLMConfig.is_active == True,
        ).first()
        if config:
            return _format_config(config)

    # 再查全局配置
    config = db.query(LLMConfig).filter(
        LLMConfig.teacher_id == user.id,
        LLMConfig.class_id == None,
        LLMConfig.is_active == True,
    ).first()

    if config:
        return _format_config(config)

    # 没有配置，返回空（前端显示"未配置，使用规则引擎"）
    return {
        "configured": False,
        "provider": None,
        "model_name": None,
        "base_url": None,
        "has_api_key": False,
        "class_id": class_id,
        "message": "未配置 LLM，当前使用规则引擎。配置后可获得更强 AI 能力。",
    }


@router.put("/config")
async def save_config(
    request: SaveConfigRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """保存教师 LLM 配置"""
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以配置 LLM")

    # 查找是否已有配置
    existing = db.query(LLMConfig).filter(
        LLMConfig.teacher_id == user.id,
        LLMConfig.class_id == request.class_id,
    ).first()

    if existing:
        # 更新已有配置
        existing.provider = request.provider
        existing.model_name = request.model_name
        if request.api_key:
            existing.api_key = request.api_key  # 有新Key才更新，不传则保留旧Key
        existing.base_url = request.base_url
        existing.temperature = request.temperature or "0.7"
        existing.max_tokens = request.max_tokens or "2000"
        existing.is_active = True
        existing.updated_at = datetime.utcnow()
        config = existing
    else:
        # 创建新配置
        config = LLMConfig(
            id=str(uuid.uuid4()),
            teacher_id=user.id,
            class_id=request.class_id,
            provider=request.provider,
            model_name=request.model_name,
            api_key=request.api_key,
            base_url=request.base_url,
            temperature=request.temperature or "0.7",
            max_tokens=request.max_tokens or "2000",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(config)

    db.commit()
    db.refresh(config)

    return {
        "message": "配置保存成功",
        "configured": True,
        "provider": config.provider,
        "model_name": config.model_name,
        "has_api_key": bool(config.api_key),
    }


@router.post("/test")
async def test_connection(
    request: TestConnectionRequest,
    user: User = Depends(get_current_user),
):
    """测试 LLM 连通性"""
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以测试 LLM")

    provider = request.provider
    model = request.model_name
    api_key = request.api_key or ""
    base_url = request.base_url or ""

    # 获取提供商默认 base_url
    for p in PROVIDER_TEMPLATES:
        if p["provider"] == provider:
            if not base_url:
                base_url = p["default_base_url"]
            break

    # Ollama 不需要 API Key
    if provider != "ollama" and not api_key:
        return {
            "success": False,
            "message": "API Key 不能为空（Ollama 除外）",
        }

    # 使用 openai SDK 测试
    try:
        from openai import OpenAI

        client_kwargs = {"api_key": api_key if api_key else "ollama"}
        if base_url:
            client_kwargs["base_url"] = base_url

        client = OpenAI(**client_kwargs)
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "你好，请回复'连接成功'"}],
            max_tokens=20,
            temperature=0,
        )

        reply = response.choices[0].message.content
        return {
            "success": True,
            "message": f"连接成功！模型回复：{reply}",
            "provider": provider,
            "model": model,
        }
    except Exception as e:
        error_msg = str(e)
        # 简化错误信息
        if "api_key" in error_msg.lower():
            error_msg = "API Key 无效或格式错误"
        elif "connection" in error_msg.lower() or "timeout" in error_msg.lower():
            error_msg = f"连接失败，请检查 Base URL 是否正确：{base_url}"
        elif "model" in error_msg.lower() and "not found" in error_msg.lower():
            error_msg = f"模型 {model} 不存在，请检查模型名称"

        return {
            "success": False,
            "message": f"连接失败：{error_msg}",
        }


@router.delete("/config")
async def delete_config(
    class_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除 LLM 配置（恢复使用规则引擎）"""
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以删除 LLM 配置")

    config = db.query(LLMConfig).filter(
        LLMConfig.teacher_id == user.id,
        LLMConfig.class_id == class_id,
    ).first()

    if config:
        db.delete(config)
        db.commit()
        return {"message": "配置已删除，将使用规则引擎"}

    return {"message": "没有找到配置"}


@router.get("/status")
async def get_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前 LLM 状态（教师和学生均可查看）"""
    # 如果是教师，查看自己的配置
    if user.role == "teacher":
        config = db.query(LLMConfig).filter(
            LLMConfig.teacher_id == user.id,
            LLMConfig.class_id == None,
            LLMConfig.is_active == True,
        ).first()

        if config:
            return {
                "available": True,
                "provider": config.provider,
                "model": config.model_name,
                "source": "database",
            }

    # 如果是学生，查看教师的全局配置
    if user.role == "student" and user.class_id:
        # 找到班级教师
        from app.models.class_ import Class
        cls = db.query(Class).filter(Class.id == user.class_id).first()
        if cls:
            # 先找班级专属配置
            config = db.query(LLMConfig).filter(
                LLMConfig.teacher_id == cls.teacher_id,
                LLMConfig.class_id == user.class_id,
                LLMConfig.is_active == True,
            ).first()
            if not config:
                # 找全局配置
                config = db.query(LLMConfig).filter(
                    LLMConfig.teacher_id == cls.teacher_id,
                    LLMConfig.class_id == None,
                    LLMConfig.is_active == True,
                ).first()

            if config:
                return {
                    "available": True,
                    "provider": config.provider,
                    "model": config.model_name,
                    "source": "database",
                }

    # 检查 .env 配置
    from app.agents.llm_factory import is_llm_available, LLMFactory
    if is_llm_available():
        chain = LLMFactory.get_provider_chain()
        return {
            "available": True,
            "provider": chain[0].provider,
            "model": chain[0].model,
            "source": "env",
        }

    return {
        "available": False,
        "provider": None,
        "model": None,
        "source": "rule_engine",
    }


# ========== 辅助函数 ==========

def _format_config(config: LLMConfig) -> dict:
    return {
        "configured": True,
        "id": config.id,
        "provider": config.provider,
        "model_name": config.model_name,
        "base_url": config.base_url,
        "has_api_key": bool(config.api_key),
        "temperature": float(config.temperature) if config.temperature else 0.7,
        "max_tokens": int(config.max_tokens) if config.max_tokens else 2000,
        "class_id": config.class_id,
        "updated_at": config.updated_at.isoformat() if config.updated_at else None,
    }


def get_teacher_llm_config(teacher_id: str, class_id: Optional[str], db: Session) -> Optional[LLMConfig]:
    """获取教师 LLM 配置（供 orchestrator 调用）"""
    # 优先班级专属配置
    if class_id:
        config = db.query(LLMConfig).filter(
            LLMConfig.teacher_id == teacher_id,
            LLMConfig.class_id == class_id,
            LLMConfig.is_active == True,
        ).first()
        if config:
            return config

    # 全局配置
    config = db.query(LLMConfig).filter(
        LLMConfig.teacher_id == teacher_id,
        LLMConfig.class_id == None,
        LLMConfig.is_active == True,
    ).first()

    return config
