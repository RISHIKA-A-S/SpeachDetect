# 🎤 SpeakEase – AI-Powered Stutter Detection & Fluency Enhancement System

## 📌 Overview

**SpeakEase** is a full-stack AI-powered web application designed to detect stuttering patterns and improve speech fluency in real time. It captures live speech, analyzes it using machine learning, and provides intelligent suggestions along with performance tracking through a personalized dashboard.

---

## 🚀 Features

### 🎙️ Real-Time Speech Processing

* Captures live audio using Web Speech API
* Converts speech to text instantly

### 🧠 AI-Based Stutter Detection

Detects multiple stutter types:

* Word Repetition
* Sound Repetition
* Prolongation
* Interjection
* Block

### 💡 Smart Suggestions (BERT)

* Predicts next words using NLP models
* Helps users continue speech smoothly

### 📊 Fluency Scoring

* Calculates fluency percentage
* Visual feedback with color indicators

### 📈 Dashboard Analytics

* Total sessions
* Average & best fluency
* Words per minute (WPM)
* Stutter type breakdown
* Daily streak tracking

### 🗂️ Session History

* Stores all sessions with timestamps
* Displays detailed performance metrics

### 🔐 Authentication

* JWT-based login & signup
* Secure user data handling

### 🎨 Interactive UI

* Audio visualizer
* Smooth animations using Framer Motion

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Framer Motion
* Web Speech API
* HTML5 Canvas

### Backend

* Flask (Python)
* Transformers (BERT model)
* Flask-JWT-Extended

### Database

* MongoDB

---

## 🏗️ System Architecture

```
User (Browser)
   ↓
React Frontend (Speech Capture + UI)
   ↓
Flask Backend API
   ↓
AI Model (BERT + Stutter Detection Logic)
   ↓
MongoDB Database
   ↓
Dashboard Analytics (Frontend)
```

---

## ⚙️ Installation & Setup

### 🔹 1. Clone Repository

```bash
git clone https://github.com/your-username/speakease.git
cd speakease
```

---

### 🔹 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Create a `.env` file:

```
MONGO_URI=your_mongodb_connection
JWT_SECRET_KEY=your_secret_key
```

---

### 🔹 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create `.env`:

```
VITE_API_URL=http://localhost:5000
```

---

## 🔌 API Endpoints

| Method | Endpoint                | Description         |
| ------ | ----------------------- | ------------------- |
| POST   | /api/login              | User login          |
| POST   | /api/signup             | User registration   |
| GET    | /api/profile            | Get user profile    |
| PUT    | /api/profile            | Update profile      |
| POST   | /api/process-speech     | Analyze speech      |
| GET    | /api/dashboard/stats    | Get analytics       |
| GET    | /api/dashboard/sessions | Get session history |

---

## 📊 Sample Output

### Fluency Score

```
Fluency: 82% (Excellent)
```

### Detected Stutter

```
Type: Word Repetition, Prolongation
```

### Suggestions

```
["want", "to", "go", "home"]
```

---

## 🎯 Use Cases

* Speech therapy assistance
* Public speaking practice
* Communication skill improvement
* Self-learning speech correction

---

## 🔮 Future Enhancements

* 🌍 Multilingual support
* 📱 Mobile app version
* 🎧 Emotion detection from voice
* 🤖 Personalized therapy plans
* ⌚ Wearable device integration

---

## 👩‍💻 Author

**Rishika A S**
B.Tech IT Student | Full Stack web Developer & AI & ML Enthusiast

---

## ⭐ Acknowledgements

* HuggingFace Transformers
* Web Speech API
* Open-source community

---

## 📜 License

This project is for educational and research purposes.
