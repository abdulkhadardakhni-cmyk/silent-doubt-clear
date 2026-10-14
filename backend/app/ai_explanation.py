import os
import json
import httpx
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# High-quality offline educational fallback knowledge base for core computer science concepts
OFFLINE_EXPLANATION_TEMPLATES = {
    "array": {
        "topic": "Purpose & Need for Arrays",
        "explanation": "Variables are like individual mailboxes—each one holds only a single piece of data. If you have 100 students, creating 100 separate variables (student1, student2, ... student100) makes code impossible to maintain. An array reserves a contiguous, unbroken row of memory slots under a single name, so you can access any element instantly in O(1) time using its numeric index.",
        "analogy": "Imagine an egg carton or a 7-day pill organizer. Instead of having 7 loose pills scattered on your desk where you have to search for each one, they sit in consecutive numbered compartments side-by-side.",
        "example": "int scores[5] = {85, 92, 78, 90, 88};\n// Access student #3 in 1 step without 5 separate variables\nint student3 = scores[2];",
        "step_by_step": "1. Single Identifier: One variable name manages hundreds of values.\n2. Contiguous Memory: Items live right next to each other in RAM.\n3. Instant Indexing: Base Address + (Index * Element Size) reaches any element instantly.\n4. Loop Friendly: Process all items with a simple 'for' loop instead of writing repetitive lines."
    },
    "index": {
        "topic": "Zero-Based Indexing & Memory Offsets",
        "explanation": "In programming languages like C, C++, Java, and Python, an index does NOT mean 'ordinal position' (1st, 2nd, 3rd); it represents the physical offset distance from the beginning of the array in memory.",
        "analogy": "Think of mileage markers on a highway. At the very starting point (mile 0), your distance traveled is 0. The first item sits right at the starting line, so its offset from the start is 0.",
        "example": "Array address: 1000. Each integer takes 4 bytes.\nElement 0 address = 1000 + (0 * 4) = 1000\nElement 1 address = 1000 + (1 * 4) = 1004",
        "step_by_step": "1. The array name points to the base memory address.\n2. Index is an offset multiplier: Address = Base + (Index * Size).\n3. Offset 0 means '0 steps away from start' (the first element).\n4. This avoids an extra subtraction step on every memory lookup in the CPU."
    },
    "pointer": {
        "topic": "Pointer Syntax & Memory Address Manipulation",
        "explanation": "A regular variable stores actual data values (like 42 or 3.14). A pointer is simply a special variable whose value is the physical house address of another variable in RAM.",
        "analogy": "A variable is like a person living in a house. A pointer is like a piece of paper with that house's street address written on it. The '*' operator is like knocking on the door to see who is inside.",
        "example": "int age = 20;\nint* ptr = &age; // '&' gets address\nprintf('%d', *ptr); // '*' dereferences to inspect value (20)",
        "step_by_step": "1. Use '&' (Address-Of) to get where a variable lives in RAM.\n2. Store that address in a pointer variable (type* ptr).\n3. Use '*' (Dereference) to read or modify the value at that address directly.\n4. Enables passing massive data structures to functions without copying them."
    },
    "recursion": {
        "topic": "Recursion Call Stack & Base Conditions",
        "explanation": "Recursion occurs when a function solves a small part of a problem and calls a fresh copy of itself to solve the rest. To prevent infinite loops, every recursive function must have a base condition that stops further calls.",
        "analogy": "Russian Matryoshka nesting dolls. You open a doll only to find a smaller doll inside. You keep opening them until you hit the smallest solid wooden doll (the base case), then close them back up one by one.",
        "example": "int factorial(int n) {\n    if (n <= 1) return 1; // Base condition: stops recursion\n    return n * factorial(n - 1); // Recursive reduction\n}",
        "step_by_step": "1. Identify the Base Case: The absolute simplest scenario where no further calls are needed.\n2. Shrink the Problem: Each recursive call must move one step closer to the base case.\n3. The Call Stack: Each call waits on the stack until the base case returns.\n4. Unwinding: Results return back up the chain to compute the final answer."
    }
}

