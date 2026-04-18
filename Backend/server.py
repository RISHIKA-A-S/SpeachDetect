from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, errors
import jwt
import datetime
import bcrypt
import os

app = Flask(__name__)
CORS(app)

app.config["SECRET_KEY"] = "yoursecretkey"

# ---------------- MongoDB Connection ----------------
mongo_uri = os.getenv("MONGO_URI", "your-mongodb-uri")

try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    # Force a connection check
    client.admin.command("ping")
    print("✅ MongoDB connection successful")
except errors.ServerSelectionTimeoutError as err:
    print("❌ MongoDB connection failed:", err)
    # Optional: exit if DB is critical
    # import sys; sys.exit(1)

db = client["speech_app"]
users_collection = db["users"]
results_collection = db["results"]

# ---------------- Token Decorator ----------------
def token_required(f):
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Token missing"}), 401

        # Allow "Bearer <token>" or raw token
        if token.startswith("Bearer "):
            token = token.split(" ")[1]

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

# ---------------- Signup ----------------
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    users_collection.insert_one({"name": name, "email": email, "password": hashed_pw})

    return jsonify({"message": "Signup successful"}), 201

# ---------------- Login ----------------
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

# ---------------- Process Speech ----------------
@app.route("/api/process-speech", methods=["POST"])
@token_required
def process_speech():
    data = request.get_json()
    speech = data.get("speech", "")

    # Dummy scoring logic (replace with your real functions)
    stutters = ["Word Repetition"] if "I I I" in speech else []
    fluency_score = 0.88
    top1_words = []
    combinations = {}

    # ✅ Save to MongoDB
    results_collection.insert_one({
        "user_email": request.user,
        "speech": speech,
        "stutter_types": stutters,
        "fluency_score": fluency_score,
        "top1_words": top1_words,
        "combinations": combinations,
        "timestamp": datetime.datetime.utcnow()
    })

    return jsonify({
        "speech": speech,
        "stutter_types": stutters,
        "fluency_score": fluency_score,
        "top1_words": top1_words,
        "combinations": combinations,
        "user": request.user
    })

# ---------------- Get Results ----------------
@app.route("/api/results", methods=["GET"])
@token_required
def get_results():
    results = list(results_collection.find({"user_email": request.user}))
    for r in results:
        r["_id"] = str(r["_id"])  # convert ObjectId to string
    return jsonify({"results": results})

# ---------------- Run ----------------
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
