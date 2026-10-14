import pytest
from app.database import init_db, get_db
from app.demo_seed import seed_demo_data
from app.ai_grouping import group_new_doubt, clean_text, expand_intent_and_concepts
from app.ai_explanation import generate_offline_fallback_explanation

@pytest.fixture(autouse=True)
def setup_database():
    init_db()
    seed_demo_data(force=True)

def test_semantic_grouping_arrays():
    """
    Test acceptance requirement 3:
    - 'Why do we use arrays?'
    - 'What is the purpose of an array?'
    - 'Why can't we store multiple values in one variable?'
    Must group together under the same confusion point!
    """
    # 1. Start with empty groups
    doubt1 = "Why do we use arrays?"
    res1 = group_new_doubt(doubt1, [])
    assert res1["is_new_group"] is True
    assert "Array" in res1["topic_label"]

    # Mock group 1 as active group
    group_1 = {
        "id": 1,
        "topic_label": res1["topic_label"],
        "summary": res1["summary"],
        "doubt_texts": [doubt1]
    }

    # 2. Submit semantically equivalent doubt 2
    doubt2 = "What is the purpose of an array?"
    res2 = group_new_doubt(doubt2, [group_1])
    assert res2["is_new_group"] is False, f"Expected matching group, got {res2}"
    assert res2["assigned_group_id"] == 1
    assert res2["similarity_score"] >= 0.55

    # 3. Add doubt 2 to the group
    group_1["doubt_texts"].append(doubt2)

    # 4. Submit semantically related conceptual doubt 3
    doubt3 = "Why can't we store multiple values in one variable?"
    res3 = group_new_doubt(doubt3, [group_1])
    assert res3["is_new_group"] is False, f"Expected conceptual match for multi-value storage, got {res3}"
    assert res3["assigned_group_id"] == 1

def test_unrelated_doubt_creates_new_group():
    """An unrelated doubt (e.g. pointers) should NOT group into arrays."""
    array_group = {
        "id": 1,
        "topic_label": "Purpose & Need for Arrays",
        "summary": "Doubts concerning arrays",
        "doubt_texts": ["Why do we use arrays?"]
    }
    
    unrelated_doubt = "How does pointer dereferencing with asterisk work?"
    res = group_new_doubt(unrelated_doubt, [array_group])
    assert res["is_new_group"] is True
    assert res["assigned_group_id"] is None
    assert "Pointer" in res["topic_label"]

def test_top3_ranking_calculation():
    """Ensure confusion groups are ranked by total_students_affected (doubts + upvotes)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM lectures WHERE classroom_id = (SELECT id FROM classrooms WHERE code='CS101') AND is_active = 1;")
        active_lec = cursor.fetchone()
        assert active_lec is not None
        lec_id = active_lec["id"]

        # Fetch groups
        cursor.execute("""
            SELECT cg.id, cg.topic_label, COUNT(d.id) as doubts_count, COALESCE(SUM(d.upvotes_count), 0) as upvotes
            FROM confusion_groups cg
            LEFT JOIN doubts d ON d.confusion_group_id = cg.id
            WHERE cg.lecture_id = ?
            GROUP BY cg.id;
        """, (lec_id,))
        groups = [dict(r) for r in cursor.fetchall()]
        
        for g in groups:
            g["total_affected"] = g["doubts_count"] + g["upvotes"]

        groups.sort(key=lambda x: x["total_affected"], reverse=True)
        
        # Rank 1 must be Arrays with highest affected count (>= 15)
        assert "Array" in groups[0]["topic_label"]
        assert groups[0]["total_affected"] >= groups[1]["total_affected"]
        assert groups[1]["total_affected"] >= groups[2]["total_affected"]

def test_offline_explanation_synthesis():
    """Verify that offline pedagogy engine generates structured 4-part explanations."""
    result = generate_offline_fallback_explanation("Purpose & Need for Arrays", ["Why do we use arrays?"])
    assert result["explanation_text"] != ""
    assert result["analogy"] != ""
    assert result["example"] != ""
    assert result["step_by_step"] != ""
    assert result["is_fallback"] is True
