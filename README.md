# 🎙️ AI-Based Stuttering Detection and Speech Therapy Assistance System

An intelligent deep learning-based speech analysis system that automatically detects stuttering, assesses speech fluency, and provides personalized therapy recommendations through an interactive web application.

Built using **Wav2Vec2**, **BiLSTM**, **Flask**, and **React**, the system goes beyond traditional speech classification by integrating fluency assessment, transcript correction, and speech assistance features.

---

## 🚀 Features

- 🎤 Live microphone recording
- 📁 Audio file upload
- 📝 Automatic speech transcription
- 🧠 Multi-class stuttering detection
- 📊 Confidence score prediction
- 📈 Stuttering Fluency Index (SFI) calculation
- 💬 Personalized therapy recommendations
- ✍️ Transcript disfluency correction
- 💡 Context-aware next-word suggestions
- 📱 Interactive React dashboard
- ⚡ Real-time speech analysis

---

## 🏗️ System Workflow

```
Speech Input
      │
      ▼
Audio Preprocessing
      │
      ▼
Wav2Vec2 Feature Extraction
      │
      ▼
BiLSTM Classification
      │
      ├── Stutter Type
      ├── Confidence Score
      ├── Fluency Index (SFI)
      ├── Therapy Recommendation
      ├── Transcript Correction
      └── Next Word Suggestion
```

---

## 🧠 Model Architecture

- **Feature Extractor:** Wav2Vec2 Base
- **Classifier:** Bidirectional LSTM (BiLSTM)
- **Optimizer:** AdamW
- **Loss Function:** CrossEntropy Loss
- **Framework:** PyTorch

---

## 📂 Dataset

- **Dataset:** SEP-28k
- Timestamp-based speech annotations
- Multiple stuttering disfluency categories
- Audio resampled to **16 kHz** before feature extraction

---

## 🎯 Supported Speech Classes

- Normal
- Block
- Sound Repetition
- Word Repetition
- Prolongation
- Interjection

---

## 📊 Performance

| Metric | Score |
|---------|-------|
| Validation Accuracy | **80.25%** |
| Precision | **84.60%** |
| Recall | **92.24%** |
| F1-Score | **88.25%** |

---

## 📈 Stuttering Fluency Index (SFI)

The application computes a quantitative fluency score using:

- Stutter Rate (SR)
- Stutter Frequency (SF)
- Prolongation Duration (PD)
- Phrase Accuracy (PA)

The final SFI provides an overall assessment of speech fluency.

---

## 💬 Therapy Recommendation

Based on the detected stuttering type, the system recommends evidence-based speech exercises such as:

- Diaphragmatic Breathing
- Easy Onset
- Slow Speech
- Controlled Pausing
- Pacing Techniques

---

## ✍️ Transcript Correction

Example:

**Original**

```
I have w-want to-
```

**Corrected**

```
I have want to-
```

---

## 💡 Next Word Suggestions

Example predictions:

```
drink
sleep
eat
enjoy
breathe
```

---

## 🖥️ Tech Stack

### Frontend

- React.js
- Bootstrap
- Axios

### Backend

- Flask
- Python

### AI & Deep Learning

- PyTorch
- Hugging Face Transformers
- Wav2Vec2
- BiLSTM

### Audio Processing

- Librosa
- SoundFile
- FFmpeg
- NumPy
- Pandas

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/SpeechDetect.git

cd SpeechDetect
```

### Backend

```bash
cd backend

python -m venv venv
```

Activate the virtual environment.

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the Flask server:

```bash
python app.py
```

---

### Frontend

```bash
cd frontend

npm install

npm run dev
```

Open:

```
http://localhost:5173
```

---

## 📷 Screenshots

> Add screenshots of:

- Home Page
- Detection Dashboard
- Therapy Recommendation
- Analysis Summary
- SFI Components
- Transcript Correction
- Next Word Suggestions

---

## 🔮 Future Work

- Fine-tune Wav2Vec2 on larger speech datasets
- Multilingual stuttering detection
- Personalized therapy plans
- Speech progress tracking
- Mobile application
- Cloud deployment
- Therapist dashboard
- User authentication

---

## 📚 Citation

If you use this work in your research, please cite the corresponding publication (when available).

---

## 📄 License

This project is intended for educational and research purposes.

---

## 👩‍💻 Author

**Rishika A S**

B.Tech Information Technology

Artificial Intelligence | Machine Learning | Speech Processing | Full-Stack Development

⭐ If you found this project useful, consider giving it a star!
