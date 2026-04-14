# from flask import Flask
# from flask_cors import CORS  
# from router import router

# app = Flask(__name__)

# CORS(app)  

# app.register_blueprint(router)

# if __name__ == '__main__':
#     app.run(debug=True, host='0.0.0.0', port=5500)
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline
import re

app = Flask(__name__)
CORS(app)

# ✅ Load model ONLY ONCE (IMPORTANT)
pipe = pipeline("fill-mask", model="./local_bert", tokenizer="./local_bert")


# 🔥 -------- STUTTER DETECTION --------
def detect_stutter(text):
    stutters = []

    # Word repetition: "I I want"
    if re.search(r'\b(\w+)\s+\1\b', text.lower()):
        stutters.append("Word Repetition")

    # Sound prolongation: "sssspeak"
    if re.search(r'(.)\1{2,}', text.lower()):
        stutters.append("Prolongation")

    # Fillers: "um", "uh"
    if re.search(r'\b(um+|uh+|like)\b', text.lower()):
        stutters.append("Interjection")

    return stutters if stutters else ["None"]


# 🔥 -------- FLUENCY SCORE --------
def calculate_fluency(text, stutters):
    words = text.split()
    total_words = len(words) if len(words) > 0 else 1

    stutter_penalty = len(stutters) if "None" not in stutters else 0
    fluency_score = max(0, 1 - (stutter_penalty / total_words))

    return round(fluency_score, 2)


# 🔥 -------- MAIN API --------
@app.route('/api/process-speech', methods=['POST'])
def process_speech():
    try:
        data = request.get_json()
        speech = data.get('speech', '').strip()

        if not speech:
            return jsonify({"error": "No speech provided"}), 400

        # 🔹 Stutter Detection
        stutters = detect_stutter(speech)

        # 🔹 Fluency Score
        fluency_score = calculate_fluency(speech, stutters)

        # 🔹 BERT Suggestions
        result1 = pipe(speech + " [MASK]")

        top1_words = [
            i['token_str'].strip()
            for i in result1[:5]
            if i['token_str'].isalpha()
        ]

        # 🔹 Word Combinations (limit to 3 for performance)
        combinations = {}
        for word1 in top1_words[:3]:
            result2 = pipe(speech + " " + word1 + " [MASK]")

            combinations[word1] = [
                j['token_str'].strip()
                for j in result2[:3]
                if j['token_str'].isalpha()
            ]

        # 🔥 FINAL RESPONSE (Frontend-compatible format)
        return jsonify({
            "speech": speech,
            "stutter_types": stutters,
            "fluency_score": fluency_score,
            "top1_words": top1_words,
            "combinations": combinations
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5500)