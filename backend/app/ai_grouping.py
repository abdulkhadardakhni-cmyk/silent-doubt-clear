import re
import os
import math
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Global reference for SentenceTransformer model
_ST_MODEL = None
_MODEL_LOAD_ATTEMPTED = False
MODEL_NAME = "all-MiniLM-L6-v2"

# Similarity threshold (configurable via env)
DEFAULT_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.50"))
USE_SENTENCE_TRANSFORMERS = os.getenv("USE_SENTENCE_TRANSFORMERS", "false").lower() == "true"

# Pre-compiled regex for text cleaning
PUNCT_RE = re.compile(r"[^\w\s\+\#\-\*]")

# Standard stop words
STOP_WORDS = {
    "a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "from",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "it", "its", "this", "that", "these", "those", "i", "we", "you", "they", "he", "she"
}

# Common interrogative and intent phrases mapped to canonical conceptual representations
INTENT_SYNONYMS = {
    r"\b(why\s+do\s+we\s+use|why\s+use|what\s+is\s+the\s+purpose\s+of|what\s+is\s+the\s+point\s+of|why\s+do\s+we\s+need|what\s+is\s+the\s+need\s+for|what\s+does\s+.*do|why\s+have)\b": "purpose_need_utility array_utility",
    r"\b(why\s+can'?t\s+we\s+store\s+multiple\s+values|store\s+multiple\s+elements|many\s+values\s+in\s+one\s+variable|single\s+variable\s+multiple\s+items|multiple\s+values\s+in\s+a\s+variable)\b": "array_concept multi_value_storage purpose_need_utility array_utility",
    r"\b(difference\s+between|how\s+is\s+.*different\s+from|compare|versus|vs)\b": "contrast_comparison",
    r"\b(how\s+does\s+.*work|internal\s+working\s+of|behind\s+the\s+scenes)\b": "internal_mechanism",
    r"\b(index\s+from\s+0|zero\s+based\s+indexing|start\s+at\s+0|why\s+0\s+not\s+1|array\s+indexing\s+start)\b": "zero_based_indexing memory_offset",
    r"\b(fixed\s+size|size\s+cannot\s+change|dynamic\s+resizing|out\s+of\s+bounds|change\s+size\s+dynamically)\b": "fixed_size_bounds_limitation array_bounds",
}

# Educational topic keywords and titles
TOPIC_DICTIONARY = [
    {
        "keywords": ["array", "arrays", "multiple values", "one variable", "single variable", "contiguous", "store multiple", "multi_value_storage", "array_concept"],
        "label": "Purpose & Need for Arrays",
        "summary": "Doubts concerning why arrays exist, how they store multiple values contiguously, and when to choose them over single variables."
    },
    {
        "keywords": ["index", "zero", "0", "offset", "address", "start at 0", "why 0", "zero_based_indexing"],
        "label": "Zero-Based Indexing & Memory Offsets",
        "summary": "Doubts about why indexing begins at 0 and how index values compute physical RAM offsets."
    },
    {
        "keywords": ["fixed size", "dynamic", "resize", "size limit", "bounds", "overflow", "fixed_size_bounds_limitation"],
        "label": "Array Size Constraints & Memory Allocation",
        "summary": "Doubts regarding static sizing limitations in languages like C/C++ and resizing strategies."
    },
    {
        "keywords": ["pointer", "pointers", "dereference", "address of", "null pointer", "asterisk", "ampersand"],
        "label": "Pointer Syntax & Memory Address Manipulation",
        "summary": "Doubts about pointers, address-of operator (&), and dereferencing values in memory."
    },
    {
        "keywords": ["recursion", "recursive", "base case", "call stack", "infinite recursion", "stack overflow"],
        "label": "Recursion Call Stack & Base Conditions",
        "summary": "Doubts on how function stack frames execute in recursion and avoiding stack overflow."
    },
    {
        "keywords": ["linked list", "nodes", "next pointer", "head", "tail", "list vs array"],
        "label": "Linked Lists vs Contiguous Arrays",
        "summary": "Doubts comparing sequential memory vs heap node allocation with pointer links."
    },
    {
        "keywords": ["time complexity", "big o", "o(1)", "o(n)", "efficiency", "worst case"],
        "label": "Time Complexity & Algorithmic Growth",
        "summary": "Doubts about Big-O notation, asymptotic analysis, and evaluating algorithm performance."
    }
]

