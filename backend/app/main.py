import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from app.database import get_db, init_db
from app.schemas import (
    ClassroomCreate, ClassroomResponse,
    LectureCreate, LectureResponse,
    DoubtSubmit, DoubtUpvote, DoubtItem,
    ConfusionGroupResponse, GroupingResult,
    ExplanationGenerateRequest, ExplanationUpdateRequest, ExplanationResponse,
    TeacherAuth, LectureHistorySummary
)
from app.ai_grouping import group_new_doubt, get_sentence_transformer, USE_SENTENCE_TRANSFORMERS
from app.ai_explanation import get_or_generate_explanation
from app.websocket_manager import ws_manager
from app.demo_seed import seed_demo_data

# Simple in-memory rate limiter per student_hash
RATE_LIMIT_CACHE: Dict[str, float] = {}
RATE_LIMIT_SECONDS = 3.0

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables and seed demo data
    print("[Startup] Initializing SQLite database...")
    init_db()
    print("[Startup] Seeding demonstration classroom CS101...")
    seed_demo_data(force=False)
    # Warm up sentence transformers in background if enabled
    if USE_SENTENCE_TRANSFORMERS:
        try:
            get_sentence_transformer()
        except Exception as e:
            print(f"[Startup] Sentence transformer warmup note: {e}")
    yield
    print("[Shutdown] Cleaning up...")

