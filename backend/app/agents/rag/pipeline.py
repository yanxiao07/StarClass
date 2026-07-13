from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from app.models.knowledge import KnowledgeBase

class RAGPipeline:
    def __init__(self, db):
        self.db = db
    
    def process_document(self, title: str, content: str, class_id: str = None, 
                        source_type: str = "upload", source_url: str = None) -> List[KnowledgeBase]:
        chunks = self._split_text(content)
        
        documents = []
        for i, chunk in enumerate(chunks):
            doc = KnowledgeBase(
                id=str(uuid.uuid4()),
                title=title,
                content=chunk,
                class_id=class_id,
                source_type=source_type,
                source_url=source_url,
                chunk_index=i,
                total_chunks=len(chunks),
                created_at=datetime.utcnow(),
            )
            self.db.add(doc)
            documents.append(doc)
        
        self.db.commit()
        
        return documents
    
    def _split_text(self, text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
        chunks = []
        start = 0
        
        while start < len(text):
            end = min(start + chunk_size, len(text))
            
            if end < len(text):
                last_period = text.rfind('.', start, end)
                if last_period > start + chunk_overlap:
                    end = last_period + 1
            
            chunks.append(text[start:end].strip())
            start = end - chunk_overlap
        
        return chunks
    
    def search(self, query: str, class_id: str = None, top_k: int = 3) -> List[Dict[str, Any]]:
        query = query.lower()
        
        query_obj = self.db.query(KnowledgeBase)
        if class_id:
            query_obj = query_obj.filter(KnowledgeBase.class_id == class_id)
        
        documents = query_obj.all()
        
        results = []
        for doc in documents:
            score = self._calculate_similarity(query, doc.content)
            if score > 0.1:
                results.append({
                    "id": doc.id,
                    "title": doc.title,
                    "content": doc.content,
                    "score": score,
                    "class_id": doc.class_id,
                })
        
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return results[:top_k]
    
    def _calculate_similarity(self, query: str, text: str) -> float:
        query_words = set(query.split())
        text_words = set(text.lower().split())
        
        if not query_words:
            return 0.0
        
        intersection = query_words.intersection(text_words)
        return len(intersection) / len(query_words)