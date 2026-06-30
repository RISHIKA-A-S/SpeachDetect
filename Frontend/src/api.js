import axios from "axios";

const BASE_URL = import.meta.env?.VITE_API_URL || "http://127.0.0.1:5000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

/**
 * STEP 1 — Transcribe audio (Whisper, disfluency-preserving)
 * Backend: POST /api/transcribe  (multipart/form-data, field name "audio")
 * Returns: { transcript: string, words: [...] }
 */
export const transcribeAudio = (formData) =>
  api.post("/api/transcribe", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * STEP 2 — Detect stutter from audio
 * Backend: POST /api/detect  (multipart/form-data, field name "audio")
 * Returns: { predicted_class, confidence, class_probs, reason? }
 */
export const detectStutter = (formData) =>
  api.post("/api/detect", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * STEP 3 — Correct disfluent text
 * Backend: POST /api/correct  { text: string }
 * Returns: { original, corrected, was_corrected }
 */
export const correctText = (text) =>
  api.post("/api/correct", { text });

/**
 * STEP 4 — Compute Speech Fluency Index
 * Backend: POST /api/sfi  { stutter_rate, stutter_freq, prolong_dur, phrase_acc }
 * Returns: { sfi, severity, components }
 */
export const getSFI = (stutter_rate, stutter_freq, prolong_dur, phrase_acc) =>
  api.post("/api/sfi", {
    stutter_rate,
    stutter_freq,
    prolong_dur,
    phrase_acc,
  });

/**
 * STEP 5 — Get therapy recommendation + next-word suggestions
 * Backend: POST /api/recommend  { stutter_class, severity, context }
 * IMPORTANT: key must be "context" — backend's recommend.py reads data.get("context")
 * Returns: { therapy, next_words }
 */
export const getRecommendation = (stutter_class, severity, context) =>
  api.post("/api/recommend", {
    stutter_class,
    severity,
    context,
  });

export default api;