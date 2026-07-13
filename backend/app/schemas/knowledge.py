from pydantic import BaseModel, Field
from typing import Optional

class KnowledgeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="文档标题")
    content: str = Field(..., description="文档内容")
    class_id: Optional[str] = Field(None, description="班级ID")
    source_type: str = Field("upload", description="来源类型")
    source_url: Optional[str] = Field(None, description="来源URL")

class KnowledgeResponse(BaseModel):
    id: str = Field(..., description="文档ID")
    title: str = Field(..., description="文档标题")
    content: str = Field(..., description="文档内容")
    class_id: Optional[str] = Field(None, description="班级ID")
    source_type: str = Field(..., description="来源类型")
    source_url: Optional[str] = Field(None, description="来源URL")
    created_at: str = Field(..., description="创建时间")

class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., description="搜索关键词")
    class_id: Optional[str] = Field(None, description="班级ID")
    top_k: int = Field(3, description="返回数量")