async def generate_explanation_with_llm(
    topic_label: str,
    doubts: List[str],
    teacher_notes: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Attempt re-explanation generation using Gemini or OpenAI."""
    prompt = f"""
You are a master computer science professor explaining a concept that several college students are currently confused about.

Confusion Topic: {topic_label}
Representative Anonymous Student Doubts:
{json.dumps(doubts, indent=2)}

Teacher's optional note: {teacher_notes or "None provided"}

Please produce a clear, friendly, and engaging explanation formatted as strict JSON with exactly these 4 keys:
1. "explanation_text": A 3-4 sentence crystal-clear explanation for college freshmen/sophomores. Avoid unnecessary jargon.
2. "analogy": A relatable real-world comparison from everyday life (e.g. food, traffic, lockers, games).
3. "example": A short, clean code snippet or practical demonstration showing how to think through it.
4. "step_by_step": 3 to 4 concise bullet points breaking the mental model into steps.

Respond ONLY with valid JSON.
"""

    # 1. Try Gemini REST API if key exists
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.4, "responseMimeType": "application/json"}
            }
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content_str = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(content_str)
                    return {
                        "explanation_text": parsed.get("explanation_text", ""),
                        "analogy": parsed.get("analogy", ""),
                        "example": parsed.get("example", ""),
                        "step_by_step": parsed.get("step_by_step", ""),
                        "engine_used": "Google Gemini 1.5 Flash",
                        "is_fallback": False
                    }
        except Exception as e:
            print(f"[AI Explanation] Gemini API failed: {e}")

    # 2. Try OpenAI API if key exists
    if OPENAI_API_KEY:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are a concise college CS professor who responds in strict JSON."},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.4
            }
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content_str = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content_str)
                    return {
                        "explanation_text": parsed.get("explanation_text", ""),
                        "analogy": parsed.get("analogy", ""),
                        "example": parsed.get("example", ""),
                        "step_by_step": parsed.get("step_by_step", ""),
                        "engine_used": "OpenAI GPT-4o-mini",
                        "is_fallback": False
                    }
        except Exception as e:
            print(f"[AI Explanation] OpenAI API failed: {e}")

    return None

def generate_offline_fallback_explanation(
    topic_label: str,
    doubts: List[str]
) -> Dict[str, Any]:
    """Generate high-quality structured college re-explanation offline without external APIs."""
    combined = (topic_label + " " + " ".join(doubts)).lower()
    
    # Match against template knowledge base
    matched_key = None
    for key in OFFLINE_EXPLANATION_TEMPLATES:
        if key in combined:
            matched_key = key
            break

    if matched_key and matched_key in OFFLINE_EXPLANATION_TEMPLATES:
        tpl = OFFLINE_EXPLANATION_TEMPLATES[matched_key]
        return {
            "explanation_text": tpl["explanation"],
            "analogy": tpl["analogy"],
            "example": tpl["example"],
            "step_by_step": tpl["step_by_step"],
            "engine_used": "Pedagogical Concept Synthesizer (Offline Fallback)",
            "is_fallback": True
        }

    # Universal synthesis for other college topics
    sample_doubt = doubts[0] if doubts else topic_label
    return {
        "explanation_text": f"This confusion stems from connecting foundational syntax with how the computer manages state. When students ask '{sample_doubt[:60]}...', the key is recognizing that programming languages provide abstractions specifically designed to simplify repetitive operations.",
        "analogy": "Think of a factory assembly line: rather than having one worker sprint across the warehouse for every part, items are lined up sequentially so work happens in a predictable, standardized flow.",
        "example": f"// Core demonstration concept for: {topic_label}\n// Focus on the input -> transformation -> expected outcome",
        "step_by_step": "1. Understand the core motivation: What problem does this feature solve?\n2. Inspect the memory/state: Where does data live while running?\n3. Trace a small test case manually line-by-line.\n4. Contrast with what happens if you don't use this pattern.",
        "engine_used": "Pedagogical Concept Synthesizer (Offline Fallback)",
        "is_fallback": True
    }

async def get_or_generate_explanation(
    topic_label: str,
    doubts: List[str],
    teacher_notes: Optional[str] = None
) -> Dict[str, Any]:
    """Primary entry point: attempts LLM first, gracefully falls back to structured offline pedagogy engine."""
    llm_result = await generate_explanation_with_llm(topic_label, doubts, teacher_notes)
    if llm_result:
        return llm_result
    return generate_offline_fallback_explanation(topic_label, doubts)
