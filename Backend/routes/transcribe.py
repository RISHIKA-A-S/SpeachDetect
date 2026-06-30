from flask import Blueprint, request, jsonify
import tempfile
import os

transcribe_bp = Blueprint("transcribe", __name__)

try:
    import whisper
except ImportError as exc:
    raise ImportError(
        "The whisper package is not installed. Install it with `pip install -r requirements.txt`."
    ) from exc

model = None

def get_model():
    global model
    if model is None:
        model = whisper.load_model("base")
    return model

@transcribe_bp.route("/api/transcribe", methods=["POST"])
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file"}), 400

    audio = request.files["audio"]
    temp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    try:
        audio.save(temp.name)
        temp.close()

        result = get_model().transcribe(
    temp.name,
    condition_on_previous_text=False,
    no_speech_threshold=0.3,
    compression_ratio_threshold=2.8,
    word_timestamps=True,
    temperature=0.0,          # ← deterministic, less hallucination
    initial_prompt=(
        "Transcribe verbatim. Preserve ALL stutters, repetitions, fillers "
        "like um uh er, false starts, and hesitations exactly as spoken. "
        "Example: 'I I I w-want to to go um there' not 'I want to go there'."
    ),
)
        return jsonify({
            "transcript": result["text"],
            "words": result.get("words", []),
        })
    finally:
        if os.path.exists(temp.name):
            os.remove(temp.name)