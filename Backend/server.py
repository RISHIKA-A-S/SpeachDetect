from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, errors
import bcrypt
import jwt
import datetime
import re
from transformers import pipeline
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app,
     resources={r"/api/*": {"origins": "http://localhost:5173"}},
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "OPTIONS"])

# Secret key for JWT
app.config['SECRET_KEY'] = os.getenv("JWT_SECRET", "fallback_secret")

# MongoDB connection with checkpoint
mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")  # Connection check
    print("✅ MongoDB connection successful")
except errors.ServerSelectionTimeoutError as err:
    print("❌ MongoDB connection failed:", err)
    # Optional: exit if DB is critical
    # import sys; sys.exit(1)

db = client["speech_app"]
users_collection = db["users"]

# Load BERT model once
pipe = pipeline("fill-mask", model="./local_bert", tokenizer="./local_bert")

# ---------------- AUTH ROUTES ---------------- #
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    users_collection.insert_one({
        "name": name,
        "email": email,
        "password": hashed_pw
    })

    return jsonify({"message": "Signup successful"}), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = users_collection.find_one({"email": email})
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = jwt.encode(
        {"email": email, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
        app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return jsonify({"token": token})


# ---------------- JWT PROTECTION ---------------- #
def token_required(f):
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token missing"}), 401
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


# ---------------- SPEECH PROCESSING ---------------- #
def detect_stutter(text):
    stutters = []
    if re.search(r'\b(\w+)\s+\1\b', text.lower()):
        stutters.append("Word Repetition")
    if re.search(r'(.)\1{2,}', text.lower()):
        stutters.append("Prolongation")
    if re.search(r'\b(um+|uh+|like)\b', text.lower()):
        stutters.append("Interjection")
    return stutters if stutters else ["None"]

def calculate_fluency(text, stutters):
    words = text.split()
    total_words = len(words) if len(words) > 0 else 1
    stutter_penalty = len(stutters) if "None" not in stutters else 0
    fluency_score = max(0, 1 - (stutter_penalty / total_words))
    return round(fluency_score, 2)


@app.route('/api/process-speech', methods=['POST'])
@token_required
def process_speech():
    data = request.get_json()
    speech = data.get('speech', '').strip()

    if not speech:
        return jsonify({"error": "No speech provided"}), 400

    stutters = detect_stutter(speech)
    fluency_score = calculate_fluency(speech, stutters)

    result1 = pipe(speech + " [MASK]")
    top1_words = [i['token_str'].strip() for i in result1[:5] if i['token_str'].isalpha()]

    combinations = {}
    for word1 in top1_words[:3]:
        result2 = pipe(speech + " " + word1 + " [MASK]")
        combinations[word1] = [j['token_str'].strip() for j in result2[:3] if j['token_str'].isalpha()]

    return jsonify({
        "speech": speech,
        "user": request.user,
        "stutter_types": stutters,
        "fluency_score": fluency_score,
        "top1_words": top1_words,
        "combinations": combinations
    })


if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
