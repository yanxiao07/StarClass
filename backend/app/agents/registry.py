from typing import Dict, Type, Optional
from app.agents.base import BaseAgent
from app.agents.graphs.teaching_assistant import TeachingAssistantGraph
from app.agents.graphs.study_coach import StudyCoachGraph
from app.agents.graphs.creative_writer import CreativeWriterGraph
from app.agents.graphs.code_coach import CodeCoachGraph

class AgentRegistry:
    _agents: Dict[str, Type[BaseAgent]] = {}
    
    @classmethod
    def register(cls, agent_type: str, agent_class: Type[BaseAgent]) -> None:
        cls._agents[agent_type] = agent_class
    
    @classmethod
    def get(cls, agent_type: str) -> Optional[Type[BaseAgent]]:
        return cls._agents.get(agent_type)
    
    @classmethod
    def list_agents(cls) -> Dict[str, Type[BaseAgent]]:
        return cls._agents.copy()

AgentRegistry.register("teaching_assistant", TeachingAssistantGraph)
AgentRegistry.register("study_coach", StudyCoachGraph)
AgentRegistry.register("creative_writer", CreativeWriterGraph)
AgentRegistry.register("code_coach", CodeCoachGraph)