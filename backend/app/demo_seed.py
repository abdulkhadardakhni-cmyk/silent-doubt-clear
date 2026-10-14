from app.database import get_db

def seed_demo_data(force: bool = False):
    """Seed the database with rich college demonstration data."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if classroom CS101 exists
        cursor.execute("SELECT id FROM classrooms WHERE code = 'CS101';")
        existing_class = cursor.fetchone()
        
        if existing_class and not force:
            print("[Demo Seed] Classroom CS101 already exists. Skipping seed.")
            return

        if force:
            # Clean existing demo data if forced reset
            cursor.execute("DELETE FROM classrooms WHERE code = 'CS101';")

        print("[Demo Seed] Seeding demo classroom CS101...")
        
        # 1. Create Classroom
        cursor.execute("""
            INSERT INTO classrooms (code, name, subject, teacher_pin)
            VALUES ('CS101', 'Data Structures & Algorithms (BCA 3rd Sem)', 'Computer Science', '1234');
        """)
        classroom_id = cursor.lastrowid

        # 2. Create Historical Lectures
        cursor.execute("""
            INSERT INTO lectures (classroom_id, title, lecture_number, is_active, created_at)
            VALUES (?, 'Lecture 1: Introduction to Time Complexity & Big O', 1, 0, datetime('now', '-7 days'));
        """, (classroom_id,))
        lec1_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO lectures (classroom_id, title, lecture_number, is_active, created_at)
            VALUES (?, 'Lecture 2: Memory Addresses & Pointer Basics', 2, 0, datetime('now', '-5 days'));
        """, (classroom_id,))
        lec2_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO lectures (classroom_id, title, lecture_number, is_active, created_at)
            VALUES (?, 'Lecture 3: Stack vs Heap & Memory Allocation', 3, 0, datetime('now', '-2 days'));
        """, (classroom_id,))
        lec3_id = cursor.lastrowid

        # 3. Create Active Lecture (Lecture 4)
        cursor.execute("""
            INSERT INTO lectures (classroom_id, title, lecture_number, is_active, created_at)
            VALUES (?, 'Lecture 4: Arrays & Contiguous Memory Allocation', 4, 1, datetime('now'));
        """, (classroom_id,))
        active_lec_id = cursor.lastrowid

        # --- SEED LECTURE 1 HISTORY ---
        cursor.execute("""
            INSERT INTO confusion_groups (lecture_id, topic_label, summary, is_explained, explained_at)
            VALUES (?, 'Worst Case vs Average Case Time Complexity', 'Doubts about when to use Big-O vs Big-Omega', 1, datetime('now', '-7 days'));
        """, (lec1_id,))
        g_lec1 = cursor.lastrowid
        cursor.execute("INSERT INTO doubts (lecture_id, confusion_group_id, text, upvotes_count, student_hash) VALUES (?, ?, 'Why do we only focus on worst-case instead of average-case?', 8, 'student_hash_h1')", (lec1_id, g_lec1))
        cursor.execute("INSERT INTO doubts (lecture_id, confusion_group_id, text, upvotes_count, student_hash) VALUES (?, ?, 'What is the practical difference between O(n) and O(log n)?', 5, 'student_hash_h2')", (lec1_id, g_lec1))

        # --- SEED LECTURE 2 HISTORY ---
        cursor.execute("""
            INSERT INTO confusion_groups (lecture_id, topic_label, summary, is_explained, explained_at)
            VALUES (?, 'Pointer Dereferencing vs Address Operator', 'Differences between & and * operators', 1, datetime('now', '-5 days'));
        """, (lec2_id,))
        g_lec2 = cursor.lastrowid
        cursor.execute("INSERT INTO doubts (lecture_id, confusion_group_id, text, upvotes_count, student_hash) VALUES (?, ?, 'I get confused when using * to declare vs * to dereference.', 12, 'student_hash_h3')", (lec2_id, g_lec2))
        cursor.execute("INSERT INTO doubts (lecture_id, confusion_group_id, text, upvotes_count, student_hash) VALUES (?, ?, 'Why does changing a pointer value not change the original variable?', 7, 'student_hash_h4')", (lec2_id, g_lec2))

        # --- SEED LECTURE 3 HISTORY ---
        cursor.execute("""
            INSERT INTO confusion_groups (lecture_id, topic_label, summary, is_explained, explained_at)
            VALUES (?, 'Stack Overflow & Dynamic Heap Limits', 'Doubts on memory segments and leaks', 1, datetime('now', '-2 days'));
        """, (lec3_id,))
        g_lec3 = cursor.lastrowid
        cursor.execute("INSERT INTO doubts (lecture_id, confusion_group_id, text, upvotes_count, student_hash) VALUES (?, ?, 'Why does recursion cause stack overflow if stack is inside RAM?', 15, 'student_hash_h5')", (lec3_id, g_lec3))

        # --- SEED ACTIVE LECTURE 4 (TOP 3 RANKED CONFUSION POINTS) ---
        
        # Rank 1: Purpose & Need for Arrays (Total Students Affected: 18)
        cursor.execute("""
            INSERT INTO confusion_groups (lecture_id, topic_label, summary, is_explained)
            VALUES (?, 'Purpose & Need for Arrays', 'Doubts concerning why arrays exist, why single variables are insufficient for collections, and how contiguous memory works.', 0);
        """, (active_lec_id,))
        grp1_id = cursor.lastrowid

        d1 = ("Why do we use arrays instead of just creating separate variables?", 6, "hash_demo_101")
        d2 = ("What is the purpose of an array in memory?", 4, "hash_demo_102")
        d3 = ("Why can't we store multiple values in one variable?", 3, "hash_demo_103")
        d4 = ("How does an array make processing data with loops faster?", 1, "hash_demo_104")
        for text, upvotes, s_hash in [d1, d2, d3, d4]:
            cursor.execute("INSERT INTO doubts (lecture_id, confusion_group_id, text, upvotes_count, student_hash) VALUES (?, ?, ?, ?, ?)", (active_lec_id, grp1_id, text, upvotes, s_hash))

        # Rank 2: Zero-Based Indexing & Memory Offsets (Total Students Affected: 11)
        cursor.execute("""
            INSERT INTO confusion_groups (lecture_id, topic_label, summary, is_explained)
            VALUES (?, 'Zero-Based Indexing & Memory Offsets', 'Doubts regarding why arrays begin at index 0 rather than 1 and how RAM offsets are computed.', 0);
        """, (active_lec_id,))
        grp2_id = cursor.lastrowid

        d5 = ("Why does array indexing start at 0 instead of 1?", 6, "hash_demo_105")
        d6 = ("How does indexing from 0 relate to the memory address calculation?", 3, "hash_demo_106")
        for text, upvotes, s_hash in [d5, d6]:
            cursor.execute("INSERT INTO doubts (lecture_id, confusion_group_id, text, upvotes_count, student_hash) VALUES (?, ?, ?, ?, ?)", (active_lec_id, grp2_id, text, upvotes, s_hash))

        # Rank 3: Fixed Size Constraints & Memory Limits (Total Students Affected: 7)
        cursor.execute("""
            INSERT INTO confusion_groups (lecture_id, topic_label, summary, is_explained)
            VALUES (?, 'Array Size Constraints & Memory Allocation', 'Doubts regarding fixed static sizing in C/C++ and buffer boundaries.', 0);
        """, (active_lec_id,))
        grp3_id = cursor.lastrowid

        d7 = ("Why can't an array change size dynamically once defined in C?", 3, "hash_demo_107")
        d8 = ("What actually happens in memory if we access an index beyond the array size?", 2, "hash_demo_108")
        for text, upvotes, s_hash in [d7, d8]:
            cursor.execute("INSERT INTO doubts (lecture_id, confusion_group_id, text, upvotes_count, student_hash) VALUES (?, ?, ?, ?, ?)", (active_lec_id, grp3_id, text, upvotes, s_hash))

        # Pre-seed AI Re-Explanation for Rank 1
        cursor.execute("""
            INSERT INTO ai_explanations (confusion_group_id, explanation_text, analogy, example, step_by_step, is_ai_generated, engine_used)
            VALUES (?, 
            'Variables are like individual mailboxes—each holds only one piece of data. If you have 100 students, writing 100 separate variable names makes programming impossible. An array reserves a contiguous, unbroken row of memory slots under a single name, so you can access any element instantly in O(1) time using an index.',
            'Imagine a 7-day pill organizer or an egg carton. Instead of 7 loose pills scattered on your desk where you must search for each one, they sit in consecutive numbered slots side-by-side.',
            'int scores[5] = {85, 92, 78, 90, 88};\n// Access student #3 in 1 step without separate variables\nint student3 = scores[2];',
            '1. Single Identifier: One name manages hundreds of values.\n2. Contiguous Memory: Items live adjacent to each other in RAM.\n3. Instant Indexing: Base Address + (Index * Element Size) reaches any element instantly.\n4. Loop Friendly: Process all items with a simple "for" loop.',
            1, 'Sentence-Transformers & Pedagogical Synthesizer');
        """, (grp1_id,))

        print("[Demo Seed] Seeding complete! CS101 active with 3 ranked confusion groups.")
