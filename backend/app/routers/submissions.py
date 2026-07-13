from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.submission import Submission
from app.models.homework import Homework
from app.schemas.homework import SubmissionCreate, SubmissionResponse
from app.agents.graphs.teaching_assistant import TeachingAssistantGraph

router = APIRouter()

@router.get("", response_model=list[SubmissionResponse])
async def get_submissions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "teacher":
        submissions = db.query(Submission).join(Homework).filter(Homework.teacher_id == user.id).all()
    else:
        submissions = db.query(Submission).filter(Submission.student_id == user.id).all()
    
    return [SubmissionResponse(
        id=sub.id,
        homework_id=sub.homework_id,
        student_id=sub.student_id,
        content=sub.content,
        file_url=sub.file_url,
        status=sub.status,
        grade=sub.grade,
        feedback=sub.feedback,
        ai_feedback=sub.ai_feedback,
        submitted_at=sub.submitted_at,
    ) for sub in submissions]

@router.post("", response_model=SubmissionResponse)
async def create_submission(
    request: SubmissionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != "student":
        raise HTTPException(status_code=403, detail="只有学生可以提交作业")
    
    homework = db.query(Homework).filter(Homework.id == request.homework_id).first()
    if not homework:
        raise HTTPException(status_code=404, detail="作业不存在")
    
    existing_submission = db.query(Submission).filter(
        Submission.homework_id == request.homework_id,
        Submission.student_id == user.id,
    ).first()
    
    if existing_submission:
        existing_submission.content = request.content
        existing_submission.file_url = request.file_url
        existing_submission.status = "submitted"
        existing_submission.submitted_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_submission)
        submission = existing_submission
    else:
        submission = Submission(
            id=str(uuid.uuid4()),
            homework_id=request.homework_id,
            student_id=user.id,
            content=request.content,
            file_url=request.file_url,
            status="submitted",
            submitted_at=datetime.utcnow(),
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
    
    return SubmissionResponse(
        id=submission.id,
        homework_id=submission.homework_id,
        student_id=submission.student_id,
        content=submission.content,
        file_url=submission.file_url,
        status=submission.status,
        grade=submission.grade,
        feedback=submission.feedback,
        ai_feedback=submission.ai_feedback,
        submitted_at=submission.submitted_at,
    )

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
    
    assistant = TeachingAssistantGraph(db=db)
    result = await assistant.grade_homework(submission, homework)
    
    submission.ai_feedback = result.get("feedback")
    submission.grade = result.get("grade")
    submission.status = "graded"
    submission.graded_at = datetime.utcnow()
    db.commit()
    db.refresh(submission)
    
    return {"message": "AI批改完成", "grade": submission.grade, "feedback": submission.ai_feedback}