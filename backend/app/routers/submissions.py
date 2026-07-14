from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.submission import Submission
from app.models.homework import Homework
from app.schemas.homework import SubmissionCreate, SubmissionResponse, GradeSubmission

router = APIRouter()


def format_submission(sub: Submission, db: Session) -> dict:
    """格式化提交数据为camelCase，包含嵌套对象"""
    student = db.query(User).filter(User.id == sub.student_id).first()
    homework = db.query(Homework).filter(Homework.id == sub.homework_id).first()

    return {
        "id": sub.id,
        "homeworkId": sub.homework_id,
        "studentId": sub.student_id,
        "content": sub.content or "",
        "fileUrl": sub.file_url or "",
        "fileName": "",
        "status": sub.status or "submitted",
        "grade": sub.grade,
        "feedback": sub.feedback or "",
        "aiFeedback": sub.ai_feedback or "",
        "submittedAt": sub.submitted_at.isoformat() if sub.submitted_at else "",
        "gradedAt": sub.graded_at.isoformat() if sub.graded_at else "",
        "student": {
            "id": student.id,
            "name": student.name or student.nickname or "",
            "email": student.email,
        } if student else None,
        "homework": {
            "id": homework.id,
            "title": homework.title,
        } if homework else None,
    }


@router.get("", response_model=list[SubmissionResponse])
async def get_submissions(
    homeworkId: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Submission)

    if user.role == "teacher":
        query = query.join(Homework).filter(Homework.teacher_id == user.id)
    else:
        query = query.filter(Submission.student_id == user.id)

    if homeworkId:
        query = query.filter(Submission.homework_id == homeworkId)

    submissions = query.all()
    return [format_submission(sub, db) for sub in submissions]


@router.post("", response_model=SubmissionResponse)
async def create_submission(
    request: SubmissionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="只有学生可以提交作业")

    hw_id = request.homeworkId or request.homework_id
    if not hw_id:
        raise HTTPException(status_code=422, detail="作业ID不能为空")

    homework = db.query(Homework).filter(Homework.id == hw_id).first()
    if not homework:
        raise HTTPException(status_code=404, detail="作业不存在")

    existing_submission = db.query(Submission).filter(
        Submission.homework_id == hw_id,
        Submission.student_id == user.id,
    ).first()

    file_url = request.fileUrl or request.file_url or None

    if existing_submission:
        existing_submission.content = request.content
        existing_submission.file_url = file_url
        existing_submission.status = "submitted"
        existing_submission.submitted_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_submission)
        submission = existing_submission
    else:
        submission = Submission(
            id=str(uuid.uuid4()),
            homework_id=hw_id,
            student_id=user.id,
            content=request.content,
            file_url=file_url,
            status="submitted",
            submitted_at=datetime.utcnow(),
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)

    return format_submission(submission, db)


@router.put("/{sub_id}/grade", response_model=SubmissionResponse)
async def grade_submission(
    sub_id: str,
    request: GradeSubmission,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以评分")

    submission = db.query(Submission).filter(Submission.id == sub_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="提交不存在")

    submission.grade = request.grade
    submission.feedback = request.feedback
    submission.status = "graded"
    submission.graded_at = datetime.utcnow()
    db.commit()
    db.refresh(submission)

    return format_submission(submission, db)


@router.post("/{sub_id}/ai-grade")
async def ai_grade_submission(
    sub_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以使用AI批改")

    submission = db.query(Submission).filter(Submission.id == sub_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="提交不存在")

    homework = db.query(Homework).filter(Homework.id == submission.homework_id).first()
    if not homework:
        raise HTTPException(status_code=404, detail="作业不存在")

    try:
        from app.agents.orchestrator import AgentOrchestrator
        orchestrator = AgentOrchestrator(db=db)
        result = await orchestrator.grade_submission_with_ai(submission, homework)

        submission.ai_feedback = result.get("feedback", "")
        submission.grade = result.get("grade")
        submission.status = "graded"
        submission.graded_at = datetime.utcnow()
        db.commit()
        db.refresh(submission)

        return {
            "message": "AI批改完成",
            "grade": submission.grade,
            "feedback": submission.ai_feedback,
        }
    except Exception as e:
        return {"message": f"AI批改失败: {str(e)}", "grade": None, "feedback": None}
