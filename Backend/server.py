from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, errors
from transformers import pipeline, AutoTokenizer
import jwt
import datetime
import bcrypt
import os
import re

app = Flask(__name__)
CORS(app)

app.config["SECRET_KEY"] = "yoursecretkey-must-be-at-least-32-chars!!"

# ---------------- MongoDB ----------------
mongo_uri = os.getenv("MONGO_URI", "your-mongodb-uri")

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("✅ MongoDB connected")
except errors.ServerSelectionTimeoutError as err:
    print("❌ MongoDB error:", err)

db                    = client["speech_app"]
users_collection      = db["users"]
results_collection    = db["results"]
readings_collection   = db["readings"]   # NEW: therapy reading sessions

# ---------------- LOAD MODEL ----------------
print("⏳ Loading BERT model...")
pipe      = pipeline("fill-mask", model="./local_bert", tokenizer="./local_bert")
tokenizer = AutoTokenizer.from_pretrained("./local_bert")
print("✅ BERT model loaded")


# ---------------- TOKEN MIDDLEWARE ----------------
def token_required(f):
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Token missing"}), 401
        token = auth_header.replace("Bearer ", "").strip()
        try:
            decoded      = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            request.user = decoded["email"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper


# ---------------- STUTTER DETECTION ----------------
def detect_stutter(text):
    stutters = []
    lower    = text.lower().strip()
    if re.search(r'\b(\w+)\s+\1\b', lower):
        stutters.append("Word Repetition")
    if re.search(r'\b([a-z])\W*\1\W*\w+', lower):
        stutters.append("Sound Repeat")
    if re.search(r'(.)\1{2,}', lower):
        stutters.append("Prolongation")
    if re.search(
        r'\b(um+|uh+|er+|ah+|hmm+|like|you\s+know|i\s+mean|sort\s+of|kind\s+of|basically|literally|right\?|so\s+yeah)\b',
        lower
    ):
        stutters.append("Interjection")
    if re.search(r'\.{2,}|—|\s[-–]\s', text):
        stutters.append("Block")
    return stutters if stutters else ["None"]


# ---------------- FLUENCY SCORE ----------------
def calculate_fluency(text, stutters):
    words       = text.split()
    total_words = max(len(words), 1)
    if "None" in stutters:
        return 1.0
    lower     = text.lower()
    instances = 0
    instances += len(re.findall(r'\b(\w+)\s+\1\b', lower))
    instances += len(re.findall(r'\b([a-z])\W*\1\W*\w+', lower))
    instances += len(re.findall(r'(.)\1{2,}', lower))
    instances += len(re.findall(
        r'\b(um+|uh+|er+|ah+|hmm+|like|you\s+know|i\s+mean|sort\s+of|kind\s+of|basically|literally)\b',
        lower
    ))
    instances += len(re.findall(r'\.{2,}|—|\s[-–]\s', text))
    return round(max(0.0, 1.0 - (instances / total_words)), 2)


# ---------------- BERT SUGGESTIONS ----------------
def get_suggestions(speech):
    try:
        results = pipe(speech.strip() + " [MASK]", top_k=20)
    except Exception as e:
        print(f"❌ BERT error on suggestions: {e}")
        return []
    suggestions, seen = [], set()
    for item in results:
        token = item["token_str"].strip().lower()
        if token.startswith("##") or not token.isalpha() or len(token) < 2 or token in seen:
            continue
        suggestions.append(token)
        seen.add(token)
        if len(suggestions) >= 5:
            break
    return suggestions


def get_combinations(speech, top_words):
    combinations = {}
    for word in top_words[:3]:
        try:
            results = pipe(speech.strip() + " " + word + " [MASK]", top_k=20)
        except Exception as e:
            print(f"❌ BERT error on combinations for '{word}': {e}")
            combinations[word] = []
            continue
        next_words, seen = [], set()
        for item in results:
            token = item["token_str"].strip().lower()
            if token.startswith("##") or not token.isalpha() or len(token) < 2 or token in seen or token == word:
                continue
            next_words.append(token)
            seen.add(token)
            if len(next_words) >= 3:
                break
        combinations[word] = next_words
    return combinations


# ================================================================
#  AUTH
# ================================================================

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    if users_collection.find_one({"email": data["email"]}):
        return jsonify({"error": "User already exists"}), 400
    hashed_pw = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt())
    users_collection.insert_one({
        "name":      data.get("name", ""),
        "email":     data["email"],
        "password":  hashed_pw,
        "createdAt": datetime.datetime.utcnow()
    })
    return jsonify({"message": "Signup successful"}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    user = users_collection.find_one({"email": data["email"]})
    if not user or not bcrypt.checkpw(data["password"].encode(), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401
    token = jwt.encode(
        {"email": user["email"], "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)},
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )
    return jsonify({
        "token":     token,
        "name":      user.get("name", ""),
        "email":     user.get("email", ""),
        "createdAt": user.get("createdAt", datetime.datetime.utcnow()).strftime("%Y-%m-%dT%H:%M:%SZ")
    })


@app.route("/api/profile", methods=["GET"])
@token_required
def get_profile():
    user = users_collection.find_one({"email": request.user})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "name":      user.get("name", ""),
        "email":     user.get("email", ""),
        "createdAt": user.get("createdAt", datetime.datetime.utcnow()).strftime("%Y-%m-%dT%H:%M:%SZ")
    })


@app.route("/api/profile", methods=["PUT"])
@token_required
def update_profile():
    data  = request.get_json()
    name  = data.get("name", "").strip()
    email = data.get("email", "").strip()
    if not name or not email:
        return jsonify({"error": "Name and email are required"}), 400
    if email != request.user:
        if users_collection.find_one({"email": email}):
            return jsonify({"error": "Email already in use"}), 400
    users_collection.update_one({"email": request.user}, {"$set": {"name": name, "email": email}})
    return jsonify({"name": name, "email": email})


# ================================================================
#  SPEECH (Stutter Help)
# ================================================================

@app.route("/api/process-speech", methods=["POST"])
@token_required
def process_speech():
    data   = request.get_json()
    speech = data.get("speech", "").strip()
    if not speech:
        return jsonify({"error": "No speech provided"}), 400

    print(f"\n📥 Speech from {request.user}: '{speech}'")
    stutters      = detect_stutter(speech)
    fluency_score = calculate_fluency(speech, stutters)
    top1_words    = get_suggestions(speech)
    combinations  = get_combinations(speech, top1_words)

    print(f"🗣️  Stutters: {stutters}  📊 Fluency: {fluency_score}")

    results_collection.insert_one({
        "user_email":    request.user,
        "speech":        speech,
        "stutter_types": stutters,
        "fluency_score": fluency_score,
        "top1_words":    top1_words,
        "combinations":  combinations,
        "timestamp":     datetime.datetime.utcnow()
    })

    return jsonify({
        "speech":        speech,
        "stutter_types": stutters,
        "fluency_score": fluency_score,
        "top1_words":    top1_words,
        "combinations":  combinations,
        "user":          request.user
    })


@app.route("/api/results", methods=["GET"])
@token_required
def get_results():
    results = list(results_collection.find({"user_email": request.user}))
    for r in results:
        r["_id"] = str(r["_id"])
    return jsonify({"results": results})


# ================================================================
#  THERAPY READINGS  — NEW
# ================================================================

@app.route("/api/therapy/save", methods=["POST"])
@token_required
def save_therapy_reading():
    """
    Called by the frontend when a therapy session ends (user stops recording
    or completes the passage).

    Expected body:
    {
      "passageId":    "zoo",
      "passageTitle": "Jack's Day at the Zoo",
      "totalWords":   193,
      "wordsRead":    150,
      "wpm":          95,
      "accuracy":     77,
      "fluencyScore": 0.77,
      "duration":     95       // seconds
    }
    """
    data = request.get_json()

    passage_id    = data.get("passageId", "")
    passage_title = data.get("passageTitle", "")
    total_words   = int(data.get("totalWords",   0))
    words_read    = int(data.get("wordsRead",    0))
    wpm           = int(data.get("wpm",          0))
    accuracy      = int(data.get("accuracy",     0))
    fluency_score = float(data.get("fluencyScore", 0.0))
    duration      = int(data.get("duration",     0))

    if not passage_id:
        return jsonify({"error": "passageId is required"}), 400

    readings_collection.insert_one({
        "user_email":    request.user,
        "passage_id":    passage_id,
        "passage_title": passage_title,
        "total_words":   total_words,
        "words_read":    words_read,
        "wpm":           wpm,
        "accuracy":      accuracy,
        "fluency_score": fluency_score,
        "duration":      duration,
        "timestamp":     datetime.datetime.utcnow()
    })

    return jsonify({"message": "Therapy reading saved"}), 201


@app.route("/api/therapy/results", methods=["GET"])
@token_required
def get_therapy_results():
    readings = list(
        readings_collection
        .find({"user_email": request.user})
        .sort("timestamp", -1)
        .limit(50)
    )
    for r in readings:
        r["_id"] = str(r["_id"])
        if r.get("timestamp"):
            r["timestamp"] = r["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ")
    return jsonify({"readings": readings})


# ================================================================
#  DASHBOARD
# ================================================================

@app.route("/api/dashboard/sessions", methods=["GET"])
@token_required
def dashboard_sessions():
    """
    Returns up to 50 most recent sessions combining stutter + therapy records,
    sorted newest first. Each item has a `type` field: "stutter" | "therapy".
    """
    # Stutter sessions
    stutter_raw = list(
        results_collection
        .find({"user_email": request.user})
        .sort("timestamp", -1)
        .limit(50)
    )
    # Therapy readings
    therapy_raw = list(
        readings_collection
        .find({"user_email": request.user})
        .sort("timestamp", -1)
        .limit(50)
    )

    sessions = []

    for r in stutter_raw:
        sessions.append({
            "_id":          str(r["_id"]),
            "type":         "stutter",
            "createdAt":    r["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "fluencyScore": r.get("fluency_score"),
            "stutterType":  ", ".join(r.get("stutter_types", ["None"])),
            "speech":       r.get("speech", "")[:80],
            "wpm":          None,
            "duration":     None,
        })

    for r in therapy_raw:
        sessions.append({
            "_id":          str(r["_id"]),
            "type":         "therapy",
            "createdAt":    r["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "fluencyScore": r.get("fluency_score"),
            "stutterType":  None,
            "passageTitle": r.get("passage_title", ""),
            "passageId":    r.get("passage_id", ""),
            "wordsRead":    r.get("words_read", 0),
            "totalWords":   r.get("total_words", 0),
            "accuracy":     r.get("accuracy", 0),
            "wpm":          r.get("wpm"),
            "duration":     r.get("duration"),
        })

    # Sort merged list newest-first
    sessions.sort(key=lambda x: x["createdAt"], reverse=True)
    return jsonify(sessions[:50])


@app.route("/api/dashboard/stats", methods=["GET"])
@token_required
def dashboard_stats():
    stutter_results = list(
        results_collection.find({"user_email": request.user}).sort("timestamp", -1)
    )
    therapy_results = list(
        readings_collection.find({"user_email": request.user}).sort("timestamp", -1)
    )

    total_sessions = len(stutter_results)
    total_readings = len(therapy_results)

    # ── Fluency (stutter sessions only, for backward compat) ──
    scores      = [r["fluency_score"] for r in stutter_results if r.get("fluency_score") is not None]
    avg_fluency  = round(sum(scores) / len(scores), 2) if scores else None
    best_fluency = round(max(scores), 2)               if scores else None
    last_fluency = scores[0]                           if scores else None

    # ── Therapy stats ──
    therapy_scores = [r["fluency_score"] for r in therapy_results if r.get("fluency_score") is not None]
    avg_therapy_fluency  = round(sum(therapy_scores) / len(therapy_scores), 2) if therapy_scores else None
    best_therapy_fluency = round(max(therapy_scores), 2)                       if therapy_scores else None

    wpm_values = [r["wpm"] for r in therapy_results if r.get("wpm") and r["wpm"] > 0]
    avg_wpm    = round(sum(wpm_values) / len(wpm_values)) if wpm_values else None

    therapy_minutes = sum(r.get("duration", 0) for r in therapy_results) // 60

    # ── Stutter breakdown ──
    stutter_counts = {}
    for r in stutter_results:
        for t in r.get("stutter_types", []):
            if t != "None":
                stutter_counts[t] = stutter_counts.get(t, 0) + 1

    stutter_breakdown = [
        {"type": t, "count": c}
        for t, c in sorted(stutter_counts.items(), key=lambda x: -x[1])
    ]

    # ── Passage breakdown (most-practised passages) ──
    passage_counts = {}
    for r in therapy_results:
        pid   = r.get("passage_id", "unknown")
        title = r.get("passage_title", pid)
        if pid not in passage_counts:
            passage_counts[pid] = {"title": title, "count": 0, "bestFluency": None, "bestWpm": None}
        passage_counts[pid]["count"] += 1
        fs = r.get("fluency_score")
        if fs and (passage_counts[pid]["bestFluency"] is None or fs > passage_counts[pid]["bestFluency"]):
            passage_counts[pid]["bestFluency"] = round(fs, 2)
        w = r.get("wpm")
        if w and (passage_counts[pid]["bestWpm"] is None or w > passage_counts[pid]["bestWpm"]):
            passage_counts[pid]["bestWpm"] = w

    passage_breakdown = sorted(passage_counts.values(), key=lambda x: -x["count"])

    # ── Streak ──
    today              = datetime.datetime.utcnow().date()
    all_timestamps     = (
        [r["timestamp"] for r in stutter_results if r.get("timestamp")] +
        [r["timestamp"] for r in therapy_results if r.get("timestamp")]
    )
    days_with_sessions = {ts.date() for ts in all_timestamps}
    streak, current    = 0, today
    while current in days_with_sessions:
        streak  += 1
        current  = current - datetime.timedelta(days=1)

    return jsonify({
        # Stutter
        "totalSessions":       total_sessions,
        "avgFluency":          avg_fluency,
        "bestFluency":         best_fluency,
        "lastFluency":         last_fluency,
        "stutterBreakdown":    stutter_breakdown,
        # Therapy
        "totalReadings":       total_readings,
        "avgTherapyFluency":   avg_therapy_fluency,
        "bestTherapyFluency":  best_therapy_fluency,
        "avgWpm":              avg_wpm,
        "therapyMinutes":      therapy_minutes,
        "passageBreakdown":    passage_breakdown,
        # Combined
        "totalMinutes":        total_sessions + therapy_minutes,
        "streak":              streak,
    })


# ── Run ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)