"""
LLM 工厂 - 多模型提供商支持 + 故障转移

支持提供商（均兼容 OpenAI API 格式）：
  - openai:   GPT-4o, GPT-4o-mini 等
  - deepseek: DeepSeek-V3, DeepSeek-R1 等
  - qwen:     通义千问 qwen-plus, qwen-max 等
  - ollama:   本地部署 Llama3, Qwen 等

配置方式（backend/.env）：
  # 方式1：使用统一配置
  LLM_PROVIDER=deepseek
  LLM_API_KEY=sk-xxx
  LLM_MODEL=deepseek-chat
  LLM_BASE_URL=https://api.deepseek.com/v1

  # 方式2：使用提供商专属配置
  DEEPSEEK_API_KEY=sk-xxx
  DEEPSEEK_MODEL=deepseek-chat

  # 故障转移（逗号分隔）
  LLM_FALLBACK_PROVIDERS=qwen,ollama

参考：
  - AutoGen config_list 多模型故障转移
  - Dify 插件化模型提供商
  - Open Deep Research 任务专属模型
"""

from typing import Optional, List, Dict, Any, AsyncIterator
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class ProviderConfig:
    """单个模型提供商配置"""
    def __init__(self, provider: str, model: str, api_key: str, base_url: str):
        self.provider = provider
        self.model = model
        self.api_key = api_key
        self.base_url = base_url

    @property
    def is_available(self) -> bool:
        """是否有API Key（Ollama本地部署不需要Key）"""
        return bool(self.api_key) or self.provider == "ollama"


