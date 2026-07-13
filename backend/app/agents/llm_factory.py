from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.language_models import BaseChatModel

from app.core.config import settings

class LLMFactory:
    _instance: Optional[BaseChatModel] = None
    
    @classmethod
    def get_llm(cls, model_name: str = None, temperature: float = 0.7) -> BaseChatModel:
        model = model_name or settings.OPENAI_MODEL
        
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY 未配置")
        
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=settings.OPENAI_API_KEY,
        )
    
    @classmethod
    def get_streaming_llm(cls, model_name: str = None) -> BaseChatModel:
        model = model_name or settings.OPENAI_MODEL
        
        return ChatOpenAI(
            model=model,
            temperature=0.7,
            api_key=settings.OPENAI_API_KEY,
            streaming=True,
        )