def clean_text(text: str) -> str:
    """Preprocess, normalize, and lowercase user input text."""
    if not text:
        return ""
    text = text.strip().lower()
    text = PUNCT_RE.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def normalize_and_stem(text: str) -> str:
    """Preprocess, normalize, and lemmatize common computing domain terms."""
    cleaned = clean_text(text)
    # Lemmatize plurals and inflections
    cleaned = re.sub(r"\barrays\b", "array", cleaned)
    cleaned = re.sub(r"\bpointers\b", "pointer", cleaned)
    cleaned = re.sub(r"\bvariables\b", "variable", cleaned)
    cleaned = re.sub(r"\bvalues\b", "value", cleaned)
    cleaned = re.sub(r"\bindexing\b", "index", cleaned)
    cleaned = re.sub(r"\belements\b", "element", cleaned)
    cleaned = re.sub(r"\bfunctions\b", "function", cleaned)
    cleaned = re.sub(r"\bnodes\b", "node", cleaned)
    return cleaned

def expand_intent_and_concepts(text: str) -> str:
    """Expand implicit concepts to ensure semantic equivalence for college queries."""
    normalized = normalize_and_stem(text)
    expanded = normalized
    
    # 1. Intent synonym expansion
    for pattern, replacement in INTENT_SYNONYMS.items():
        if re.search(pattern, normalized, re.IGNORECASE):
            expanded += f" {replacement}"
            
    # 2. Concept enrichment for foundational questions
    if re.search(r"\b(multiple\s+value|many\s+value|more\s+than\s+one\s+value)\b", normalized):
        expanded += " array array_concept collection_concept"
        
    return expanded

def extract_domain_entities(text: str) -> set:
    """Extract foundational computer science concept tokens."""
    normalized = normalize_and_stem(text)
    entities = set()
    if re.search(r"\b(array|arrays|multiple value|single variable|store multiple|collection|contiguous)\b", normalized):
        entities.add("concept_array")
    if re.search(r"\b(pointer|pointers|dereference|address|asterisk|ampersand)\b", normalized):
        entities.add("concept_pointer")
    if re.search(r"\b(recursion|recursive|base case|call stack|stack overflow)\b", normalized):
        entities.add("concept_recursion")
    if re.search(r"\b(index|zero|start at 0|offset|indexing|why 0)\b", normalized):
        entities.add("concept_index")
    if re.search(r"\b(fixed size|dynamic|resize|out of bounds|size limit)\b", normalized):
        entities.add("concept_fixed_size")
    if re.search(r"\b(linked list|node|nodes|head|tail)\b", normalized):
        entities.add("concept_linked_list")
    if re.search(r"\b(time complexity|big o|o\(1\)|o\(n\)|efficiency)\b", normalized):
        entities.add("concept_time_complexity")
    return entities

def extract_intent_archetype(text: str) -> set:
    """Extract interrogative intent archetype."""
    normalized = normalize_and_stem(text)
    intents = set()
    if re.search(r"\b(why\s+do\s+we\s+use|why\s+use|purpose|point\s+of|why\s+need|what\s+is\s+the\s+need|why\s+can'?t\s+we\s+store)\b", normalized):
        intents.add("intent_purpose")
    if re.search(r"\b(difference|compare|vs|versus)\b", normalized):
        intents.add("intent_comparison")
    if re.search(r"\b(how\s+does|how\s+do|how\s+to|internal|working)\b", normalized):
        intents.add("intent_mechanism")
    return intents

def compute_hybrid_semantic_score(doubt_a: str, doubt_b: str, tfidf_sim: float) -> float:
    """Combine n-gram TF-IDF cosine similarity with domain concept and intent alignment."""
    ent_a = extract_domain_entities(doubt_a)
    ent_b = extract_domain_entities(doubt_b)
    intent_a = extract_intent_archetype(doubt_a)
    intent_b = extract_intent_archetype(doubt_b)

    # Hard boundary between disparate concepts (e.g. Arrays vs Pointers)
    if ent_a and ent_b and not (ent_a & ent_b):
        return 0.0

    ent_overlap = len(ent_a & ent_b) / max(1, len(ent_a)) if (ent_a and ent_b) else 0.0
    intent_overlap = len(intent_a & intent_b) / max(1, len(intent_a)) if (intent_a and intent_b) else 0.0

    if ent_overlap > 0:
        score = 0.30 * tfidf_sim + 0.45 * ent_overlap + 0.25 * max(0.5, intent_overlap)
        return min(1.0, score)
    return tfidf_sim * 0.7

