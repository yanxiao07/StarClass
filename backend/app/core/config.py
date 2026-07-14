from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "StarClass AI Agent Platform"
    VERSION: str = "0.1.0"

    DATABASE_URL: str = "sqlite:///./starclass.db"

    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ========== 多模型提供商配置 ==========
    # 主模型（优先使用）
    LLM_PROVIDER: str = "openai"  # openai / deepseek / qwen / ollama
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = ""  # 留空则使用提供商默认地址

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str = ""

    # DeepSeek
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"

    # 通义千问（兼容OpenAI格式）
    QWEN_API_KEY: str = ""
    QWEN_MODEL: str = "qwen-plus"
    QWEN_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"

    # Ollama（本地部署）
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    OLLAMA_MODEL: str = "llama3"

    # 备用模型列表（故障转移，逗号分隔）
    LLM_FALLBACK_PROVIDERS: str = ""  # e.g. "deepseek,qwen,ollama"

    # ========== 其他配置 ==========
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = "starclass-knowledge"

    REDIS_URL: str = "redis://localhost:6379"

    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8000"]

    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 52428800

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
