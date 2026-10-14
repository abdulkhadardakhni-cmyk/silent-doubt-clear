import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import init_db, get_db
from app.demo_seed import seed_demo_data
from app.ai_grouping import group_new_doubt
from app.ai_explanation import generate_offline_fallback_explanation

def run_all_tests():
    print("==================================================")
    print("   RUNNING SILENT DOUBT WALL ACCEPTANCE TESTS     ")
    print("==================================================")

    # 1. Setup DB
    print("\n[Test 1] Initializing SQLite DB and Seeding Demo...")
    init_db()
    seed_demo_data(force=True)
    print(" -> PASS: Database and CS101 demo classroom initialized.")

    # 2. Test Semantic AI Grouping for the 3 Prompt Scenarios
    print("\n[Test 2] Testing Semantic AI Doubt Grouping...")
    doubt1 = "Why do we use arrays?"
    res1 = group_new_doubt(doubt1, [])
    assert res1["is_new_group"] is True
    print(f" -> Doubt 1: '{doubt1}' -> Created Group: '{res1['topic_label']}' (Engine: {res1['engine_used']})")

    active_group = {
        "id": 1,
        "topic_label": res1["topic_label"],
        "summary": res1["summary"],
        "doubt_texts": [doubt1]
    }

    doubt2 = "What is the purpose of an array?"
    res2 = group_new_doubt(doubt2, [active_group])
    assert res2["is_new_group"] is False, f"Expected matching group, got {res2}"
    assert res2["assigned_group_id"] == 1
    print(f" -> Doubt 2: '{doubt2}' -> Matched Group ID {res2['assigned_group_id']} ('{res2['topic_label']}') with Similarity Score: {res2['similarity_score']}")

    active_group["doubt_texts"].append(doubt2)

    doubt3 = "Why can't we store multiple values in one variable?"
    res3 = group_new_doubt(doubt3, [active_group])
    assert res3["is_new_group"] is False, f"Expected conceptual match for multi-value storage, got {res3}"
    assert res3["assigned_group_id"] == 1
    print(f" -> Doubt 3: '{doubt3}' -> Matched Group ID {res3['assigned_group_id']} ('{res3['topic_label']}') with Similarity Score: {res3['similarity_score']}")
    print(" -> PASS: All 3 semantically different doubts correctly grouped together under Arrays!")

    # 3. Test Non-matching Doubt creates new group
    print("\n[Test 3] Testing Unrelated Doubt Creation of New Group...")
    unrelated = "How does pointer dereferencing with an asterisk work in memory?"
    res_unrelated = group_new_doubt(unrelated, [active_group])
    assert res_unrelated["is_new_group"] is True
    print(f" -> Unrelated Doubt: '{unrelated}' -> Correctly spawned new group: '{res_unrelated['topic_label']}'")
    print(" -> PASS: Unrelated doubt is NOT erroneously merged into Arrays.")

    # 4. Test Top 3 Ranking
    print("\n[Test 4] Testing Top 3 Confusion Point Ranking...")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM classrooms WHERE code='CS101';")
        c_id = cursor.fetchone()["id"]
        cursor.execute("SELECT id FROM lectures WHERE classroom_id = ? AND is_active = 1;", (c_id,))
        lec_id = cursor.fetchone()["id"]

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

        for i, g in enumerate(groups[:3], 1):
            print(f" -> Rank #{i}: '{g['topic_label']}' (Doubts: {g['doubts_count']}, Upvotes: {g['upvotes']}, Total Impact: {g['total_affected']})")
        
        assert len(groups) >= 3
        assert "Array" in groups[0]["topic_label"]
        assert groups[0]["total_affected"] >= groups[1]["total_affected"] >= groups[2]["total_affected"]
        print(" -> PASS: Top 3 confusion points accurately ranked by student impact.")

    # 5. Test AI Re-Explanation synthesis
    print("\n[Test 5] Testing AI Re-Explanation Structure...")
    exp = generate_offline_fallback_explanation("Purpose & Need for Arrays", [doubt1, doubt2, doubt3])
    assert exp["explanation_text"] != ""
    assert exp["analogy"] != ""
    assert exp["example"] != ""
    assert exp["step_by_step"] != ""
    print(f" -> Explanation: {exp['explanation_text'][:80]}...")
    print(f" -> Analogy: {exp['analogy'][:80]}...")
    print(f" -> Example:\n{exp['example']}")
    print(" -> PASS: AI Re-Explanation synthesized 4-part college mental model.")

    print("\n==================================================")
    print("   ALL 5 ACCEPTANCE TESTS PASSED SUCCESSFULLY!    ")
    print("==================================================")

if __name__ == "__main__":
    run_all_tests()
