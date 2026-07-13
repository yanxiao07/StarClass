from sqlalchemy import Column, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    
    id = Column(String(36), primary_key=True, index=True)
    class_id = Column(String(36), ForeignKey("classes.id"))
    title = Column(String(200), nullable=False)
    content = Column(Text)
    source_type = Column(String(50), default="upload")
    source_url = Column(String(500))
    embedding_vector = Column(JSON)
    chunk_index = Column(Integer, default=0)
    total_chunks = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    class_ = relationship("Class", back_populates="knowledge_base")