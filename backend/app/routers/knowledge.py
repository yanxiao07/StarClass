from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.knowledge import KnowledgeBase
from app.schemas.knowledge import KnowledgeCreate, KnowledgeResponse, KnowledgeSearchRequest
from app.agents.rag.pipeline import RAGPipeline

router = APIRouter()

@router.get("", response_model=list[KnowledgeResponse])
async def get_knowledge_base(
    class_id: str = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(KnowledgeBase)
    if class_id:
        query = query.filter(KnowledgeBase.class_id == class_id)
    
    documents = query.all()
    
    return [KnowledgeResponse(
        id=doc.id,
        title=doc.title,
        content=doc.content,
        class_id=doc.class_id,
        source_type=doc.source_type,
        source_url=doc.source_url,
        created_at=doc.created_at.isoformat(),
    ) for doc in documents]

@router.post("", response_model=KnowledgeResponse)
async def create_knowledge(
    request: KnowledgeCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rag_pipeline = RAGPipeline(db=db)
    
    documents = rag_pipeline.process_document(
        title=request.title,
        content=request.content,
        class_id=request.class_id,
        source_type=request.source_type,
        source_url=request.source_url,
    )
    
    return KnowledgeResponse(
        id=documents[0].id,
        title=documents[0].title,
        content=documents[0].content,
        class_id=documents[0].class_id,
        source_type=documents[0].source_type,
        source_url=documents[0].source_url,
        created_at=documents[0].created_at.isoformat(),
    )

@router.post("/search")
async def search_knowledge(
    request: KnowledgeSearchRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rag_pipeline = RAGPipeline(db=db)
    results = rag_pipeline.search(
        query=request.query,
        class_id=request.class_id,
        top_k=request.top_k,
    )
    
    return {"results": results}

@router.delete("/{doc_id}")
async def delete_knowledge(
    doc_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(KnowledgeBase).filter(KnowledgeBase.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    db.delete(doc)
    db.commit()
    
    return {"message": "文档删除成功"}