from sqlalchemy import Column, String, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(Text)
    system_prompt = Column(Text)
    is_active = Column(Boolean, default=True)
    model_name = Column(String(100), default="gpt-4o-mini")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    conversations = relationship("AgentConversation", back_populates="agent")

class AgentConversation(Base):
    __tablename__ = "agent_conversations"
    
    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    agent_id = Column(String(36), ForeignKey("agents.id"), nullable=False)
    class_id = Column(String(36), ForeignKey("classes.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="conversations")
    agent = relationship("Agent", back_populates="conversations")
    class_ = relationship("Class", back_populates="conversations")
    messages = relationship("AgentMessage", back_populates="conversation")

class AgentMessage(Base):
    __tablename__ = "agent_messages"
    
    id = Column(String(36), primary_key=True, index=True)
    conversation_id = Column(String(36), ForeignKey("agent_conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text)
    tool_call = Column(JSON)
    tool_result = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("AgentConversation", back_populates="messages")

class AgentToolCall(Base):
    __tablename__ = "agent_tool_calls"
    
    id = Column(String(36), primary_key=True, index=True)
    message_id = Column(String(36), ForeignKey("agent_messages.id"))
    tool_name = Column(String(100), nullable=False)
    tool_params = Column(JSON)
    tool_result = Column(JSON)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    message = relationship("AgentMessage")