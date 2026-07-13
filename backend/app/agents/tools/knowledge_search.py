from typing import Dict, Any, List
from app.agents.tools.mcp_base import MCPTool
from app.agents.rag.pipeline import RAGPipeline

class KnowledgeSearchTool(MCPTool):
    name = "knowledge_search"
    description = "搜索知识库，获取相关文档信息。用于回答学生的问题、提供学习资料等。"
    
    def __init__(self, db):
        self.db = db
    
    async def execute(self, query: str, class_id: str = None, top_k: int = 3) -> Dict[str, Any]:
        rag_pipeline = RAGPipeline(db=self.db)
        results = rag_pipeline.search(query=query, class_id=class_id, top_k=top_k)
        
        return {
            "success": True,
            "results": results,
            "count": len(results),
        }