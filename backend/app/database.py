import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager

# Path to database file
DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "silent_doubt_wall.db"

def get_connection():
    """Create and configure a thread-safe connection with Row factory and WAL mode."""
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@contextmanager
def get_db():
    """Context manager for database transactions."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initialize database tables with indexes."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Classrooms
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS classrooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            teacher_pin TEXT NOT NULL DEFAULT '1234',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. Lectures
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS lectures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            lecture_number INTEGER NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 3. Confusion Groups (The core aggregated AI clusters)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS confusion_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
            topic_label TEXT NOT NULL,
            summary TEXT DEFAULT '',
            is_explained INTEGER NOT NULL DEFAULT 0,
            explained_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 4. Anonymous Doubts
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS doubts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lecture_id INTEGER NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
            confusion_group_id INTEGER NOT NULL REFERENCES confusion_groups(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            upvotes_count INTEGER NOT NULL DEFAULT 0,
            student_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 5. Doubt Votes (Me Too duplicate protection)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS doubt_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doubt_id INTEGER NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,
            student_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(doubt_id, student_hash)
        );
        """)

        # 6. AI Re-Explanations
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_explanations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            confusion_group_id INTEGER UNIQUE NOT NULL REFERENCES confusion_groups(id) ON DELETE CASCADE,
            explanation_text TEXT NOT NULL,
            analogy TEXT DEFAULT '',
            example TEXT DEFAULT '',
            step_by_step TEXT DEFAULT '',
            is_ai_generated INTEGER DEFAULT 1,
            edited_by_teacher INTEGER DEFAULT 0,
            engine_used TEXT DEFAULT '',
            is_approved INTEGER DEFAULT 0,
            approved_at TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Migration check: Ensure is_approved and approved_at exist in existing databases
        cursor.execute("PRAGMA table_info(ai_explanations);")
        existing_cols = [col["name"] for col in cursor.fetchall()]
        if "is_approved" not in existing_cols:
            cursor.execute("ALTER TABLE ai_explanations ADD COLUMN is_approved INTEGER DEFAULT 0;")
        if "approved_at" not in existing_cols:
            cursor.execute("ALTER TABLE ai_explanations ADD COLUMN approved_at TIMESTAMP DEFAULT NULL;")

        # Indexes for fast querying
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_class_code ON classrooms(code);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lectures_class ON lectures(classroom_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_groups_lecture ON confusion_groups(lecture_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doubts_group ON doubts(confusion_group_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doubts_lecture ON doubts(lecture_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_votes_doubt_student ON doubt_votes(doubt_id, student_hash);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_approved_explanations ON ai_explanations(is_approved);")
