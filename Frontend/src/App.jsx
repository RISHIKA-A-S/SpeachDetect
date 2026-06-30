import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AudioRecorder from "./components/AudioRecorder";
import DetectionPanel from "./components/DetectionPanel";
import CorrectionPanel from "./components/CorrectionPanel";
import SFIGauge from "./components/SFIGauge";
import NextWordBar from "./components/NextWordBar";
import TherapyCard from "./components/TherapyCard";
import SFIComponents from "./components/SFIComponents";
import { detectStutter, correctText, getRecommendation, getSFI, transcribeAudio } from "./api";
import "./index.css";

export default function App() {
  const [audioUrl,      setAudioUrl]      = useState(null);
  const [detection,     setDetection]     = useState(null);
  const [correction,    setCorrection]    = useState(null);
  const [sfiResult,     setSfiResult]     = useState(null);
  const [therapy,       setTherapy]       = useState(null);
  const [nextWords,     setNextWords]     = useState([]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [pipelineSteps, setPipelineSteps] = useState([]);

  const rawTranscriptRef = useRef("");

  const addStep = (label) =>
    setPipelineSteps((prev) => [...prev, label]);

  const handleAudio = async (file, url) => {
    if (!file || !(file instanceof Blob)) {
      setError("Recorder did not produce a valid audio file. Please try again.");
      return;
    }

    setAudioUrl(url);
    setLoading(true);
    setError(null);
    setPipelineSteps([]);

    setDetection(null);
    setCorrection(null);
    setSfiResult(null);
    setTherapy(null);
    setNextWords([]);
    setRawTranscript("");
    rawTranscriptRef.current = "";

    try {
      // ── STEP 1: Transcribe ────────────────────────────────
      const fd1 = new FormData();
      fd1.append("audio", file, file.name || "recording.wav");

      const transcribeRes = await transcribeAudio(fd1);
      const speechData = transcribeRes.data ?? transcribeRes;

      const rawText = (
        speechData?.transcript ??
        speechData?.text ??
        speechData?.transcription ??
        speechData?.result ??
        ""
      );

      const raw = (typeof rawText === "string" ? rawText : rawText?.transcript ?? "").trim();

      if (!raw) {
        throw new Error(
          "Transcription came back empty. " +
          "Make sure your /api/transcribe endpoint returns { transcript: '...' } " +
          "and that your microphone captured audio."
        );
      }

      rawTranscriptRef.current = raw;
      setRawTranscript(raw);
      addStep("✅ Transcript Generated");

      // ── STEP 2: Detect ────────────────────────────────────
      const fd2 = new FormData();
      fd2.append("audio", file, file.name || "recording.wav");

      const detectRes = await detectStutter(fd2);
      const det = detectRes.data ?? detectRes;

      if (!det || !det.predicted_class) {
        throw new Error(
          "Detection response is missing predicted_class. Check your /api/detect endpoint."
        );
      }

      setDetection(det);
      addStep("✅ Stutter Detected");

      // ── STEP 3: Correct ───────────────────────────────────
      const correctRes = await correctText(rawTranscriptRef.current);
      const corrRaw = correctRes.data ?? correctRes;

      const safeCorrection = {
        original: rawTranscriptRef.current,
        corrected: (
          corrRaw?.corrected ??
          corrRaw?.corrected_text ??
          corrRaw?.text ??
          corrRaw?.result ??
          rawTranscriptRef.current
        ),
      };

      setCorrection(safeCorrection);
      addStep("✅ Correction Ready");

      // ── STEP 4: SFI ───────────────────────────────────────
      const isStutter = det.predicted_class !== "Normal";
      const sr = isStutter ? (det.confidence ?? 0.5) * 0.4 : 0.02;
      const sf = isStutter ? sr * 20  : 0.5;
      const pd = isStutter ? sr * 1.5 : 0.0;
      const pa = isStutter ? 1 - sr   : 0.98;

      const sfiRes = await getSFI(sr, sf, pd, pa);
      const sfiData = sfiRes.data ?? sfiRes;
      setSfiResult(sfiData);
      addStep("✅ SFI Calculated");

      // ── STEP 5: Recommend ─────────────────────────────────
      // api.js sends { stutter_class, severity, context } —
      // matches backend's data.get("context") exactly
      const recRes = await getRecommendation(
        det.predicted_class,
        sfiData?.severity ?? "Mild",
        safeCorrection.corrected,
      );
      const recData = recRes.data ?? recRes;

      const rawWords = recData?.next_words ?? recData?.therapy?.next_words ?? [];
      const safeWords = Array.isArray(rawWords)
        ? rawWords.filter((w) => typeof w === "string" && w.trim().length > 0)
        : [];

      const therapyObj = recData?.therapy ?? recData;
      setTherapy(therapyObj);
      setNextWords(safeWords);
      addStep("✅ Therapy Generated");

    } catch (err) {
      console.error("[SpeakEase] Pipeline error:", err);
      setError(
        err?.response?.data?.error ??
        err?.response?.data?.message ??
        err?.message ??
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const hasResults = !!(detection && correction && sfiResult && therapy);

  return (
    <div className="app">

      {/* ── Hero ── */}
      <div className="app-hero">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Start Detecting Stutters
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          Speak naturally and let our AI help improve your speech fluency in real time.
        </motion.p>
      </div>

      <div className="section">

        {/* ── Live Speech Visualizer ── */}
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Live Speech Visualizer
        </motion.h2>

        <div className="recorder-wrap">
          <AudioRecorder onAudioReady={handleAudio} />
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              className="loading-bar"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              🎙 Processing audio…
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              className="error-bar"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!loading && pipelineSteps.length > 0 && (
            <motion.div
              className="pipeline-status"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {pipelineSteps.map((step, i) => (
                <div key={i}>{step}</div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {rawTranscript && (
          <motion.div
            className="panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h3>
              📝 Transcript{" "}
              <span className="transcript-badge">raw — disfluencies preserved</span>
            </h3>
            <textarea
              className="transcript-area"
              value={rawTranscript}
              readOnly
              rows={4}
            />
          </motion.div>
        )}

        {nextWords.length > 0 && (
          <NextWordBar
            words={nextWords}
            onSelect={(w) => setRawTranscript((t) => (t + " " + w).trim())}
          />
        )}

        {/* ── Analysis Results ── */}
        {hasResults && (
          <>
            <motion.h2
              className="section-title"
              style={{ marginTop: "3.5rem" }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              Analysis Results
            </motion.h2>

            <div className="cards-grid">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
              >
                <DetectionPanel result={detection} audioUrl={audioUrl} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                viewport={{ once: true }}
              >
                <SFIGauge sfi={sfiResult?.sfi} severity={sfiResult?.severity} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16 }}
                viewport={{ once: true }}
              >
                <SFIComponents components={sfiResult?.components} />
              </motion.div>
            </div>

            <motion.div
              style={{ marginTop: "1.75rem" }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              <CorrectionPanel
                original={correction.original}
                corrected={correction.corrected}
              />
            </motion.div>

            <motion.div
              className="therapy-card"
              style={{ marginTop: "1.75rem" }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="therapy-label">✨ Therapy Recommendation</div>
              <TherapyCard therapy={therapy} />
            </motion.div>

            <motion.div
              className="panel summary-card"
              style={{ marginTop: "1.75rem" }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
            >
              <h3>📊 Analysis Summary</h3>
              <div className="summary-grid">
                <div className="summary-cell">
                  <div className="summary-cell-label">Detected Type</div>
                  <div className="summary-cell-val">{detection?.predicted_class}</div>
                </div>
                <div className="summary-cell">
                  <div className="summary-cell-label">Confidence</div>
                  <div className="summary-cell-val">
                    {((detection?.confidence ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="summary-cell">
                  <div className="summary-cell-label">SFI Score</div>
                  <div className="summary-cell-val">{sfiResult?.sfi}</div>
                </div>
                <div className="summary-cell">
                  <div className="summary-cell-label">Severity</div>
                  <div className="summary-cell-val">{sfiResult?.severity}</div>
                </div>
                <div className="summary-cell">
                  <div className="summary-cell-label">Therapy</div>
                  <div className="summary-cell-val summary-cell-val--sm">
                    {therapy?.exercise ?? therapy?.name ?? "—"}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* ── How it works ── */}
        <motion.h2
          className="section-title"
          style={{ marginTop: "5rem" }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          How SPEAKEASE Works
        </motion.h2>

        <div className="how-grid">
          {[
            { icon: "🎙️", title: "Speech Capture",    desc: "Real-time audio captured directly from your microphone." },
            { icon: "🔍", title: "Stutter Detection", desc: "Pattern analysis identifies stutter types from your transcript." },
            { icon: "🏷️", title: "Classification",    desc: "Categorises blocks, prolongations, repetitions, and more." },
            { icon: "✨", title: "Smart Suggestions", desc: "BERT predicts the most likely next words to aid fluency." },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="how-item"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.09, duration: 0.45 }}
              viewport={{ once: true }}
            >
              <div className="how-icon">{item.icon}</div>
              <div className="how-title">{item.title}</div>
              <div className="how-desc">{item.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Tips ── */}
        <motion.h2
          className="section-title"
          style={{ marginTop: "5rem" }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Tips for Best Results
        </motion.h2>

        <motion.div
          className="tips-list-wrap"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h3>💡 Quick Tips</h3>
          <ul className="tips-list">
            <li>Speak in a quiet environment with minimal background noise.</li>
            <li>Position yourself close to your microphone.</li>
            <li>Speak at a natural pace — do not rush.</li>
            <li>Click a suggestion to append it to your transcript.</li>
            <li>Pay attention to the detected stutter type to understand your patterns.</li>
            <li>The more you practise, the better our system adapts to you.</li>
          </ul>
        </motion.div>

      </div>
    </div>
  );
}