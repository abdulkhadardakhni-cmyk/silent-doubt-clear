from pydantic import BaseModel, Field
from typing import List, Optional

# Classroom schemas
class ClassroomCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    subject: str = Field(..., min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=3, max_length=20)
    teacher_pin: Optional[str] = Field("1234", min_length=4, max_length=20)

class ClassroomResponse(BaseModel):
    id: int
    code: str
    name: str
    subject: str
    created_at: str

# Lecture schemas
class LectureCreate(BaseModel):
    classroom_id: int
    title: str = Field(..., min_length=2, max_length=150)
    lecture_number: Optional[int] = None

class LectureResponse(BaseModel):
    id: int
    classroom_id: int
    title: str
    lecture_number: int
    is_active: bool
    created_at: str

# Doubt schemas
class DoubtSubmit(BaseModel):
    lecture_id: int
    text: str = Field(..., min_length=5, max_length=300)
    student_hash: str = Field(..., min_length=8, max_length=64)

class DoubtUpvote(BaseModel):
    doubt_id: int
    student_hash: str = Field(..., min_length=8, max_length=64)

class DoubtItem(BaseModel):
    id: int
    text: str
    upvotes_count: int
    created_at: str
    has_upvoted: Optional[bool] = False

# Confusion Group schemas
class ConfusionGroupResponse(BaseModel):
    id: int
    lecture_id: int
    topic_label: str
    summary: str
    is_explained: bool
    explained_at: Optional[str] = None
    doubts_count: int
    total_upvotes: int
    total_students_affected: int  # doubts_count + total_upvotes
    representative_doubts: List[DoubtItem]
    created_at: str
    updated_at: str
    rank: Optional[int] = None

class GroupingResult(BaseModel):
    assigned_group_id: int
    is_new_group: bool
    topic_label: str
    similarity_score: float
    engine_used: str
    is_fallback: bool

# Explanation schemas
class ExplanationGenerateRequest(BaseModel):
    confusion_group_id: int
    teacher_prompt_override: Optional[str] = None

class ExplanationUpdateRequest(BaseModel):
    explanation_text: str
    analogy: Optional[str] = ""
    example: Optional[str] = ""
    step_by_step: Optional[str] = ""
    is_approved: Optional[bool] = None

class ExplanationResponse(BaseModel):
    id: int
    confusion_group_id: int
    topic_label: str
    explanation_text: str
    analogy: str
    example: str
    step_by_step: str
    is_ai_generated: bool
    edited_by_teacher: bool
    engine_used: str
    is_approved: bool = False
    approved_at: Optional[str] = None
    created_at: str
    updated_at: str

class ApprovalToggleRequest(BaseModel):
    is_approved: Optional[bool] = True

class ApprovedAnswerResponse(BaseModel):
    id: int
    confusion_group_id: int
    lecture_id: int
    lecture_title: Optional[str] = None
    topic: str
    explanation: str
    analogy: Optional[str] = ""
    example: Optional[str] = ""
    step_by_step: Optional[str] = ""
    approved_at: Optional[str] = None
    is_approved: bool = True
    edited_by_teacher: bool = False
    students_affected: Optional[int] = 0

# Teacher verification
class TeacherAuth(BaseModel):
    pin: str
    class_code: Optional[str] = None

# Lecture history overview
class LectureHistorySummary(BaseModel):
    id: int
    title: str
    lecture_number: int
    created_at: str
    total_doubts: int
    total_upvotes: int
    total_groups: int
    top_confusion_topic: Optional[str] = "None"
    top_confusion_count: Optional[int] = 0
