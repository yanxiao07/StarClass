from typing import TypedDict, List, Dict, Any
from langchain_core.messages import BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from app.agents.tools import CodeAnalysisTool

class CodeCoachState(TypedDict):
    messages: List[BaseMessage]
    agent_info: Dict[str, Any]
    user_context: Dict[str, Any]
    tool_results: List[Dict[str, Any]]
    is_complete: bool

class CodeCoachGraph:
    SYSTEM_PROMPT = """你是一位专业的编程导师，擅长帮助学生学习编程。

你的职责：
1. 分析代码逻辑和结构
2. 诊断代码错误和问题
3. 提供代码优化建议
4. 解答编程疑问
5. 指导编程实践

请保持耐心、专业和清晰的态度。"""
    
    def __init__(self, db):
        self.db = db
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
        self.code_tool = CodeAnalysisTool()
        self.graph = self._build_graph()
    
    def _build_graph(self):
        workflow = StateGraph(CodeCoachState)
        
        workflow.add_node("call_agent", self._call_agent)
        workflow.add_node("analyze_code", self._analyze_code)
        workflow.add_node("summarize", self._summarize)
        
        workflow.set_entry_point("call_agent")
        
        workflow.add_conditional_edges(
            "call_agent",
            self._should_analyze,
            {
                "analyze": "analyze_code",
                "finish": "summarize",
            },
        )
        
        workflow.add_edge("analyze_code", "call_agent")
        workflow.add_edge("summarize", END)
        
        return workflow.compile()
    
    async def _call_agent(self, state: CodeCoachState) -> CodeCoachState:
        messages = state["messages"]
        response = self.llm.invoke(messages)
        messages.append(response)
        
        return {**state, "messages": messages}
    
    def _should_analyze(self, state: CodeCoachState) -> str:
        last_message = state["messages"][-1]
        content = last_message.content if hasattr(last_message, 'content') else ""
        
        if "```" in content or any(keyword in content.lower() for keyword in ["代码", "debug", "错误", "分析", "优化"]):
            return "analyze"
        return "finish"
    
    async def _analyze_code(self, state: CodeCoachState) -> CodeCoachState:
        last_message = state["messages"][-1]
        content = last_message.content if hasattr(last_message, 'content') else ""
        
        import re
        code_match = re.search(r'```(\w+)?\n([\s\S]*?)```', content)
        
        if code_match:
            language = code_match.group(1) or "python"
            code = code_match.group(2)
            
            results = await self.code_tool.execute(code=code, language=language)
            state["tool_results"].append(results)
            
            if results.get("success"):
                state["messages"].append({
                    "role": "system",
                    "content": f"代码分析结果：\n{results['analysis']}"
                })
        
        return state
    
    async def _summarize(self, state: CodeCoachState) -> CodeCoachState:
        return {**state, "is_complete": True}
    
    async def run(self, messages: List[BaseMessage], context: Dict[str, Any]) -> Dict[str, Any]:
        initial_state = CodeCoachState(
            messages=messages,
            agent_info={"type": "code_coach"},
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