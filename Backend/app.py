import os
from flask import Flask, jsonify
from flask_cors import CORS

from routes.detect    import detect_bp
from routes.correct   import correct_bp
from routes.recommend import recommend_bp
from routes.sfi       import sfi_bp
from routes.transcribe import transcribe_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(detect_bp)
app.register_blueprint(correct_bp)
app.register_blueprint(recommend_bp)
app.register_blueprint(sfi_bp)
app.register_blueprint(transcribe_bp)

@app.route("/")
def home():
    return jsonify({"status": "Backend running", "message": "SpeechDetect API is active"})

if __name__ == "__main__":
    app.run(debug=False, use_reloader=False, host="0.0.0.0", port=int(os.getenv("PORT", "5000")))