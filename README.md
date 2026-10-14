# Silent Doubt Wall – Anonymous Classroom Confusion Tracker

> **College AI Hackathon Project**  
> An intelligent, anonymous real-time web application where students can ask questions without fear of being judged, and teachers receive ranked confusion clusters with automated pedagogical re-explanations.

---

## 🌟 1. Problem & Goal

Many students hesitate to ask questions during lectures because they fear judgment from peers or the professor. The **Silent Doubt Wall** eliminates this psychological barrier:
- **100% Anonymous Student Interface:** Students submit doubts using a simple class code (`CS101`) without entering names, emails, roll numbers, or logins.
- **AI-Based Doubt Grouping:** Groups semantically similar questions together (e.g., *"Why do we use arrays?"*, *"What is the purpose of an array?"*, and *"Why can't we store multiple values in one variable?"* all merge under **"Purpose & Need for Arrays"**).
- **Teacher Command Dashboard:** Ranks the **Top 3 Confusion Points** in real time by student demand (submitted doubts + "Me Too" peer upvotes).
- **AI Re-Explanation Deck:** Synthesizes a structured 4-part mental model (Core Explanation, Everyday Analogy, Concrete Code Example, and Step-by-Step Breakdown) for the professor to review, edit, and present to the class.

---

## 🏗️ 2. Technology Stack & Architecture

- **Frontend:** React 18, Vite 6, Tailwind CSS, Lucide Icons, Chart.js, React-Chartjs-2, QRCode.react, Canvas Confetti.
- **Backend:** Python FastAPI (asynchronous ASGI framework), Uvicorn, Pydantic v2, HTTPX, SQLite with WAL (Write-Ahead Logging) mode.
- **AI Grouping Engine:** 
  - **Tier 1 (Neural):** Local `sentence-transformers` (`all-MiniLM-L6-v2`) dense vector embeddings & cosine similarity.
  - **Tier 2 (Hybrid Concept-Aware TF-IDF):** High-precision N-gram vectorizer with domain concept normalization (Intent archetype extraction & computer science ontology mapping).
- **AI Re-Explanation Engine:**
  - **Hosted LLM API:** Google Gemini 1.5 Flash / OpenAI GPT-4o-mini via REST.
  - **Offline Fallback Engine:** Pedagogical Concept Synthesizer generating structured college-level mental models, everyday analogies, and code snippets with zero external dependencies.
- **Real-Time Synchronization:** WebSockets (`ws://127.0.0.1:8000/ws/lectures/{id}`) broadcasting instant updates when doubts are submitted, upvoted, or explained.

---

## 🚀 3. Quick Start on Windows

### Option A: One-Click Master Launcher (Recommended)
Simply double-click:
```cmd
run_all.bat
```
*This opens both the FastAPI backend and React frontend in separate command windows and launches `http://localhost:5173` in your default browser.*

---

### Option B: Individual Windows Batch Files
1. **Start Backend (Port 8000):**
   ```cmd
   run_backend.bat
   ```
2. **Start Frontend (Port 5173):**
   ```cmd
   run_frontend.bat
   ```

---

### Option C: Manual Command Line Execution
```powershell
# 1. Backend Server
cd "c:\Users\aslamdakhani0507\OneDrive\Desktop\BCA 3rd SEM\ARTIFICIAL INTELLIGENCE\Hackathon"
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Frontend Server (In a separate terminal)
cd "c:\Users\aslamdakhani0507\OneDrive\Desktop\BCA 3rd SEM\ARTIFICIAL INTELLIGENCE\Hackathon\frontend"
npm run dev
```

---

## 🌐 4. Local URLs & Demo Credentials

| Resource | URL |
| :--- | :--- |
| **Web Application (Student & Teacher)** | `http://localhost:5173` |
| **FastAPI Interactive Docs (Swagger)** | `http://127.0.0.1:8000/docs` |
| **Backend Health Endpoint** | `http://127.0.0.1:8000/api/health` |
| **Pre-Configured Demo Class Code** | `CS101` |
| **Teacher Security PIN** | `1234` |

---

## 🎯 5. Hackathon Judge Demonstration Guide

Here is how to demonstrate all 9 acceptance criteria to the judges:

### 1. Student Joining via Class Code
- Open `http://localhost:5173` in your browser.
- You will see the **Student Doubt Wall** for classroom `CS101` (*"Data Structures & Algorithms"*).
- The active lecture is displayed: **Lecture 4: Arrays & Contiguous Memory Allocation**.

### 2. Anonymous Doubt Submission
- In the doubt submission box, type a question (e.g. *"Why do arrays have fixed size once declared in C?"*).
- Notice the live character counter (`48 / 300`) and the non-judgmental prompt.
- Click **"Post Anonymous Doubt"**.
- Confetti triggers and a green badge confirms: *"Your doubt was anonymously submitted and grouped by AI!"*

### 3. Semantic AI Grouping Demonstration
- Submit the following three differently worded doubts:
  1. *"Why do we use arrays?"*
  2. *"What is the purpose of an array?"*
  3. *"Why can't we store multiple values in one variable?"*
