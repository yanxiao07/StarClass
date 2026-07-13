from pydantic import BaseModel, Field
from typing import Optional, List, Dict

class AgentResponse(BaseModel):
    id: str = Field(..., description="智能体ID")
    name: str = Field(..., description="智能体名称")
    type: str = Field(..., description="智能体类型")
    description: str = Field(..., description="智能体描述")
    is_active: bool = Field(..., description="是否启用")

class ChatMessageRequest(BaseModel):
    message: str = Field(..., description="用户消息")
    conversation_id: Optional[str] = Field(None, description="会话ID")
    class_id: Optional[str] = Field(None, description="班级ID")

class ChatMessageResponse(BaseModel):
    id: str = Field(..., description="消息ID")
    role: str = Field(..., description="角色")
    content: str = Field(..., description="消息内容")
    tool_calls: Optional[List[Dict]] = Field(None, description="工具调用")
    created_at: str = Field(..., description="创建时间")

class ConversationResponse(BaseModel):
    id: str = Field(..., description="会话ID")
    agent_id: str = Field(..., description="智能体ID")
    agent_name: str = Field(..., description="智能体名称")
    class_id: Optional[str] = Field(None, description="班级ID")
    last_message: Optional[str] = Field(None, description="最后一条消息")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")