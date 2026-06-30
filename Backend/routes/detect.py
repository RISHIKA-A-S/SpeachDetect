from flask import Blueprint, request, jsonify
import os
import tempfile

from config import CLASSES
from models.stutter_detector import analyze_audio_for_stutter

detect_bp = Blueprint("detect", __name__)

try:
    from features.audio_preprocessor import preprocess
except Exception:
    preprocess = None

try:
    import librosa
except Exception:
    librosa = None

@detect_bp.route("/api/detect", methods=["POST"])
def detect():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    f = request.files["audio"]
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp_path = tmp.name
    f.save(tmp_path)

    try:
        clean_path = preprocess(tmp_path) if preprocess is not None else tmp_path

        if librosa is not None:
            audio, sample_rate = librosa.load(clean_path, sr=16000, mono=True)
        else:
            audio = []
            sample_rate = 16000

        result = analyze_audio_for_stutter(audio, sample_rate=sample_rate)
        result["predicted_class"] = result.get("predicted_class", "Normal")
        result["confidence"] = float(round(result.get("confidence", 0.5), 4))

        class_probs = {cls: 0.0 for cls in CLASSES}
        predicted = result["predicted_class"]
        class_probs[predicted] = result["confidence"]
        if predicted != "Normal":
            class_probs["Normal"] = round(max(0.01, 1.0 - result["confidence"]), 4)
        else:
            class_probs["Normal"] = round(max(0.5, 1.0 - result["confidence"]), 4)
        result["class_probs"] = class_probs

        return jsonify(result)

    except Exception as e:
        print("Detection Error:", str(e))
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)