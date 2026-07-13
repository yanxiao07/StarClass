from typing import List, Dict, Optional
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from datetime import datetime

class ShortTermMemory:
    def __init__(self, max_messages: int = 20):
        self._messages: List[BaseMessage] = []
        self._max_messages = max_messages
    
    def add_message(self, role: str, content: str, tool_calls: Optional[List[Dict]] = None) -> None:
        if role == "user":
            message = HumanMessage(content=content)
        elif role == "assistant":
            message = AIMessage(content=content, tool_calls=tool_calls)
        elif role == "system":
            message = SystemMessage(content=content)
        else:
            message = HumanMessage(content=content)
        
        self._messages.append(message)
        
        if len(self._messages) > self._max_messages:
            self._messages = self._messages[-self._max_messages:]
    
    def get_messages(self) -> List[BaseMessage]:
        return self._messages.copy()
    
    def get_recent_messages(self, n: int = 10) -> List[BaseMessage]:
        return self._messages[-n:]
    
    def clear(self) -> None:
        self._messages = []
    
    def count(self) -> int:
        return len(self._messages)