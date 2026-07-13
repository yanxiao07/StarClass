from typing import TypedDict, List, Dict, Any
from langchain_core.messages import BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

class CreativeWriterState(TypedDict):
    messages: List[BaseMessage]
    agent_info: Dict[str, Any]
    user_context: Dict[str, Any]
    is_complete: bool

class CreativeWriterGraph:
    SYSTEM_PROMPT = """你是一位富有创意的写作导师，擅长激发灵感和指导写作。

你的职责：
1. 帮助学生构思作文题目和内容
2. 生成故事创意和情节
3. 提供写作技巧和建议
4. 润色和修改文章
5. 鼓励学生发挥创造力

请保持创意、热情和支持的态度。"""
    
    def __init__(self, db):
        self.db = db
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.9)
        self.graph = self._build_graph()
    
    def _build_graph(self):
        workflow = StateGraph(CreativeWriterState)
        
        workflow.add_node("call_agent", self._call_agent)
        workflow.add_node("summarize", self._summarize)
        
        workflow.set_entry_point("call_agent")
        workflow.add_edge("call_agent", "summarize")
        workflow.add_edge("summarize", END)
        
        return workflow.compile()
    
    async def _call_agent(self, state: CreativeWriterState) -> CreativeWriterState:
        messages = state["messages"]
        response = self.llm.invoke(messages)
        messages.append(response)
        
        return {**state, "messages": messages}
    
    async def _summarize(self, state: CreativeWriterState) -> CreativeWriterState:
        return {**state, "is_complete": True}
    
    async def run(self, messages: List[BaseMessage], context: Dict[str, Any]) -> Dict[str, Any]:
        initial_state = CreativeWriterState(
            messages=messages,
            agent_info={"type": "creative_writer"},
            user_context=context,
            is_complete=False,
        )
        
        result = await self.graph.ainvoke(initial_state)
        
        last_message = result["messages"][-1]
        return {
            "response": last_message.content if hasattr(last_message, 'content') else str(last_message),
        }