class LLMFactory:
    """LLM 工厂 - 管理多提供商配置和故障转移"""

    # 提供商默认配置
    PROVIDER_DEFAULTS = {
        "openai": {
            "base_url": "https://api.openai.com/v1",
            "model": "gpt-4o-mini",
        },
        "deepseek": {
            "base_url": "https://api.deepseek.com/v1",
            "model": "deepseek-chat",
        },
        "qwen": {
            "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "model": "qwen-plus",
        },
        "ollama": {
            "base_url": "http://localhost:11434/v1",
            "model": "llama3",
        },
    }

    @classmethod
    def _get_provider_config(cls, provider: str) -> ProviderConfig:
        """获取指定提供商的配置（从 settings 读取）"""
        provider = provider.lower().strip()
        defaults = cls.PROVIDER_DEFAULTS.get(provider, cls.PROVIDER_DEFAULTS["openai"])

        if provider == "openai":
            return ProviderConfig(
                provider="openai",
                model=settings.OPENAI_MODEL or defaults["model"],
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL or defaults["base_url"],
            )
        elif provider == "deepseek":
            return ProviderConfig(
                provider="deepseek",
                model=settings.DEEPSEEK_MODEL or defaults["model"],
                api_key=settings.DEEPSEEK_API_KEY,
                base_url=settings.DEEPSEEK_BASE_URL or defaults["base_url"],
            )
        elif provider == "qwen":
            return ProviderConfig(
                provider="qwen",
                model=settings.QWEN_MODEL or defaults["model"],
                api_key=settings.QWEN_API_KEY,
                base_url=settings.QWEN_BASE_URL or defaults["base_url"],
            )
        elif provider == "ollama":
            return ProviderConfig(
                provider="ollama",
                model=settings.OLLAMA_MODEL or defaults["model"],
                api_key="ollama",  # Ollama 不需要真实 Key，但 SDK 需要非空值
                base_url=settings.OLLAMA_BASE_URL or defaults["base_url"],
            )

        # 未知提供商，使用通用配置
        return ProviderConfig(
            provider=provider,
            model=settings.LLM_MODEL or defaults["model"],
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL or defaults["base_url"],
        )

    @classmethod
    def get_provider_chain(cls) -> List[ProviderConfig]:
        """获取提供商链（主提供商 + 故障转移提供商）"""
        chain = []

        # 1. 优先使用 LLM_PROVIDER 通用配置
        if settings.LLM_API_KEY or settings.LLM_PROVIDER == "ollama":
            chain.append(ProviderConfig(
                provider=settings.LLM_PROVIDER,
                model=settings.LLM_MODEL,
                api_key=settings.LLM_API_KEY,
                base_url=settings.LLM_BASE_URL or cls.PROVIDER_DEFAULTS.get(
                    settings.LLM_PROVIDER, {}
                ).get("base_url", ""),
            ))

        # 2. 专属提供商配置（如果通用配置没设置，从专属配置读取）
        if not chain or not chain[0].is_available:
            chain = []
            primary = cls._get_provider_config(settings.LLM_PROVIDER)
            if primary.is_available:
                chain.append(primary)

        # 3. 添加故障转移提供商
        if settings.LLM_FALLBACK_PROVIDERS:
            for p in settings.LLM_FALLBACK_PROVIDERS.split(","):
                p = p.strip().lower()
                if p and p != settings.LLM_PROVIDER:
                    cfg = cls._get_provider_config(p)
                    if cfg.is_available and cfg not in chain:
                        chain.append(cfg)

        # 4. 兜底：尝试所有配置了 Key 的提供商
        if not chain:
            for p in ["openai", "deepseek", "qwen", "ollama"]:
                cfg = cls._get_provider_config(p)
                if cfg.is_available:
                    chain.append(cfg)

        return chain

    @classmethod
    def create_llm(cls, preferred_provider: Optional[str] = None) -> Optional[Any]:
        """
        创建 LLM 实例（非流式）
        如果没有可用的提供商，返回 None

        Args:
            preferred_provider: 指定优先使用的提供商（用于每Agent独立模型）
        """
        chain = cls.get_provider_chain()

        # 如果指定了优先提供商，调整顺序
        if preferred_provider:
            preferred = cls._get_provider_config(preferred_provider)
            if preferred.is_available:
                chain = [preferred] + [c for c in chain if c.provider != preferred_provider]

        for cfg in chain:
            try:
                return _OpenAICompatibleLLM(cfg)
            except Exception as e:
                logger.warning(f"创建 {cfg.provider} LLM 失败: {e}")
                continue

        logger.warning("没有可用的 LLM 提供商，将使用规则匹配回退")
        return None

    @classmethod
    def get_available_providers(cls) -> List[Dict[str, str]]:
        """获取所有已配置的可用提供商列表（前端展示用）"""
        chain = cls.get_provider_chain()
        return [
            {
                "provider": cfg.provider,
                "model": cfg.model,
                "base_url": cfg.base_url,
            }
            for cfg in chain
        ]

    @classmethod
    def create_llm_from_db_config(cls, db_config) -> Optional[Any]:
        """
        从数据库配置创建 LLM 实例（教师 UI 配置优先）

        Args:
            db_config: LLMConfig ORM 对象（来自 app.models.llm_config）

        Returns:
            _OpenAICompatibleLLM 实例 或 None
        """
        if not db_config or not db_config.is_active:
            return None

        # 构造 ProviderConfig
        provider = db_config.provider or "custom"
        model = db_config.model_name or "gpt-4o-mini"
        api_key = db_config.api_key or ("ollama" if provider == "ollama" else "")
        base_url = db_config.base_url or cls.PROVIDER_DEFAULTS.get(
            provider, {}
        ).get("base_url", "")

        # Ollama 默认占位 Key
        if provider == "ollama" and not api_key:
            api_key = "ollama"

        cfg = ProviderConfig(
            provider=provider,
            model=model,
            api_key=api_key,
            base_url=base_url,
        )

        if not cfg.is_available:
            logger.warning(f"数据库 LLM 配置不可用: provider={provider}, model={model}")
            return None

        try:
            return _OpenAICompatibleLLM(cfg)
        except Exception as e:
            logger.warning(f"从数据库配置创建 LLM 失败: {e}")
            return None


