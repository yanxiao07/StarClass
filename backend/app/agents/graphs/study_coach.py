from typing import TypedDict, List, Dict, Any
from langchain_core.messages import BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from app.agents.tools import KnowledgeSearchTool

class StudyCoachState(TypedDict):
    messages: List[BaseMessage]
    agent_info: Dict[str, Any]
    user_context: Dict[str, Any]
    tool_results: List[Dict[str, Any]]
    is_complete: bool

class StudyCoachGraph:
    SYSTEM_PROMPT = """你是一位专业的学习辅导老师，擅长个性化学习指导。

你的职责：
1. 讲解知识点，用通俗易懂的方式解释概念
2. 为学生规划学习路径
3. 推荐适合的练习题
4. 分析错题，提供改进建议
5. 跟踪学习进度，鼓励学生

请始终保持耐心、鼓励和专业的态度。"""
    
    def __init__(self, db):
        self.db = db
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        self.tools = [KnowledgeSearchTool(db=db)]
        self.graph = self._build_graph()
    
    def _build_graph(self):
        workflow = StateGraph(StudyCoachState)
        
        workflow.add_node("call_agent", self._call_agent)
        workflow.add_node("search_knowledge", self._search_knowledge)
        workflow.add_node("summarize", self._summarize)
        
        workflow.set_entry_point("call_agent")
        
        workflow.add_conditional_edges(
            "call_agent",
            self._should_search,
            {
                "search": "search_knowledge",
                "finish": "summarize",
            },
        )
        
        workflow.add_edge("search_knowledge", "call_agent")
        workflow.add_edge("summarize", END)
        
        return workflow.compile()
    
    async def _call_agent(self, state: StudyCoachState) -> StudyCoachState:
        messages = state["messages"]
        response = self.llm.invoke(messages)
        messages.append(response)
        
        return {**state, "messages": messages}
    
    def _should_search(self, state: StudyCoachState) -> str:
        last_message = state["messages"][-1]
        content = last_message.content.lower() if hasattr(last_message, 'content') else ""
        
        if any(keyword in content for keyword in ["讲解", "解释", "是什么", "为什么", "知识点", "学习", "复习"]):
            return "search"
        return "finish"
    
    async def _search_knowledge(self, state: StudyCoachState) -> StudyCoachState:
        last_message = state["messages"][-1]
        query = last_message.content if hasattr(last_message, 'content') else ""
        
        search_tool = KnowledgeSearchTool(db=self.db)
        results = await search_tool.execute(query=query)
        
        state["tool_results"].append(results)
        
        if results.get("success") and results.get("results"):
            knowledge_content = "\n".join([r.get("content", "") for r in results["results"]])
            state["messages"].append({
                "role": "system",
                "content": f"知识库搜索结果：\n{knowledge_content}"
            })
        
        return state
    
    async def _summarize(self, state: StudyCoachState) -> StudyCoachState:
        return {**state, "is_complete": True}
    
    async def run(self, messages: List[BaseMessage], context: Dict[str, Any]) -> Dict[str, Any]:
        initial_state = StudyCoachState(
            messages=messages,
            agent_info={"type": "study_coach"},
            user_context=context,
            tool_results=[],
            is_complete=False,
        )
        
        result = await self.graph.ainvoke(initial_state)
        
        last_message = result["messages"][-1]
        return {
            "response": last_message.content if hasattr(last_message, 'content') else str(last_message),
            "tool_results": result["tool_results"],
        }