from flask import Blueprint, request, jsonify
from models.bert_corrector import BERTCorrector

correct_bp = Blueprint("correct", __name__)
_corrector = None

def get_corrector():
    global _corrector
    if _corrector is None:
        _corrector = BERTCorrector()
    return _corrector

@correct_bp.route("/api/correct", methods=["POST"])
def correct():
    data = request.get_json()
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    corrected_text, was_corrected = get_corrector().correct(text)
    return jsonify({
        "original": text,
        "corrected": corrected_text,
        "was_corrected": was_corrected,
    })