class _OpenAICompatibleLLM:
    """
    OpenAI 兼容 LLM 封装
    统一接口调用 OpenAI/DeepSeek/Qwen/Ollama（均兼容 OpenAI API 格式）
    """

    def __init__(self, config: ProviderConfig):
        self.config = config
        self._client = None
        self._init_client()

    def _init_client(self):
        """延迟初始化 OpenAI 客户端"""
        try:
            from openai import OpenAI
            self._client = OpenAI(
                api_key=self.config.api_key,
                base_url=self.config.base_url,
                timeout=15.0,      # 15秒超时，防止 hang 死
                max_retries=1,      # 最多重试1次
            )
        except ImportError:
            try:
                from langchain_openai import ChatOpenAI
                self._client = ChatOpenAI(
                    model=self.config.model,
                    api_key=self.config.api_key,
                    base_url=self.config.base_url,
                    temperature=0.7,
                    timeout=15,      # 15秒超时
                    max_retries=1,
                )
            except ImportError:
                raise ImportError("需要安装 openai 或 langchain-openai: pip install openai")

    async def chat(self, messages: List[Dict[str, str]],
                   temperature: float = 0.7,
                   max_tokens: int = 2000) -> str:
        """非流式对话"""
        if hasattr(self._client, 'chat'):
            # openai SDK
            try:
                response = self._client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=15.0,   # 15秒超时
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"{self.config.provider} 对话失败: {e}")
                raise
        else:
            # langchain
            try:
                from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
                lc_messages = []
                for msg in messages:
                    if msg["role"] == "system":
                        lc_messages.append(SystemMessage(content=msg["content"]))
                    elif msg["role"] == "user":
                        lc_messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        lc_messages.append(AIMessage(content=msg["content"]))
                response = await self._client.ainvoke(lc_messages)
                return response.content
            except Exception as e:
                logger.error(f"langchain 对话失败: {e}")
                raise

    async def stream_chat(self, messages: List[Dict[str, str]],
                          temperature: float = 0.7,
                          max_tokens: int = 2000) -> AsyncIterator[str]:
        """流式对话，逐 token 返回"""
        if hasattr(self._client, 'chat'):
            # openai SDK streaming
            try:
                response = self._client.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                    timeout=15.0,   # 15秒超时
                )
                for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                logger.error(f"{self.config.provider} 流式对话失败: {e}")
                raise
        else:
            # langchain streaming
            try:
                from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
                lc_messages = []
                for msg in messages:
                    if msg["role"] == "system":
                        lc_messages.append(SystemMessage(content=msg["content"]))
                    elif msg["role"] == "user":
                        lc_messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        lc_messages.append(AIMessage(content=msg["content"]))

                async for chunk in self._client.astream(lc_messages):
                    if chunk.content:
                        yield chunk.content
            except Exception as e:
                logger.error(f"langchain 流式对话失败: {e}")
                raise


# ========== 便捷函数 ==========

def get_llm(preferred_provider: Optional[str] = None) -> Optional[_OpenAICompatibleLLM]:
    """获取 LLM 实例（便捷函数，仅基于 .env 配置）"""
    return LLMFactory.create_llm(preferred_provider)


def get_llm_for_user(db, user, class_id: Optional[str] = None,
                     preferred_provider: Optional[str] = None) -> Optional[_OpenAICompatibleLLM]:
    """
    获取用户的 LLM 实例（数据库配置优先 > .env > None）

    优先级：
      1. 教师：使用教师本人在 UI 中配置的数据库配置（班级专属 > 全局）
      2. 学生：使用班级教师配置的数据库配置（班级专属 > 全局）
      3. 回退到 .env 配置（create_llm）

    Args:
        db: 数据库会话
        user: User 对象
        class_id: 班级ID（用于查找班级专属配置）
        preferred_provider: 指定优先提供商（仅 .env 回退时生效）
    """
    from app.routers.llm_config import get_teacher_llm_config
    from app.models.class_ import Class

    teacher_id = None
    effective_class_id = class_id or getattr(user, "class_id", None)

    if user.role == "teacher":
        teacher_id = user.id
    elif user.role == "student":
        # 学生：找到班级教师
        if effective_class_id:
            cls = db.query(Class).filter(Class.id == effective_class_id).first()
            if cls:
                teacher_id = cls.teacher_id

    # 1. 尝试数据库配置
    if teacher_id:
        db_cfg = get_teacher_llm_config(teacher_id, effective_class_id, db)
        if db_cfg:
            llm = LLMFactory.create_llm_from_db_config(db_cfg)
            if llm is not None:
                return llm

    # 2. 回退到 .env 配置
    return LLMFactory.create_llm(preferred_provider)


def is_llm_available() -> bool:
    """检查是否有可用的 LLM（基于 .env 配置）"""
    return len(LLMFactory.get_provider_chain()) > 0


def is_llm_available_for_user(db, user, class_id: Optional[str] = None) -> bool:
    """检查用户是否有可用的 LLM（数据库配置 + .env 配置）"""
    from app.routers.llm_config import get_teacher_llm_config
    from app.models.class_ import Class

    teacher_id = None
    effective_class_id = class_id or getattr(user, "class_id", None)

    if user.role == "teacher":
        teacher_id = user.id
    elif user.role == "student" and effective_class_id:
        cls = db.query(Class).filter(Class.id == effective_class_id).first()
        if cls:
            teacher_id = cls.teacher_id

    # 检查数据库配置
    if teacher_id:
        db_cfg = get_teacher_llm_config(teacher_id, effective_class_id, db)
        if db_cfg and db_cfg.is_active:
            return True

    # 检查 .env 配置
    return is_llm_available()


def get_llm_status() -> Dict[str, Any]:
    """获取 LLM 配置状态（前端展示用）"""
    chain = LLMFactory.get_provider_chain()
    return {
        "available": len(chain) > 0,
        "providers": [
            {
                "provider": cfg.provider,
                "model": cfg.model,
            }
            for cfg in chain
        ],
        "primary": chain[0].provider if chain else None,
    }
