from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(String(36), primary_key=True, index=True)
    homework_id = Column(String(36), ForeignKey("homeworks.id"), nullable=False)
    student_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text)
    file_url = Column(String(500))
    status = Column(String(20), default="pending")
    grade = Column(Integer)
    feedback = Column(Text)
    ai_feedback = Column(Text)
    graded_at = Column(DateTime)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    homework = relationship("Homework", back_populates="submissions")
    student = relationship("User", back_populates="submissions")