def extract_ngrams(text: str, max_n: int = 3) -> List[str]:
    """Tokenize and generate 1-gram, 2-gram, and 3-gram tokens."""
    tokens = [w for w in text.split() if w not in STOP_WORDS]
    if not tokens:
        tokens = text.split()
    
    ngrams = []
    ngrams.extend(tokens)
    if max_n >= 2 and len(tokens) >= 2:
        for i in range(len(tokens) - 1):
            ngrams.append(f"{tokens[i]}_{tokens[i+1]}")
    if max_n >= 3 and len(tokens) >= 3:
        for i in range(len(tokens) - 2):
            ngrams.append(f"{tokens[i]}_{tokens[i+1]}_{tokens[i+2]}")
    return ngrams

def compute_cosine_similarity_dict(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
    """Compute cosine similarity between two sparse vector dictionaries."""
    if not vec_a or not vec_b:
        return 0.0
    dot_product = sum(vec_a[k] * vec_b[k] for k in vec_a if k in vec_b)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def build_sparse_tfidf_vectors(corpus: List[str]) -> List[Dict[str, float]]:
    """Pure Python, zero-dependency sublinear TF-IDF vectorizer."""
    expanded_corpus = [expand_intent_and_concepts(doc) for doc in corpus]
    doc_tokens = [extract_ngrams(doc) for doc in expanded_corpus]
    N = len(corpus)

    df: Dict[str, int] = {}
    for tokens in doc_tokens:
        unique_t = set(tokens)
        for t in unique_t:
            df[t] = df.get(t, 0) + 1

    idf = {t: math.log((1 + N) / (1 + count)) + 1.0 for t, count in df.items()}

    vectors = []
    for tokens in doc_tokens:
        tf: Dict[str, float] = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1.0
        
        vec = {t: (1.0 + math.log(cnt)) * idf.get(t, 1.0) for t, cnt in tf.items()}
        norm = math.sqrt(sum(v * v for v in vec.values()))
        if norm > 0:
            vec = {t: v / norm for t, v in vec.items()}
        vectors.append(vec)
        
    return vectors

def infer_topic_label(doubt_texts: List[str]) -> Tuple[str, str]:
    """Derive an intuitive, human-friendly topic label and summary from doubts in a group."""
    combined = " ".join(doubt_texts).lower()
    
    for topic in TOPIC_DICTIONARY:
        for kw in topic["keywords"]:
            if re.search(rf"\b{re.escape(kw)}\b", combined):
                return topic["label"], topic["summary"]
    
    sample = doubt_texts[0].strip()
    clean_sample = re.sub(r"^(why|what|how|can|is|are|does|do)\s+(do\s+we|is\s+the|can\s+we|to|we)?\s*", "", sample, flags=re.IGNORECASE)
    clean_sample = clean_sample.rstrip("?.!").strip()
    if clean_sample:
        topic_title = clean_sample.capitalize()
        if len(topic_title) > 45:
            topic_title = topic_title[:45] + "..."
        return f"Understanding {topic_title}", f"Student queries centered on: {sample[:70]}..."
    
    return "Classroom Question Topic", "Collection of similar student inquiries during lecture."

def get_sentence_transformer():
    """Lazy loader for SentenceTransformer with fail-safe fallback."""
    global _ST_MODEL, _MODEL_LOAD_ATTEMPTED
    if not USE_SENTENCE_TRANSFORMERS:
        return None
    if _ST_MODEL is not None:
        return _ST_MODEL
    if _MODEL_LOAD_ATTEMPTED:
        return None

    _MODEL_LOAD_ATTEMPTED = True
    try:
        from sentence_transformers import SentenceTransformer
        _ST_MODEL = SentenceTransformer(MODEL_NAME)
        return _ST_MODEL
    except Exception as e:
        print(f"[AI Grouping] SentenceTransformer unavailable ({e}). Using Hybrid Semantic TF-IDF engine.")
        return None

def group_new_doubt(
    new_doubt_text: str,
    existing_groups: List[Dict[str, Any]],
    threshold: float = DEFAULT_THRESHOLD
) -> Dict[str, Any]:
    """
    Assign a newly submitted doubt to an existing confusion group or recommend creating a new group.
    """
    if not existing_groups:
        label, summary = infer_topic_label([new_doubt_text])
        return {
            "assigned_group_id": None,
            "is_new_group": True,
            "topic_label": label,
            "summary": summary,
            "similarity_score": 1.0,
            "engine_used": "direct-initialization",
            "is_fallback": False
        }

    # Try Sentence Transformers if enabled
    st_model = get_sentence_transformer()
    best_group_id = None
    best_score = 0.0

    if st_model is not None:
        try:
            import numpy as np
            all_existing_doubts = []
            group_doubt_mapping = []
            for grp in existing_groups:
                for d_text in grp.get("doubt_texts", []):
                    all_existing_doubts.append(d_text)
                    group_doubt_mapping.append(grp["id"])
            
            if all_existing_doubts:
                all_texts = [new_doubt_text] + all_existing_doubts
                embeddings = st_model.encode(all_texts, convert_to_numpy=True, normalize_embeddings=True)
                new_vec = embeddings[0]
                existing_vecs = embeddings[1:]

                group_scores = {}
                for idx, g_id in enumerate(group_doubt_mapping):
                    sim = float(np.dot(new_vec, existing_vecs[idx]))
                    if g_id not in group_scores or sim > group_scores[g_id]:
                        group_scores[g_id] = sim

                for g_id, score in group_scores.items():
                    if score > best_score:
                        best_score = score
                        best_group_id = g_id

                if best_score >= threshold and best_group_id is not None:
                    target_group = next(g for g in existing_groups if g["id"] == best_group_id)
                    return {
                        "assigned_group_id": best_group_id,
                        "is_new_group": False,
                        "topic_label": target_group["topic_label"],
                        "summary": target_group.get("summary", ""),
                        "similarity_score": round(best_score, 4),
                        "engine_used": "sentence-transformers (" + MODEL_NAME + ")",
                        "is_fallback": False
                    }
        except Exception as e:
            print(f"[AI Grouping] ST scoring note: {e}")

    # Pure Python Concept-Aware Hybrid TF-IDF Semantic Engine
    engine_used = "hybrid-concept-tfidf"
    is_fallback = True

    all_existing_doubts = []
    group_doubt_mapping = []
    for grp in existing_groups:
        for d_text in grp.get("doubt_texts", []):
            all_existing_doubts.append(d_text)
            group_doubt_mapping.append(grp["id"])

    if all_existing_doubts:
        corpus = [new_doubt_text] + all_existing_doubts
        vectors = build_sparse_tfidf_vectors(corpus)
        new_vec = vectors[0]
        existing_vecs = vectors[1:]

        group_scores = {}
        for idx, g_id in enumerate(group_doubt_mapping):
            exist_text = all_existing_doubts[idx]
            tfidf_sim = compute_cosine_similarity_dict(new_vec, existing_vecs[idx])
            sim = compute_hybrid_semantic_score(new_doubt_text, exist_text, tfidf_sim)
            if g_id not in group_scores or sim > group_scores[g_id]:
                group_scores[g_id] = sim

        for g_id, score in group_scores.items():
            if score > best_score:
                best_score = score
                best_group_id = g_id

    # Decision based on similarity threshold
    if best_score >= threshold and best_group_id is not None:
        target_group = next(g for g in existing_groups if g["id"] == best_group_id)
        return {
            "assigned_group_id": best_group_id,
            "is_new_group": False,
            "topic_label": target_group["topic_label"],
            "summary": target_group.get("summary", ""),
            "similarity_score": round(best_score, 4),
            "engine_used": engine_used,
            "is_fallback": is_fallback
        }
    else:
        label, summary = infer_topic_label([new_doubt_text])
        return {
            "assigned_group_id": None,
            "is_new_group": True,
            "topic_label": label,
            "summary": summary,
            "similarity_score": round(best_score, 4),
            "engine_used": engine_used,
            "is_fallback": is_fallback
        }
