from typing import Dict, Any
from app.agents.tools.mcp_base import MCPTool
from app.agents.llm_factory import LLMFactory

class CodeAnalysisTool(MCPTool):
    name = "code_analysis"
    description = "代码分析工具，用于分析代码逻辑、诊断错误、提供优化建议。"
    
    async def execute(self, code: str, language: str = "python", task: str = "analyze") -> Dict[str, Any]:
        llm = LLMFactory.get_llm(temperature=0.3)
        
        prompt = f"""你是一位专业的代码审查专家。请{task}以下{language}代码：

代码内容：
{code}

请提供详细的分析结果。"""
        
        response = llm.invoke([{"role": "user", "content": prompt}])
        
        return {
            "success": True,
            "analysis": response.content,
        }