app = FastAPI(
    title="Silent Doubt Wall API",
    description="Anonymous Classroom Confusion Tracker with AI Grouping and Re-Explanation",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# Health and System Info
# -------------------------------------------------------------
@app.get("/api/health")
def health_check():
    st_available = get_sentence_transformer() is not None
    return {
        "status": "healthy",
        "service": "Silent Doubt Wall API",
        "version": "1.0.0",
        "ai_engine": {
            "sentence_transformers_active": st_available,
            "hybrid_concept_fallback_ready": True,
            "llm_reexplanation_configured": bool(get_or_generate_explanation)
        }
    }

# -------------------------------------------------------------
# Classroom Endpoints
# -------------------------------------------------------------
@app.post("/api/classrooms", response_model=ClassroomResponse)
def create_classroom(payload: ClassroomCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        code = (payload.code or f"CLS{int(time.time()) % 100000}").upper().strip()
        try:
            cursor.execute("""
                INSERT INTO classrooms (code, name, subject, teacher_pin)
                VALUES (?, ?, ?, ?);
            """, (code, payload.name.strip(), payload.subject.strip(), payload.teacher_pin))
            class_id = cursor.lastrowid
            cursor.execute("SELECT id, code, name, subject, created_at FROM classrooms WHERE id = ?;", (class_id,))
            row = cursor.fetchone()
            return dict(row)
        except Exception as e:
            if "UNIQUE" in str(e):
                raise HTTPException(status_code=400, detail="Classroom code already in use.")
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/classrooms/{code}")
def get_classroom_by_code(code: str):
    code_clean = code.upper().strip()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, code, name, subject, created_at FROM classrooms WHERE UPPER(code) = ?;", (code_clean,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Classroom not found. Please check class code.")
        
        # Get active lecture if any
        cursor.execute("""
            SELECT id, title, lecture_number, is_active, created_at 
            FROM lectures 
            WHERE classroom_id = ? AND is_active = 1 
            ORDER BY id DESC LIMIT 1;
        """, (row["id"],))
        active_lec = cursor.fetchone()
        
        return {
            "classroom": dict(row),
            "active_lecture": dict(active_lec) if active_lec else None
        }

@app.post("/api/classrooms/verify-pin")
def verify_teacher_pin(auth: TeacherAuth):
    with get_db() as conn:
        cursor = conn.cursor()
        if auth.class_code:
            cursor.execute("SELECT teacher_pin FROM classrooms WHERE UPPER(code) = ?;", (auth.class_code.upper().strip(),))
            row = cursor.fetchone()
            if row and row["teacher_pin"] == auth.pin:
                return {"valid": True, "role": "teacher"}
        
        # Check master default PIN
        if auth.pin in ["1234", "admin123"]:
            return {"valid": True, "role": "teacher"}
            
        raise HTTPException(status_code=401, detail="Invalid teacher PIN.")

# -------------------------------------------------------------
# Lecture Endpoints
# -------------------------------------------------------------
@app.get("/api/classrooms/{code}/lectures")
def list_lectures_for_classroom(code: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM classrooms WHERE UPPER(code) = ?;", (code.upper().strip(),))
        c_row = cursor.fetchone()
        if not c_row:
            raise HTTPException(status_code=404, detail="Classroom not found.")
        
        cursor.execute("""
            SELECT l.id, l.title, l.lecture_number, l.is_active, l.created_at,
                   COUNT(DISTINCT d.id) as total_doubts,
                   COALESCE(SUM(d.upvotes_count), 0) as total_upvotes,
                   COUNT(DISTINCT cg.id) as total_groups
            FROM lectures l
            LEFT JOIN confusion_groups cg ON cg.lecture_id = l.id
            LEFT JOIN doubts d ON d.lecture_id = l.id
            WHERE l.classroom_id = ?
            GROUP BY l.id
            ORDER BY l.lecture_number DESC;
        """, (c_row["id"],))
        
        lectures = [dict(r) for r in cursor.fetchall()]
        return lectures

@app.post("/api/lectures", response_model=LectureResponse)
async def create_lecture(payload: LectureCreate):
    with get_db() as conn:
        cursor = conn.cursor()
        # Find next lecture number if not specified
        if not payload.lecture_number:
            cursor.execute("SELECT MAX(lecture_number) as max_num FROM lectures WHERE classroom_id = ?;", (payload.classroom_id,))
            max_num = cursor.fetchone()["max_num"] or 0
            lec_num = max_num + 1
        else:
            lec_num = payload.lecture_number

        # Set any previously active lecture to inactive
        cursor.execute("UPDATE lectures SET is_active = 0 WHERE classroom_id = ?;", (payload.classroom_id,))

        cursor.execute("""
            INSERT INTO lectures (classroom_id, title, lecture_number, is_active)
            VALUES (?, ?, ?, 1);
        """, (payload.classroom_id, payload.title.strip(), lec_num))
        new_id = cursor.lastrowid
        
        cursor.execute("SELECT id, classroom_id, title, lecture_number, is_active, created_at FROM lectures WHERE id = ?;", (new_id,))
        new_lec = dict(cursor.fetchone())
        return new_lec

@app.put("/api/lectures/{lecture_id}/activate")
async def activate_lecture(lecture_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT classroom_id FROM lectures WHERE id = ?;", (lecture_id,))
        lec = cursor.fetchone()
        if not lec:
            raise HTTPException(status_code=404, detail="Lecture not found.")
        
        cursor.execute("UPDATE lectures SET is_active = 0 WHERE classroom_id = ?;", (lec["classroom_id"],))
        cursor.execute("UPDATE lectures SET is_active = 1 WHERE id = ?;", (lecture_id,))
        
        return {"status": "success", "active_lecture_id": lecture_id}

# -------------------------------------------------------------
# Confusion Groups & Ranked Top 3 Endpoints
# -------------------------------------------------------------
@app.get("/api/lectures/{lecture_id}/confusion-groups")
def get_confusion_groups_for_lecture(
    lecture_id: int,
    student_hash: Optional[str] = Query(None)
):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Get all confusion groups for this lecture
        cursor.execute("""
            SELECT id, lecture_id, topic_label, summary, is_explained, explained_at, created_at, updated_at
            FROM confusion_groups
            WHERE lecture_id = ?;
        """, (lecture_id,))
        groups_raw = cursor.fetchall()
        
        result = []
        for g in groups_raw:
            g_dict = dict(g)
            g_id = g_dict["id"]
            
            # Fetch doubts inside this group
            cursor.execute("""
                SELECT id, text, upvotes_count, created_at
                FROM doubts
                WHERE confusion_group_id = ?
                ORDER BY upvotes_count DESC, id ASC;
            """, (g_id,))
            doubts = [dict(d) for d in cursor.fetchall()]
            
            # If student_hash provided, check which doubts this student upvoted
            if student_hash:
                for d in doubts:
                    cursor.execute("""
                        SELECT 1 FROM doubt_votes WHERE doubt_id = ? AND student_hash = ?;
                    """, (d["id"], student_hash))
                    d["has_upvoted"] = bool(cursor.fetchone())
            else:
                for d in doubts:
                    d["has_upvoted"] = False

            doubts_count = len(doubts)
            total_upvotes = sum(d["upvotes_count"] for d in doubts)
            total_affected = doubts_count + total_upvotes

            # Representative doubts: top 3 doubts in this group
            g_dict["doubts_count"] = doubts_count
            g_dict["total_upvotes"] = total_upvotes
            g_dict["total_students_affected"] = total_affected
            g_dict["representative_doubts"] = doubts
            
            result.append(g_dict)

        # Rank groups by total_students_affected descending (unexplained first, then explained)
        result.sort(key=lambda x: (not x["is_explained"], x["total_students_affected"], x["doubts_count"]), reverse=True)
        
        # Assign rank 1, 2, 3...
        for idx, item in enumerate(result, 1):
            item["rank"] = idx

        return result

# -------------------------------------------------------------
# Doubt Submission & AI Grouping Integration
# -------------------------------------------------------------
@app.post("/api/doubts")
async def submit_doubt(payload: DoubtSubmit):
    # 1. Rate Limiting check
    now = time.time()
    last_time = RATE_LIMIT_CACHE.get(payload.student_hash, 0)
    if (now - last_time) < RATE_LIMIT_SECONDS:
        raise HTTPException(
            status_code=429,
            detail=f"Please pause for {int(RATE_LIMIT_SECONDS - (now - last_time)) + 1} second(s) before submitting another doubt."
        )
    RATE_LIMIT_CACHE[payload.student_hash] = now

    doubt_clean = payload.text.strip()
    if len(doubt_clean) < 5:
        raise HTTPException(status_code=400, detail="Doubt must be at least 5 characters.")

    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify lecture exists
        cursor.execute("SELECT id, is_active FROM lectures WHERE id = ?;", (payload.lecture_id,))
        lec = cursor.fetchone()
        if not lec:
            raise HTTPException(status_code=404, detail="Lecture not found.")

        # 2. Fetch existing confusion groups and their doubts for semantic similarity comparison
        cursor.execute("""
            SELECT id, topic_label, summary 
            FROM confusion_groups 
            WHERE lecture_id = ?;
        """, (payload.lecture_id,))
        existing_groups_rows = cursor.fetchall()

        existing_groups = []
        for grp_row in existing_groups_rows:
            g_dict = dict(grp_row)
            cursor.execute("SELECT text FROM doubts WHERE confusion_group_id = ?;", (g_dict["id"],))
            g_dict["doubt_texts"] = [row["text"] for row in cursor.fetchall()]
            existing_groups.append(g_dict)

        # 3. AI Semantic Grouping
        group_match = group_new_doubt(doubt_clean, existing_groups)
        
        target_group_id = group_match["assigned_group_id"]
        is_new_group = group_match["is_new_group"]
        topic_label = group_match["topic_label"]
        summary = group_match["summary"]

        if is_new_group or target_group_id is None:
            # Create a brand new confusion group
            cursor.execute("""
                INSERT INTO confusion_groups (lecture_id, topic_label, summary)
                VALUES (?, ?, ?);
            """, (payload.lecture_id, topic_label, summary))
            target_group_id = cursor.lastrowid
        else:
            # Update timestamp of existing group
            cursor.execute("""
                UPDATE confusion_groups 
                SET updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?;
            """, (target_group_id,))

        # 4. Save anonymous doubt
        cursor.execute("""
            INSERT INTO doubts (lecture_id, confusion_group_id, text, upvotes_count, student_hash)
            VALUES (?, ?, ?, 0, ?);
        """, (payload.lecture_id, target_group_id, doubt_clean, payload.student_hash))
        doubt_id = cursor.lastrowid

        # Auto-vote by author (or record author so author doesn't self-upvote)
        cursor.execute("""
            INSERT OR IGNORE INTO doubt_votes (doubt_id, student_hash)
            VALUES (?, ?);
        """, (doubt_id, payload.student_hash))

    # 5. Broadcast real-time WebSocket event
    event_payload = {
        "type": "NEW_DOUBT",
        "lecture_id": payload.lecture_id,
        "doubt": {
            "id": doubt_id,
            "text": doubt_clean,
            "upvotes_count": 0,
            "group_id": target_group_id,
            "topic_label": topic_label
        },
        "grouping": {
            "is_new_group": is_new_group,
            "assigned_group_id": target_group_id,
            "topic_label": topic_label,
            "similarity_score": group_match["similarity_score"],
            "engine_used": group_match["engine_used"],
            "is_fallback": group_match["is_fallback"]
        }
    }
    await ws_manager.broadcast_to_lecture(payload.lecture_id, event_payload)

    return {
        "status": "success",
        "doubt_id": doubt_id,
        "confusion_group_id": target_group_id,
        "is_new_group": is_new_group,
        "topic_label": topic_label,
        "similarity_score": group_match["similarity_score"],
        "engine_used": group_match["engine_used"],
        "is_fallback": group_match["is_fallback"]
    }

# -------------------------------------------------------------
# Me Too Upvote Endpoint (With Duplicate Protection)
# -------------------------------------------------------------
@app.post("/api/doubts/upvote")
async def upvote_doubt(payload: DoubtUpvote):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, lecture_id, confusion_group_id, upvotes_count FROM doubts WHERE id = ?;", (payload.doubt_id,))
        doubt = cursor.fetchone()
        if not doubt:
            raise HTTPException(status_code=404, detail="Doubt not found.")

        # Check duplicate upvote
        cursor.execute("SELECT id FROM doubt_votes WHERE doubt_id = ? AND student_hash = ?;", (payload.doubt_id, payload.student_hash))
        existing_vote = cursor.fetchone()
        
        if existing_vote:
            raise HTTPException(status_code=400, detail="You have already upvoted ('Me Too') this doubt!")

        # Record vote
        cursor.execute("""
            INSERT INTO doubt_votes (doubt_id, student_hash)
            VALUES (?, ?);
        """, (payload.doubt_id, payload.student_hash))
        
        # Increment counter
        cursor.execute("""
            UPDATE doubts SET upvotes_count = upvotes_count + 1 WHERE id = ?;
        """, (payload.doubt_id,))

        cursor.execute("SELECT upvotes_count FROM doubts WHERE id = ?;", (payload.doubt_id,))
        new_count = cursor.fetchone()["upvotes_count"]

    # Broadcast update
    await ws_manager.broadcast_to_lecture(doubt["lecture_id"], {
        "type": "UPVOTE",
        "lecture_id": doubt["lecture_id"],
        "doubt_id": payload.doubt_id,
        "confusion_group_id": doubt["confusion_group_id"],
        "new_upvotes_count": new_count
    })

    return {
        "status": "success",
        "doubt_id": payload.doubt_id,
        "upvotes_count": new_count
    }

# -------------------------------------------------------------
# Mark as Explained Endpoint
# -------------------------------------------------------------
@app.put("/api/confusion-groups/{group_id}/mark-explained")
async def toggle_mark_explained(group_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, lecture_id, is_explained FROM confusion_groups WHERE id = ?;", (group_id,))
        grp = cursor.fetchone()
        if not grp:
            raise HTTPException(status_code=404, detail="Confusion group not found.")

        new_status = 0 if grp["is_explained"] else 1
        explained_at = "CURRENT_TIMESTAMP" if new_status == 1 else "NULL"
        
        cursor.execute(f"""
            UPDATE confusion_groups
            SET is_explained = ?, explained_at = {explained_at}
            WHERE id = ?;
        """, (new_status, group_id))

    # Broadcast event
    await ws_manager.broadcast_to_lecture(grp["lecture_id"], {
        "type": "EXPLAINED_TOGGLE",
        "lecture_id": grp["lecture_id"],
        "confusion_group_id": group_id,
        "is_explained": bool(new_status)
    })

    return {
        "status": "success",
        "confusion_group_id": group_id,
        "is_explained": bool(new_status)
    }

# -------------------------------------------------------------
# AI Re-Explanation Endpoints
# -------------------------------------------------------------
@app.get("/api/confusion-groups/{group_id}/explanation")
def get_explanation(group_id: int):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT e.*, cg.topic_label 
            FROM ai_explanations e
            JOIN confusion_groups cg ON cg.id = e.confusion_group_id
            WHERE e.confusion_group_id = ?;
        """, (group_id,))
        row = cursor.fetchone()
        if not row:
            # Check if group exists to return empty state
            cursor.execute("SELECT id, topic_label FROM confusion_groups WHERE id = ?;", (group_id,))
            grp = cursor.fetchone()
            if not grp:
                raise HTTPException(status_code=404, detail="Confusion group not found.")
            return {"exists": False, "topic_label": grp["topic_label"]}
        
        return {"exists": True, "explanation": dict(row)}

@app.post("/api/confusion-groups/{group_id}/generate-explanation")
async def generate_explanation(group_id: int, payload: Optional[ExplanationGenerateRequest] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, topic_label, summary FROM confusion_groups WHERE id = ?;", (group_id,))
        grp = cursor.fetchone()
        if not grp:
            raise HTTPException(status_code=404, detail="Confusion group not found.")

        cursor.execute("SELECT text FROM doubts WHERE confusion_group_id = ?;", (group_id,))
        doubts = [r["text"] for r in cursor.fetchall()]

    teacher_note = payload.teacher_prompt_override if payload else None
    
    # Generate re-explanation
    exp_data = await get_or_generate_explanation(grp["topic_label"], doubts, teacher_note)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ai_explanations (
                confusion_group_id, explanation_text, analogy, example, step_by_step,
                is_ai_generated, edited_by_teacher, engine_used
            )
            VALUES (?, ?, ?, ?, ?, 1, 0, ?)
            ON CONFLICT(confusion_group_id) DO UPDATE SET
                explanation_text = excluded.explanation_text,
                analogy = excluded.analogy,
                example = excluded.example,
                step_by_step = excluded.step_by_step,
                is_ai_generated = 1,
                edited_by_teacher = 0,
                engine_used = excluded.engine_used,
                updated_at = CURRENT_TIMESTAMP;
        """, (
            group_id,
            exp_data["explanation_text"],
            exp_data["analogy"],
            exp_data["example"],
            exp_data["step_by_step"],
            exp_data["engine_used"]
        ))
        
        cursor.execute("SELECT * FROM ai_explanations WHERE confusion_group_id = ?;", (group_id,))
        saved = dict(cursor.fetchone())
        saved["topic_label"] = grp["topic_label"]

    return saved

@app.put("/api/confusion-groups/{group_id}/explanation")
def update_explanation(group_id: int, payload: ExplanationUpdateRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM ai_explanations WHERE confusion_group_id = ?;", (group_id,))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("""
                UPDATE ai_explanations
                SET explanation_text = ?,
                    analogy = ?,
                    example = ?,
                    step_by_step = ?,
                    edited_by_teacher = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE confusion_group_id = ?;
            """, (payload.explanation_text, payload.analogy or "", payload.example or "", payload.step_by_step or "", group_id))
        else:
            cursor.execute("""
                INSERT INTO ai_explanations (
                    confusion_group_id, explanation_text, analogy, example, step_by_step,
                    is_ai_generated, edited_by_teacher, engine_used
                )
                VALUES (?, ?, ?, ?, ?, 0, 1, 'Teacher Authored');
            """, (group_id, payload.explanation_text, payload.analogy or "", payload.example or "", payload.step_by_step or ""))
            
        cursor.execute("SELECT * FROM ai_explanations WHERE confusion_group_id = ?;", (group_id,))
        return dict(cursor.fetchone())

# -------------------------------------------------------------
# Analytics and Lecture-wise History
# -------------------------------------------------------------
@app.get("/api/classrooms/{code}/analytics")
def get_classroom_analytics(code: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, subject FROM classrooms WHERE UPPER(code) = ?;", (code.upper().strip(),))
        c_row = cursor.fetchone()
        if not c_row:
            raise HTTPException(status_code=404, detail="Classroom not found.")

        c_id = c_row["id"]
        
        # 1. Lecture-wise progression
        cursor.execute("""
            SELECT l.id, l.title, l.lecture_number, l.is_active, l.created_at,
                   COUNT(DISTINCT d.id) as total_doubts,
                   COALESCE(SUM(d.upvotes_count), 0) as total_upvotes,
                   COUNT(DISTINCT cg.id) as total_groups
            FROM lectures l
            LEFT JOIN confusion_groups cg ON cg.lecture_id = l.id
            LEFT JOIN doubts d ON d.lecture_id = l.id
            WHERE l.classroom_id = ?
            GROUP BY l.id
            ORDER BY l.lecture_number ASC;
        """, (c_id,))
        lecture_stats = [dict(r) for r in cursor.fetchall()]

        # For each lecture, identify the top confusion topic
        for stat in lecture_stats:
            cursor.execute("""
                SELECT cg.topic_label, COUNT(d.id) + COALESCE(SUM(d.upvotes_count), 0) as impact
                FROM confusion_groups cg
                LEFT JOIN doubts d ON d.confusion_group_id = cg.id
                WHERE cg.lecture_id = ?
                GROUP BY cg.id
                ORDER BY impact DESC LIMIT 1;
            """, (stat["id"],))
            top_g = cursor.fetchone()
            stat["top_confusion_topic"] = top_g["topic_label"] if top_g else "None"
            stat["top_confusion_count"] = top_g["impact"] if top_g else 0

        # 2. Overall Most Confusing Topics across the classroom
        cursor.execute("""
            SELECT cg.topic_label, 
                   COUNT(d.id) as doubts_count,
                   COALESCE(SUM(d.upvotes_count), 0) as upvotes_count,
                   (COUNT(d.id) + COALESCE(SUM(d.upvotes_count), 0)) as total_affected,
                   cg.is_explained
            FROM confusion_groups cg
            JOIN lectures l ON l.id = cg.lecture_id
            LEFT JOIN doubts d ON d.confusion_group_id = cg.id
            WHERE l.classroom_id = ?
            GROUP BY cg.topic_label
            ORDER BY total_affected DESC
            LIMIT 6;
        """, (c_id,))
        top_overall_topics = [dict(r) for r in cursor.fetchall()]

        # 3. Overall Totals
        total_doubts = sum(s["total_doubts"] for s in lecture_stats)
        total_upvotes = sum(s["total_upvotes"] for s in lecture_stats)
        total_groups = sum(s["total_groups"] for s in lecture_stats)

        return {
            "classroom": dict(c_row),
            "lecture_history": lecture_stats,
            "top_overall_topics": top_overall_topics,
            "totals": {
                "total_doubts": total_doubts,
                "total_upvotes": total_upvotes,
                "total_groups": total_groups,
                "total_lectures": len(lecture_stats)
            }
        }

# -------------------------------------------------------------
# Demo Reset Endpoint
# -------------------------------------------------------------
@app.post("/api/demo/reset")
def reset_demo():
    """Reset the demo classroom CS101 with pre-populated top confusion points."""
    seed_demo_data(force=True)
    return {"status": "success", "message": "Demonstration classroom CS101 reset successfully."}

# -------------------------------------------------------------
# WebSocket Real-Time Endpoint
# -------------------------------------------------------------
@app.websocket("/ws/lectures/{lecture_id}")
async def websocket_lecture_endpoint(websocket: WebSocket, lecture_id: int):
    await ws_manager.connect(websocket, lecture_id)
    try:
        while True:
            # Keep socket alive and accept ping/pong or client messages
            data = await websocket.receive_text()
            # Echo heartbeat or client actions
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, lecture_id)
    except Exception as e:
        ws_manager.disconnect(websocket, lecture_id)
