import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.demo_seed import seed_demo_data
from app.database import init_db

client = TestClient(app)

def test_api_workflows():
    print("==================================================")
    print("   TESTING REST API WORKFLOWS & DUPLICATE UPVOTE  ")
    print("==================================================")
    
    init_db()
    seed_demo_data(force=True)

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    print("1. Health Check -> Status: 200 OK")

    # 2. Get Classroom CS101
    res = client.get("/api/classrooms/CS101")
    assert res.status_code == 200
    data = res.json()
    assert data["classroom"]["code"] == "CS101"
    active_lec_id = data["active_lecture"]["id"]
    print(f"2. Classroom CS101 verified. Active Lecture ID: {active_lec_id} ('{data['active_lecture']['title']}')")

    # 3. Get Ranked Confusion Groups
    res = client.get(f"/api/lectures/{active_lec_id}/confusion-groups")
    assert res.status_code == 200
    groups = res.json()
    assert len(groups) >= 3
    assert groups[0]["rank"] == 1
    top_group_id = groups[0]["id"]
    print(f"3. Ranked Top 3 verified: Rank 1 is '{groups[0]['topic_label']}' with {groups[0]['total_students_affected']} students affected.")

    # 4. Student submits a doubt anonymously
    student_hash = "student_test_hash_999"
    doubt_payload = {
        "lecture_id": active_lec_id,
        "text": "Why do arrays have fixed size in memory?",
        "student_hash": student_hash
    }
    res = client.post("/api/doubts", json=doubt_payload)
    assert res.status_code == 200
    d_res = res.json()
    new_doubt_id = d_res["doubt_id"]
    print(f"4. Anonymous Doubt submitted -> ID: {new_doubt_id}, Group: '{d_res['topic_label']}' (New group: {d_res['is_new_group']})")

    # 5. Upvote ("Me Too")
    another_student = "student_test_hash_888"
    upvote_payload = {
        "doubt_id": new_doubt_id,
        "student_hash": another_student
    }
    res = client.post("/api/doubts/upvote", json=upvote_payload)
    assert res.status_code == 200
    assert res.json()["upvotes_count"] == 1
    print("5. 'Me Too' Upvote succeeded. New upvotes count: 1")

    # 6. Duplicate Upvote Protection: same student upvoting again must fail (400)
    res_dup = client.post("/api/doubts/upvote", json=upvote_payload)
    assert res_dup.status_code == 400
    print(f"6. Duplicate Upvote correctly blocked: {res_dup.json()['detail']}")

    # 7. Teacher marks confusion group as explained
    res_exp = client.put(f"/api/confusion-groups/{top_group_id}/mark-explained")
    assert res_exp.status_code == 200
    assert res_exp.json()["is_explained"] is True
    print(f"7. 'Mark as Explained' toggled to True for group ID: {top_group_id}")

    # 8. Get Classroom Analytics
    res_analytics = client.get("/api/classrooms/CS101/analytics")
    assert res_analytics.status_code == 200
    an_data = res_analytics.json()
    assert len(an_data["lecture_history"]) >= 4
    print(f"8. Classroom Analytics verified. Historical Lectures: {len(an_data['lecture_history'])}, Total Doubts: {an_data['totals']['total_doubts']}")

    print("\n==================================================")
    print("   ALL API WORKFLOW TESTS PASSED SUCCESSFULLY!    ")
    print("==================================================")

if __name__ == "__main__":
    test_api_workflows()
