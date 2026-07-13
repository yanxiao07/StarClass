from typing import Dict, Any, Optional
import uuid
from datetime import datetime
from langchain_core.messages import HumanMessage, SystemMessage

from app.models.agent import Agent, AgentConversation, AgentMessage
from app.agents.registry import AgentRegistry
from app.agents.graphs import TeachingAssistantGraph, StudyCoachGraph, CreativeWriterGraph, CodeCoachGraph

class AgentOrchestrator:
    def __init__(self, db):
        self.db = db
    
    async def chat(self, user, agent: Agent, message: str, 
                   conversation_id: Optional[str] = None, 
                   class_id: Optional[str] = None) -> Dict[str, Any]:
        if conversation_id:
            conversation = self.db.query(AgentConversation).filter(
                AgentConversation.id == conversation_id,
                AgentConversation.user_id == user.id,
            ).first()
            if not conversation:
                conversation = self._create_conversation(user, agent, class_id)
        else:
            conversation = self._create_conversation(user, agent, class_id)
        
        self._save_message(conversation.id, "user", message)
        
        user_context = self._build_user_context(user, class_id)
        
        messages = self._build_messages(conversation, agent, user_context)
        
        response = await self._invoke_agent(agent, messages, user_context)
        
        self._save_message(conversation.id, "assistant", response.get("response", ""))
        
        conversation.updated_at = datetime.utcnow()
        self.db.commit()
        
        return {
            "conversation_id": conversation.id,
            "agent_id": agent.id,
            "response": response.get("response", ""),
            "tool_results": response.get("tool_results", []),
            "created_at": datetime.utcnow().isoformat(),
        }
    
    def _create_conversation(self, user, agent: Agent, class_id: Optional[str]) -> AgentConversation:
        conversation = AgentConversation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            agent_id=agent.id,
            class_id=class_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        
        return conversation
    
    def _save_message(self, conversation_id: str, role: str, content: str, 
                     tool_calls: Optional[Any] = None, tool_result: Optional[Any] = None):
        message = AgentMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_call=tool_calls,
            tool_result=tool_result,
            created_at=datetime.utcnow(),
        )
        self.db.add(message)
        self.db.commit()
    
    def _build_user_context(self, user, class_id: Optional[str]) -> Dict[str, Any]:
        return {
            "user_id": user.id,
            "name": user.name,
            "nickname": user.nickname,
            "role": user.role,
            "class_id": class_id or user.class_id,
            "stars": user.stars,
            "level": user.level,
        }
    
    def _build_messages(self, conversation: AgentConversation, agent: Agent, 
                        user_context: Dict[str, Any]) -> list:
        messages = []
        
        messages.append(SystemMessage(content=agent.system_prompt or ""))
        
        messages.append(SystemMessage(content=f"用户信息：{user_context}"))
        
        prev_messages = self.db.query(AgentMessage).filter(
            AgentMessage.conversation_id == conversation.id
        ).order_by(AgentMessage.created_at).all()
        
        for msg in prev_messages:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append({"role": "assistant", "content": msg.content})
        
        return messages
    
    async def _invoke_agent(self, agent: Agent, messages: list, 
                            user_context: Dict[str, Any]) -> Dict[str, Any]:
        agent_class = AgentRegistry.get(agent.type)
        
        if agent_class:
            agent_instance = agent_class(db=self.db)
            return await agent_instance.run(messages, user_context)
        
        return {"response": f"暂不支持该类型的智能体: {agent.type}"}