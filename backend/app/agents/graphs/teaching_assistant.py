from typing import TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from app.agents.tools import KnowledgeSearchTool, HomeworkTool

class TeachingAssistantState(TypedDict):
    messages: List[BaseMessage]
    agent_info: Dict[str, Any]
    user_context: Dict[str, Any]
    tool_results: List[Dict[str, Any]]
    is_complete: bool

class TeachingAssistantGraph:
    SYSTEM_PROMPT = """你是一位专业的智能助教，擅长批改作业、提供学习反馈和解答问题。

你的职责：
1. 批改学生作业，提供详细的评分和反馈
2. 解答学生关于作业的疑问
3. 分析学生的学习情况，提供改进建议
4. 与其他智能体协作，提供更全面的学习支持

请始终保持专业、耐心和鼓励的态度。"""
    
    def __init__(self, db):
        self.db = db
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
        self.tools = [
            KnowledgeSearchTool(db=db),
            HomeworkTool(db=db),
        ]
        self.tool_node = ToolNode(self.tools)
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        self.graph = self._build_graph()
    
    def _build_graph(self):
        workflow = StateGraph(TeachingAssistantState)
        
        workflow.add_node("call_agent", self._call_agent)
        workflow.add_node("execute_tool", self.tool_node)
        workflow.add_node("summarize", self._summarize)
        
        workflow.set_entry_point("call_agent")
        
        workflow.add_conditional_edges(
            "call_agent",
            self._should_call_tool,
            {
                "tool": "execute_tool",
                "finish": "summarize",
            },
        )
        
        workflow.add_edge("execute_tool", "call_agent")
        workflow.add_edge("summarize", END)
        
        return workflow.compile()
    
    async def _call_agent(self, state: TeachingAssistantState) -> TeachingAssistantState:
        messages = state["messages"]
        
        response = await self.llm_with_tools.ainvoke(messages)
        messages.append(response)
        
        return {
            **state,
            "messages": messages,
        }
    
    def _should_call_tool(self, state: TeachingAssistantState) -> str:
        last_message = state["messages"][-1]
        if isinstance(last_message, AIMessage) and last_message.tool_calls:
            return "tool"
        return "finish"
    
    async def grade_homework(self, submission, homework) -> Dict[str, Any]:
        prompt = f"""请批改以下作业：

作业标题：{homework.title}
作业描述：{homework.description}
学生提交内容：{submission.content}

请提供：
1. 评分（0-100分）
2. 详细的反馈意见
3. 改进建议"""
        
        response = await self.llm.ainvoke([{"role": "user", "content": prompt}])
        
        try:
            result = response.content
            grade = None
            feedback = result
            
            if "分" in result:
                import re
                match = re.search(r'(\d+)分', result)
                if match:
                    grade = int(match.group(1))
            
            return {"grade": grade, "feedback": feedback}
        except Exception as e:
            return {"grade": None, "feedback": f"批改失败: {str(e)}"}
    
    async def run(self, messages: List[BaseMessage], context: Dict[str, Any]) -> Dict[str, Any]:
        initial_state = TeachingAssistantState(
            messages=messages,
            agent_info={"type": "teaching_assistant"},
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