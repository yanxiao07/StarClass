from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.agents.tools.mcp_base import MCPTool
from app.models.homework import Homework
from app.models.submission import Submission

class HomeworkTool(MCPTool):
    name = "homework_tool"
    description = "作业相关操作，包括获取作业详情、查看学生提交等。"
    
    def __init__(self, db: Session):
        self.db = db
    
    async def execute(self, action: str, homework_id: str = None, student_id: str = None) -> Dict[str, Any]:
        if action == "get_homework":
            homework = self.db.query(Homework).filter(Homework.id == homework_id).first()
            if homework:
                return {
                    "success": True,
                    "homework": {
                        "id": homework.id,
                        "title": homework.title,
                        "description": homework.description,
                        "subject": homework.subject,
                        "due_date": homework.due_date.isoformat() if homework.due_date else None,
                    },
                }
            return {"success": False, "error": "作业不存在"}
        
        elif action == "get_submissions":
            submissions = self.db.query(Submission).filter(Submission.homework_id == homework_id).all()
            return {
                "success": True,
                "submissions": [
                    {
                        "id": sub.id,
                        "student_id": sub.student_id,
                        "content": sub.content,
                        "status": sub.status,
                        "grade": sub.grade,
                    }
                    for sub in submissions
                ],
            }
        
        elif action == "get_student_submission":
            submission = self.db.query(Submission).filter(
                Submission.homework_id == homework_id,
                Submission.student_id == student_id,
            ).first()
            if submission:
                return {
                    "success": True,
                    "submission": {
                        "id": submission.id,
                        "content": submission.content,
                        "status": submission.status,
                        "grade": submission.grade,
                        "feedback": submission.feedback,
                    },
                }
            return {"success": False, "error": "提交不存在"}
        
        return {"success": False, "error": f"未知操作: {action}"}