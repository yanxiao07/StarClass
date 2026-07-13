from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "StarClass AI Agent Platform"
    VERSION: str = "0.1.0"
    
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/starclass"
    
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = "starclass-knowledge"
    
    REDIS_URL: str = "redis://localhost:6379"
    
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8000"]
    
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 52428800
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()