from flask import Blueprint, request, jsonify
from models.sfi_calculator import compute_sfi

sfi_bp = Blueprint("sfi", __name__)

@sfi_bp.route("/api/sfi", methods=["POST"])
def sfi():
    data = request.get_json()
    try:
        result = compute_sfi(
            stutter_rate=float(data["stutter_rate"]),
            stutter_freq=float(data["stutter_freq"]),
            prolong_dur=float(data["prolong_dur"]),
            phrase_acc=float(data["phrase_acc"]),
        )
    except (KeyError, ValueError) as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(result)