from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Class(Base):
    __tablename__ = "classes"
    
    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    class_code = Column(String(10), unique=True, nullable=False)
    teacher_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    is_all_muted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    teacher = relationship("User", back_populates="created_classes", foreign_keys=[teacher_id])
    students = relationship("User", back_populates="class_", foreign_keys="User.class_id")
    homeworks = relationship("Homework", back_populates="class_")
    conversations = relationship("AgentConversation", back_populates="class_")
    knowledge_base = relationship("KnowledgeBase", back_populates="class_")