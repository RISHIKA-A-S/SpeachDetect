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

db                 = client["speech_app"]
users_collection   = db["users"]
results_collection = db["results"]

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
        {
            "email": user["email"],
            "exp":   datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        },
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return jsonify({
        "token":     token,
        "name":      user.get("name", ""),
        "email":     user.get("email", ""),
        "createdAt": user.get("createdAt", datetime.datetime.utcnow()).strftime("%Y-%m-%dT%H:%M:%SZ")
    })


# GET /api/profile  — fetch current user's profile
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


# PUT /api/profile  — update name / email
@app.route("/api/profile", methods=["PUT"])
@token_required
def update_profile():
    data  = request.get_json()
    name  = data.get("name", "").strip()
    email = data.get("email", "").strip()

    if not name or not email:
        return jsonify({"error": "Name and email are required"}), 400

    # Block duplicate email (only when changing email)
    if email != request.user:
        if users_collection.find_one({"email": email}):
            return jsonify({"error": "Email already in use"}), 400

    users_collection.update_one(
        {"email": request.user},
        {"$set": {"name": name, "email": email}}
    )
    return jsonify({"name": name, "email": email})


# ================================================================
#  SPEECH
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
#  DASHBOARD  —  /api/dashboard/...
# ================================================================
# ---------------- DASHBOARD SESSIONS ----------------
@app.route("/api/dashboard/sessions", methods=["GET"])
@token_required
def dashboard_sessions():
    raw = list(
        results_collection
        .find({"user_email": request.user})
        .sort("timestamp", -1)
        .limit(50)
    )

    sessions = []
    for r in raw:
        sessions.append({
            "_id":          str(r["_id"]),
            "type":         "stutter",
            "createdAt":    r["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "fluencyScore": r.get("fluency_score"),
            "stutterType":  ", ".join(r.get("stutter_types", ["None"])),
            "speech":       r.get("speech", "")[:80],
        })

    return jsonify(sessions)


# ---------------- DASHBOARD STATS ----------------
@app.route("/api/dashboard/stats", methods=["GET"])
@token_required
def dashboard_stats():
    all_results = list(
        results_collection
        .find({"user_email": request.user})
        .sort("timestamp", -1)
    )

    total_sessions = len(all_results)

    if total_sessions == 0:
        return jsonify({
            "totalSessions":    0,
            "totalReadings":    0,
            "avgFluency":       None,
            "bestFluency":      None,
            "lastFluency":      None,
            "avgWpm":           None,
            "totalMinutes":     0,
            "streak":           0,
            "stutterBreakdown": [],
        })

    scores       = [r["fluency_score"] for r in all_results if r.get("fluency_score") is not None]
    avg_fluency  = round(sum(scores) / len(scores), 2) if scores else None
    best_fluency = round(max(scores), 2)               if scores else None
    last_fluency = scores[0]                           if scores else None

    stutter_counts = {}
    for r in all_results:
        for t in r.get("stutter_types", []):
            if t != "None":
                stutter_counts[t] = stutter_counts.get(t, 0) + 1

    stutter_breakdown = [
        {"type": t, "count": c}
        for t, c in sorted(stutter_counts.items(), key=lambda x: -x[1])
    ]

    today              = datetime.datetime.utcnow().date()
    days_with_sessions = {r["timestamp"].date() for r in all_results if r.get("timestamp")}
    streak, current    = 0, today
    while current in days_with_sessions:
        streak  += 1
        current  = current - datetime.timedelta(days=1)

    return jsonify({
        "totalSessions":    total_sessions,
        "totalReadings":    0,
        "avgFluency":       avg_fluency,
        "bestFluency":      best_fluency,
        "lastFluency":      last_fluency,
        "avgWpm":           None,
        "totalMinutes":     total_sessions,
        "streak":           streak,
        "stutterBreakdown": stutter_breakdown,
    })


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
