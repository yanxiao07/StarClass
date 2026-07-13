from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Homework(Base):
    __tablename__ = "homeworks"
    
    id = Column(String(36), primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(2000))
    due_date = Column(DateTime, nullable=False)
    subject = Column(String(50), default="other")
    class_id = Column(String(36), ForeignKey("classes.id"))
    teacher_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    class_ = relationship("Class", back_populates="homeworks")
    teacher = relationship("User", back_populates="homeworks")
    submissions = relationship("Submission", back_populates="homework")