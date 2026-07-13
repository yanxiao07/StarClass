from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    nickname = Column(String(100))
    avatar = Column(String(500))
    role = Column(String(20), nullable=False, default="student")
    class_id = Column(String(36), ForeignKey("classes.id"))
    student_id = Column(String(50))
    stars = Column(Integer, default=0)
    level = Column(Integer, default=1)
    theme = Column(String(50), default="default")
    is_muted = Column(Boolean, default=False)
    muted_until = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    class_ = relationship("Class", back_populates="students", foreign_keys=[class_id])
    created_classes = relationship("Class", back_populates="teacher", foreign_keys="Class.teacher_id")
    homeworks = relationship("Homework", back_populates="teacher")
    submissions = relationship("Submission", back_populates="student")
    conversations = relationship("AgentConversation", back_populates="user")
    messages = relationship("ChatMessage", back_populates="user")