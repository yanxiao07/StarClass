from abc import ABC, abstractmethod
from typing import Dict, Any, List
from langchain_core.messages import BaseMessage

class BaseAgent(ABC):
    name: str
    type: str
    description: str
    system_prompt: str
    
    @abstractmethod
    async def run(self, messages: List[BaseMessage], context: Dict[str, Any]) -> str:
        """执行智能体主逻辑"""
        pass
    
    @abstractmethod
    async def get_response(self, user_message: str, conversation_history: List[Dict]) -> Dict[str, Any]:
        """获取智能体响应"""
        pass