- Observe that the AI groups all 3 questions under **"Purpose & Need for Arrays"** rather than creating separate duplicate groups!
- Submit an unrelated doubt: *"How does pointer dereferencing with an asterisk work in memory?"*
- The AI detects the concept shift and correctly spawns a new confusion group: **"Pointer Syntax & Memory Address Manipulation"**.

### 4. Ranked Top 3 Confusion Points
- Click the **"Teacher"** tab in the top navigation bar.
- Enter PIN `1234` to unlock the dashboard.
- The **Top 3 Confusion Points Podium** is prominently featured:
  - **Rank #1:** *Purpose & Need for Arrays* (18 students affected)
  - **Rank #2:** *Zero-Based Indexing & Memory Offsets* (11 students affected)
  - **Rank #3:** *Array Size Constraints & Memory Allocation* (7 students affected)

### 5. AI Re-Explanation Deck
- On the Rank #1 card, click **"AI Re-Explain Deck"**.
- A full pedagogical presentation opens with:
  - **Core Re-Explanation:** Simple language explaining mailboxes vs contiguous slots.
  - **Everyday Analogy:** Egg carton / 7-day pill organizer comparison.
  - **Concrete Code Example:** Clean C/C++ snippet with dark syntax theme.
  - **Step-by-Step Mental Model:** 4 clear checklist steps.
- Click **"Edit Explanation"** to edit any sentence and click **"Save & Present"**.

### 6. Real-Time Multi-Browser Synchronization
- Open a second browser window (or Incognito tab) side-by-side:
  - Window A: Student View (`http://localhost:5173`)
  - Window B: Teacher Dashboard (`http://localhost:5173`)
- Submit a new doubt or click **"Me Too"** in Window A.
- Notice that Window B updates **instantly in real time** via WebSockets without refreshing the page!

### 7. "Me Too" Upvote & Duplicate Protection
- In the Student View, click **"Me Too!"** on any doubt.
- The upvote count increments immediately.
- Try clicking **"Me Too!"** a second time on the same doubt.
- The button is disabled and states *"Me Too! (Saved)"*, preventing vote manipulation while keeping the student completely untracked.

### 8. Classroom QR Code for Projector
- Click the **"Join QR"** button in the navbar or **"Project Join QR"** in the teacher dashboard.
- A high-resolution QR code modal opens with the class code `CS101` in bold typography and a direct join link copy button.

### 9. Lecture-wise Confusion History & Charts
- In the Teacher Dashboard, switch between the tabs:
  - **Analytics & Progression:** View the *Most Confusing Topics (Horizontal Bar Chart)* and *Confusion Activity Across Lectures (Line Chart)*.
  - **Lecture History:** Review historical sessions (Lectures 1, 2, 3) with doubt counts, top confusion topics, and resolution status.

---

## 🤖 6. AI Engine Transparency

| Feature | Engine Used | Status | Fallback Behavior |
| :--- | :--- | :--- | :--- |
| **Doubt Semantic Grouping** | Local Sentence-Transformers or Hybrid N-Gram Concept TF-IDF | ✅ Real AI Semantic Engine | Seamlessly switches between neural dense vectors and high-precision concept-aware TF-IDF. |
| **Topic Heading Generation** | Concept Ontology & Extractive Archetypes | ✅ Automated Synthesizer | Extracts clean human-readable titles (e.g. *"Purpose & Need for Arrays"*). |
| **AI Re-Explanation Deck** | Google Gemini 1.5 Flash / OpenAI GPT or Pedagogical Concept Synthesizer | ✅ AI-Enabled with Offline Fallback | If `GEMINI_API_KEY` is provided, generates dynamic LLM responses. If not provided, synthesizes from the structured college pedagogy knowledge base and clearly marks it as a fallback. |

---

## 🛡️ 7. Privacy & Security Architecture

1. **Zero Personally Identifiable Information (PII):** No name, email, phone number, roll number, or IP address is ever stored or transmitted.
2. **Client-Side Anonymous Token:** An unidentifiable random token (`anon_xxx`) is generated locally in the browser to maintain upvote state without tracking the student.
3. **Teacher PIN Gate:** Teacher operations (creating lectures, editing explanations, resetting demo data) are protected by a configurable security PIN (default: `1234`).
4. **Input Sanitization & Rate Limiting:** Student submissions are bounded (5–300 characters), sanitized, and throttled to prevent spam.

---

## 🧪 8. Automated Acceptance Test Suite

Run the full acceptance test suite:
```cmd
run_tests.bat
```
Or via PowerShell:
```powershell
python -u backend/tests/run_tests.py
python -u backend/tests/test_api_client.py
```

**Verification Results:**
- `test_semantic_grouping_arrays`: **PASS** (Arrays doubts matched with >0.78 similarity)
- `test_unrelated_doubt_creates_new_group`: **PASS** (Pointers doubt separated)
- `test_top3_ranking_calculation`: **PASS** (Ranked by student impact)
- `test_offline_explanation_synthesis`: **PASS** (4-part mental model generated)
- `test_duplicate_upvote_protection`: **PASS** (Duplicate upvotes blocked with HTTP 400)
- `test_analytics_and_history`: **PASS** (4 historical lectures verified)
