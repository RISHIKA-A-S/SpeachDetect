from flask import Blueprint, request, jsonify
import os
import re
from transformers import pipeline
from models.therapy_recommender import recommend
from models.distilgpt2_recommender import DistilGPT2Recommender
from config import MODEL_PATHS

recommend_bp = Blueprint("recommend", __name__)

LOCAL_BERT_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "models",
    "local_bert"
)

fill_mask = None
if os.path.isdir(LOCAL_BERT_PATH):
    try:
        fill_mask = pipeline(
            "fill-mask",
            model=LOCAL_BERT_PATH,
            tokenizer=LOCAL_BERT_PATH
        )
        print("BERT fill-mask loaded OK from", LOCAL_BERT_PATH)
    except Exception as exc:
        print("Warning: failed to load local BERT fill-mask:", exc)
else:
    print(f"Warning: local BERT path does not exist: {LOCAL_BERT_PATH}")

_gpt2 = None


def get_gpt2():
    global _gpt2
    model_path = MODEL_PATHS.get("distilgpt2")
    if not model_path or not os.path.isdir(model_path):
        print(f"GPT2 model path missing or invalid: {model_path}")
        return None

    if _gpt2 is None:
        try:
            _gpt2 = DistilGPT2Recommender(model_path)
            print("GPT2 recommender loaded OK from", model_path)
        except Exception as exc:
            print("Warning: failed to load DistilGPT2Recommender:", exc)
            return None
    return _gpt2


def clean_context(text):
    """Strip trailing dashes/fragments that break mask prediction."""
    if not text:
        return ""
    text = text.strip()
    text = re.sub(r'\s*-+\s*$', '', text)          # "to -" -> "to"
    text = re.sub(r'\b\w{1,2}-\s*$', '', text)      # "to w-" -> "to"
    text = re.sub(r'[.…]{2,}\s*$', '', text)        # trailing ellipsis
    return text.strip()


# Rule-based fallback — guarantees the bar is never empty for common openers.
# Keyed on the last word of the cleaned context (lowercase).
RULE_BASED_NEXT_WORDS = {
    "to":      ["go", "see", "do", "say", "be"],
    "i":       ["want", "am", "think", "need", "have"],
    "want":    ["to", "this", "that", "more", "some"],
    "the":     ["store", "park", "house", "book", "way"],
    "a":       ["lot", "bit", "few", "good", "new"],
    "you":     ["are", "want", "have", "know", "think"],
    "we":      ["are", "want", "should", "need", "can"],
    "can":     ["you", "we", "i", "go", "help"],
    "is":      ["good", "great", "fine", "okay", "ready"],
    "going":   ["to", "there", "home", "now", "back"],
}
DEFAULT_NEXT_WORDS = ["the", "and", "to", "a", "is"]


def rule_based_next_words(context):
    words = context.strip().split()
    if not words:
        return DEFAULT_NEXT_WORDS
    last = re.sub(r'[^\w]', '', words[-1]).lower()
    return RULE_BASED_NEXT_WORDS.get(last, DEFAULT_NEXT_WORDS)


def get_next_words(text):
    context = clean_context(text)
    if not context:
        print("get_next_words: empty context after cleaning, raw was:", repr(text))
        return []

    if fill_mask is None:
        print("get_next_words: BERT not loaded, skipping to fallback")
        return []

    masked = context + " [MASK]"
    try:
        results = fill_mask(masked)
    except Exception as exc:
        print("BERT next-word generation failed:", exc)
        return []

    words = []
    for r in results:
        token = r["token_str"].strip()
        if token.isalpha() and len(token) > 1:
            words.append(token)

    return words[:5]


@recommend_bp.route("/api/recommend", methods=["POST"])
def recommend_route():
    data = request.get_json() or {}

    stutter_class = (
        data.get("stutter_class")
        or data.get("predicted_class")
        or data.get("class")
        or "Normal"
    )
    severity = data.get("severity", "Mild")
    context = (
        data.get("context")
        or data.get("corrected_text")
        or data.get("corrected")
        or data.get("text")
        or ""
    )

    print("=" * 50)
    print("RECOMMEND raw body:", data)
    print("RECOMMEND context (raw):", repr(context))

    therapy = recommend(stutter_class, severity)

    cleaned_context = clean_context(context)
    print("RECOMMEND context (cleaned):", repr(cleaned_context))

    # 1. Try BERT
    next_words = get_next_words(context)
    print("BERT next_words:", next_words)

    # 2. Try GPT2 fallback
    if not next_words:
        fallback = get_gpt2()
        print("GPT2 fallback loaded:", fallback is not None)
        if fallback is not None and cleaned_context:
            try:
                next_words = fallback.suggest(cleaned_context) or []
            except Exception as exc:
                print("GPT2 suggest() failed:", exc)
                next_words = []
        print("GPT2 next_words:", next_words)

    # 3. Guaranteed rule-based fallback — bar should never be empty
    if not next_words:
        next_words = rule_based_next_words(cleaned_context)
        print("Rule-based fallback next_words:", next_words)

    print("FINAL next_words:", next_words)
    print("=" * 50)

    return jsonify({"therapy": therapy, "next_words": next_words})