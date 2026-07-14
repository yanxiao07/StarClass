from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class HomeworkCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="作业标题")
    description: Optional[str] = Field(None, max_length=2000, description="作业描述")
    dueDate: Optional[str] = Field(None, description="截止日期")
    due_date: Optional[datetime] = Field(None, description="截止日期")
    subject: str = Field("other", description="科目")
    className: Optional[str] = Field(None, description="班级名称")
    classId: Optional[str] = Field(None, description="班级ID")
    class_id: Optional[str] = Field(None, description="班级ID")

    model_config = {"populate_by_name": True}

class HomeworkUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    dueDate: Optional[str] = Field(None)
    subject: Optional[str] = Field(None)
    classId: Optional[str] = Field(None)

class HomeworkResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    dueDate: Optional[str] = None
    subject: str = "other"
    className: Optional[str] = None
    classId: Optional[str] = None
    teacherId: Optional[str] = None
    teacherName: Optional[str] = None
    createdAt: Optional[str] = None

class SubmissionCreate(BaseModel):
    homeworkId: str = Field(..., description="作业ID")
    homework_id: Optional[str] = Field(None, description="作业ID")
    content: Optional[str] = Field(None, description="提交内容")
    fileUrl: Optional[str] = Field(None, description="文件URL")
    file_url: Optional[str] = Field(None, description="文件URL")
    fileName: Optional[str] = Field(None, description="文件名")
    imageUrl: Optional[str] = Field(None, description="图片URL")

    model_config = {"populate_by_name": True}

class GradeSubmission(BaseModel):
    grade: int = Field(..., ge=0, le=100)
    feedback: str = Field("", description="教师反馈")
    homeworkCompletion: Optional[int] = None
    accuracy: Optional[int] = None
    participation: Optional[int] = None
    creativity: Optional[int] = None
    teamwork: Optional[int] = None
    improvement: Optional[int] = None

class SubmissionResponse(BaseModel):
    id: str
    homeworkId: str
    studentId: str
    content: Optional[str] = None
    fileUrl: Optional[str] = None
    fileName: Optional[str] = None
    status: str = "submitted"
    grade: Optional[int] = None
    feedback: Optional[str] = None
    aiFeedback: Optional[str] = None
    submittedAt: Optional[str] = None
    gradedAt: Optional[str] = None
    student: Optional[dict] = None
    homework: Optional[dict] = None
