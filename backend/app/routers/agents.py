from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.agent import Agent, AgentConversation, AgentMessage
from app.schemas.agent import (
    AgentResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ConversationResponse,
)
from app.agents.orchestrator import AgentOrchestrator

router = APIRouter()

@router.get("", response_model=list[AgentResponse])
async def get_agents(db: Session = Depends(get_db)):
    agents = db.query(Agent).filter(Agent.is_active == True).all()
    return [
        AgentResponse(
            id=agent.id,
            name=agent.name,
            type=agent.type,
            description=agent.description,
            is_active=agent.is_active,
        )
        for agent in agents
    ]

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        type=agent.type,
        description=agent.description,
        is_active=agent.is_active,
    )

@router.post("/{agent_id}/chat")
async def chat_with_agent(
    agent_id: str,
    request: ChatMessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")
    
    orchestrator = AgentOrchestrator(db=db)
    
    result = await orchestrator.chat(
        user=user,
        agent=agent,
        message=request.message,
        conversation_id=request.conversation_id,
        class_id=request.class_id,
    )
    
    return result

@router.get("/{agent_id}/conversations", response_model=list[ConversationResponse])
async def get_conversations(
    agent_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversations = (
        db.query(AgentConversation)
        .filter(AgentConversation.user_id == user.id)
        .filter(AgentConversation.agent_id == agent_id)
        .order_by(AgentConversation.updated_at.desc())
        .all()
    )
    
    result = []
    for conv in conversations:
        last_msg = (
            db.query(AgentMessage)
            .filter(AgentMessage.conversation_id == conv.id)
            .order_by(AgentMessage.created_at.desc())
            .first()
        )
        result.append(ConversationResponse(
            id=conv.id,
            agent_id=conv.agent_id,
            agent_name=agent_id,
            class_id=conv.class_id,
            last_message=last_msg.content if last_msg else None,
            created_at=conv.created_at.isoformat(),
            updated_at=conv.updated_at.isoformat(),
        ))
    
    return result

@router.get("/{agent_id}/conversations/{conv_id}", response_model=list[ChatMessageResponse])
async def get_conversation_messages(
    agent_id: str,
    conv_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(AgentConversation).filter(
        AgentConversation.id == conv_id,
        AgentConversation.user_id == user.id,
        AgentConversation.agent_id == agent_id,
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    messages = (
        db.query(AgentMessage)
        .filter(AgentMessage.conversation_id == conv_id)
        .order_by(AgentMessage.created_at)
        .all()
    )
    
    return [
        ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            tool_calls=msg.tool_call,
            created_at=msg.created_at.isoformat(),
        )
        for msg in messages
    ]