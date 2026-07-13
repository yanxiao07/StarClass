from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class HomeworkCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="作业标题")
    description: Optional[str] = Field(None, max_length=2000, description="作业描述")
    due_date: datetime = Field(..., description="截止日期")
    subject: str = Field("other", description="科目")
    class_id: str = Field(..., description="班级ID")

class HomeworkResponse(BaseModel):
    id: str = Field(..., description="作业ID")
    title: str = Field(..., description="作业标题")
    description: Optional[str] = Field(None, description="作业描述")
    due_date: datetime = Field(..., description="截止日期")
    subject: str = Field(..., description="科目")
    class_id: str = Field(..., description="班级ID")
    teacher_id: str = Field(..., description="教师ID")
    created_at: datetime = Field(..., description="创建时间")

class SubmissionCreate(BaseModel):
    homework_id: str = Field(..., description="作业ID")
    content: Optional[str] = Field(None, description="提交内容")
    file_url: Optional[str] = Field(None, description="文件URL")

class SubmissionResponse(BaseModel):
    id: str = Field(..., description="提交ID")
    homework_id: str = Field(..., description="作业ID")
    student_id: str = Field(..., description="学生ID")
    content: Optional[str] = Field(None, description="提交内容")
    file_url: Optional[str] = Field(None, description="文件URL")
    status: str = Field(..., description="状态")
    grade: Optional[int] = Field(None, description="分数")
    feedback: Optional[str] = Field(None, description="教师反馈")
    ai_feedback: Optional[str] = Field(None, description="AI反馈")
    submitted_at: datetime = Field(..., description="提交时间")