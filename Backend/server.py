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

app.config["SECRET_KEY"] = "yoursecretkey"

# ---------------- MongoDB ----------------
mongo_uri = os.getenv("MONGO_URI", "your-mongodb-uri")

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("✅ MongoDB connected")
except errors.ServerSelectionTimeoutError as err:
    print("❌ MongoDB error:", err)

db = client["speech_app"]
users_collection = db["users"]
results_collection = db["results"]

# ---------------- LOAD MODEL (ONLY ONCE) ----------------
# This is the BERT fill-mask pipeline saved by setup.py
print("⏳ Loading BERT model...")
pipe = pipeline("fill-mask", model="./local_bert", tokenizer="./local_bert")
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
            decoded = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
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
    """
    Detects stutter patterns directly from the transcribed speech text.
    BERT is NOT used here — it is a fill-mask model, not a classifier.
    Pattern-based detection is the correct approach for transcribed speech.

    Returns a list of detected stutter type strings, or ["None"].
    """
    stutters = []
    lower = text.lower().strip()

    # 1. Word Repetition: "I I want", "and and", "the the"
    if re.search(r'\b(\w+)\s+\1\b', lower):
        stutters.append("Word Repetition")

    # 2. Sound Repeat: "c-c-cat", "b b ball", "w- w- water"
    if re.search(r'\b([a-z])\W*\1\W*\w+', lower):
        stutters.append("Sound Repeat")

    # 3. Prolongation: same char 3+ times in sequence — "ssssomething", "noooo"
    if re.search(r'(.)\1{2,}', lower):
        stutters.append("Prolongation")

    # 4. Interjection: common filler sounds and phrases
    if re.search(
        r'\b(um+|uh+|er+|ah+|hmm+|like|you\s+know|i\s+mean|sort\s+of|kind\s+of|basically|literally|right\?|so\s+yeah)\b',
        lower
    ):
        stutters.append("Interjection")

    # 5. Block: transcript markers of silence/struggle — ellipsis, dash breaks
    if re.search(r'\.{2,}|—|\s[-–]\s', text):
        stutters.append("Block")

    return stutters if stutters else ["None"]


# ---------------- FLUENCY SCORE ----------------
def calculate_fluency(text, stutters):
    """
    Score 0.0–1.0. Counts each stutter instance individually so the
    penalty is proportional to the actual amount of disfluency.
    """
    words = text.split()
    total_words = max(len(words), 1)

    if "None" in stutters:
        return 1.0

    lower = text.lower()
    instances = 0

    instances += len(re.findall(r'\b(\w+)\s+\1\b', lower))
    instances += len(re.findall(r'\b([a-z])\W*\1\W*\w+', lower))
    instances += len(re.findall(r'(.)\1{2,}', lower))
    instances += len(re.findall(
        r'\b(um+|uh+|er+|ah+|hmm+|like|you\s+know|i\s+mean|sort\s+of|kind\s+of|basically|literally)\b',
        lower
    ))
    instances += len(re.findall(r'\.{2,}|—|\s[-–]\s', text))

    score = max(0.0, 1.0 - (instances / total_words))
    return round(score, 2)


# ---------------- BERT WORD SUGGESTIONS ----------------
def get_suggestions(speech):
    """
    Uses BERT fill-mask to predict the most likely NEXT word after the speech.
    Filters out subword tokens (##...) and non-alphabetic tokens.
    Falls back gracefully if BERT returns nothing useful.
    """
    masked_input = speech.strip() + " [MASK]"

    try:
        results = pipe(masked_input, top_k=20)  # get more candidates to filter from
    except Exception as e:
        print(f"❌ BERT error on suggestions: {e}")
        return []

    suggestions = []
    seen = set()

    for item in results:
        token = item["token_str"].strip().lower()

        # Skip subword tokens (##ing, ##ed etc), punctuation, numbers, duplicates
        if (
            token.startswith("##")
            or not token.isalpha()
            or len(token) < 2
            or token in seen
        ):
            continue

        suggestions.append(token)
        seen.add(token)

        if len(suggestions) >= 5:
            break

    return suggestions


def get_combinations(speech, top_words):
    """
    For each top suggestion, predict the word that would follow it.
    Returns a dict: { "word1": ["next1", "next2", "next3"], ... }
    """
    combinations = {}

    for word in top_words[:3]:
        masked_input = speech.strip() + " " + word + " [MASK]"

        try:
            results = pipe(masked_input, top_k=20)
        except Exception as e:
            print(f"❌ BERT error on combinations for '{word}': {e}")
            combinations[word] = []
            continue

        next_words = []
        seen = set()

        for item in results:
            token = item["token_str"].strip().lower()

            if (
                token.startswith("##")
                or not token.isalpha()
                or len(token) < 2
                or token in seen
                or token == word
            ):
                continue

            next_words.append(token)
            seen.add(token)

            if len(next_words) >= 3:
                break

        combinations[word] = next_words

    return combinations


# ---------------- SIGNUP ----------------
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()

    if users_collection.find_one({"email": data["email"]}):
        return jsonify({"error": "User already exists"}), 400

    hashed_pw = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt())

    users_collection.insert_one({
        "name":     data["name"],
        "email":    data["email"],
        "password": hashed_pw
    })

    return jsonify({"message": "Signup successful"}), 201


# ---------------- LOGIN ----------------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    user = users_collection.find_one({"email": data["email"]})

    if not user or not bcrypt.checkpw(data["password"].encode(), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
        {
            "email": user["email"],
            "exp":   datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        },
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return jsonify({"token": token})


# ---------------- PROCESS SPEECH ----------------
@app.route("/api/process-speech", methods=["POST"])
@token_required
def process_speech():
    data   = request.get_json()
    speech = data.get("speech", "").strip()

    if not speech:
        return jsonify({"error": "No speech provided"}), 400

    print(f"\n📥 Speech received from {request.user}: '{speech}'")

    # Step 1: Stutter detection (regex pattern matching on transcript)
    stutters = detect_stutter(speech)
    print(f"🗣️  Stutters detected: {stutters}")

    # Step 2: Fluency score
    fluency_score = calculate_fluency(speech, stutters)
    print(f"📊 Fluency score: {fluency_score}")

    # Step 3: BERT word suggestions (next word prediction)
    top1_words = get_suggestions(speech)
    print(f"💡 Suggestions: {top1_words}")

    # Step 4: Word combinations (word after each suggestion)
    combinations = get_combinations(speech, top1_words)
    print(f"🔗 Combinations: {combinations}")

    # Step 5: Save to MongoDB
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


# ---------------- GET RESULTS ----------------
@app.route("/api/results", methods=["GET"])
@token_required
def get_results():
    results = list(results_collection.find({"user_email": request.user}))
    for r in results:
        r["_id"] = str(r["_id"])
    return jsonify({"results": results})


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)