from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import json
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.agent import Agent, AgentConversation, AgentMessage
from app.models.homework import Homework
from app.schemas.agent import (
    AgentResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ConversationResponse,
)
from app.agents.orchestrator import AgentOrchestrator

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    class_id: Optional[str] = None
    homework_id: Optional[str] = None


class AnalyzeClassRequest(BaseModel):
    class_id: str


class HomeworkHelpRequest(BaseModel):
    homework_id: str
    question: Optional[str] = None


@router.get("")
async def get_agents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    agents = db.query(Agent).filter(Agent.is_active == True).all()
    return [
        {
            "id": agent.id,
            "name": agent.name,
            "type": agent.type,
            "description": agent.description,
            "isActive": agent.is_active,
        }
        for agent in agents
    ]


@router.get("/{agent_id}")
async def get_agent(
    agent_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")
    return {
        "id": agent.id,
        "name": agent.name,
        "type": agent.type,
        "description": agent.description,
        "isActive": agent.is_active,
    }


@router.post("/{agent_id}/chat")
async def chat_with_agent(
    agent_id: str,
    request: ChatRequest,
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
        homework_id=request.homework_id,
    )

    return result


@router.get("/{agent_id}/conversations")
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
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        result.append({
            "id": conv.id,
            "agentId": conv.agent_id,
            "agentName": agent.name if agent else "",
            "classId": conv.class_id,
            "lastMessage": last_msg.content if last_msg else None,
            "createdAt": conv.created_at.isoformat(),
            "updatedAt": conv.updated_at.isoformat(),
        })

    return result


@router.get("/{agent_id}/conversations/{conv_id}")
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
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "toolCalls": msg.tool_call,
            "createdAt": msg.created_at.isoformat(),
        }
        for msg in messages
    ]


@router.delete("/{agent_id}/conversations/{conv_id}")
async def delete_conversation(
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

    # 删除消息
    db.query(AgentMessage).filter(AgentMessage.conversation_id == conv_id).delete()
    db.delete(conversation)
    db.commit()

    return {"message": "会话已删除"}


# ========== 新增：智能体与教学流程整合端点 ==========

@router.post("/analyze-class")
async def analyze_class_performance(
    request: AnalyzeClassRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """教师端：AI分析班级表现"""
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以查看班级分析")

    orchestrator = AgentOrchestrator(db=db)
    result = await orchestrator.analyze_class_performance(user, request.class_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.post("/homework-help")
async def homework_help(
    request: HomeworkHelpRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """学生端：作业AI辅导，基于作业上下文"""
    homework = db.query(Homework).filter(Homework.id == request.homework_id).first()
    if not homework:
        raise HTTPException(status_code=404, detail="作业不存在")

    # 根据科目选择合适的智能体
    subject = (homework.subject or "").lower()
    if any(w in subject for w in ["编程", "代码", "code", "python", "java", "c++"]):
        agent_type = "code_coach"
    elif any(w in subject for w in ["语文", "写作", "作文", "chinese", "english", "英语"]):
        agent_type = "creative_writer"
    else:
        agent_type = "study_coach"

    agent = db.query(Agent).filter(Agent.type == agent_type, Agent.is_active == True).first()
    if not agent:
        agent = db.query(Agent).filter(Agent.is_active == True).first()
    if not agent:
        raise HTTPException(status_code=404, detail="没有可用的智能体")

    # 构建辅导消息
    question = request.question or "请帮我分析这道作业的解题思路"
    message = f"作业：{homework.title}\n科目：{homework.subject}\n要求：{homework.description or '无'}\n\n我的问题：{question}"

    orchestrator = AgentOrchestrator(db=db)
    result = await orchestrator.chat(
        user=user,
        agent=agent,
        message=message,
        class_id=user.class_id,
        homework_id=request.homework_id,
    )

    return {
        **result,
        "agentType": agent_type,
        "agentName": agent.name,
    }


# ========== SSE 流式对话端点 ==========

@router.post("/{agent_id}/stream-chat")
async def stream_chat_with_agent(
    agent_id: str,
    request: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """SSE 流式对话，逐 token 返回"""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="智能体不存在")

    orchestrator = AgentOrchestrator(db=db)

    async def event_stream():
        async for chunk in orchestrator.stream_chat(
            user=user,
            agent=agent,
            message=request.message,
            conversation_id=request.conversation_id,
            class_id=request.class_id,
            homework_id=request.homework_id,
        ):
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ========== LLM 配置状态端点 ==========

@router.get("/llm/status")
async def get_llm_status(
    user: User = Depends(get_current_user),
):
    """获取当前 LLM 配置状态（前端展示用）"""
    from app.agents.llm_factory import get_llm_status
    return get_llm_status()
