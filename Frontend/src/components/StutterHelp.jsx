import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './StutterHelp.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';

const HOW_IT_WORKS = [
  { icon: '🎤', title: 'Speech Capture',   desc: 'Real-time audio captured directly from your microphone.' },
  { icon: '🔍', title: 'Stutter Detection', desc: 'Advanced ML algorithms identify stutter patterns instantly.' },
  { icon: '🧩', title: 'Classification',   desc: 'Categorises blocks, prolongations, repetitions, and more.' },
  { icon: '✨', title: 'Smart Suggestions', desc: 'Word suggestions and combinations to aid fluency.' },
];

const TIPS = [
  'Speak in a quiet environment with minimal background noise.',
  'Position yourself close to your microphone.',
  'Speak at a natural pace — do not rush.',
  'Click a suggestion once to add it, click again to remove it.',
  'Pay attention to the detected stutter type to understand your patterns.',
  'The more you practise, the better our system adapts to you.',
];

const StutterHelp = () => {
  const navigate = useNavigate();

  const [isRecording,       setIsRecording]       = useState(false);
  const [transcribedText,   setTranscribedText]   = useState('');
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [suggestions,       setSuggestions]       = useState([]);
  const [combinations,      setCombinations]      = useState({});
  const [addedWords,        setAddedWords]        = useState({});
  const [stutterType,       setStutterType]       = useState('');
  const [stutterDetails,    setStutterDetails]    = useState('');
  const [fluencyScore,      setFluencyScore]      = useState(0);
  const [isLoading,         setIsLoading]         = useState(false);

  const audioContextRef    = useRef(null);
  const analyserRef        = useRef(null);
  const mediaStreamRef     = useRef(null);
  const recognitionRef     = useRef(null);
  const canvasRef          = useRef(null);
  const animationFrameRef  = useRef(null);
  const wavesCanvasRef     = useRef(null);
  const recognitionActiveRef = useRef(false);

  /* ── Speech Recognition setup ─────────────────────────── */
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support the Web Speech API. Please try Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous     = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      let interim  = '';
      let final    = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
          sendToBackend(final);
        } else {
          interim += t;
        }
      }

      setTranscribedText(final || interim);
      setAddedWords({});
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access is required for speech recognition.');
      }
    };
  }, []);

  /* ── Canvas init + cleanup ────────────────────────────── */
  useEffect(() => {
    if (canvasRef.current && wavesCanvasRef.current) {
      initializeCanvas();
    }

    const handleResize = () => {
      if (wavesCanvasRef.current) {
        wavesCanvasRef.current.width = window.innerWidth;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current)  cancelAnimationFrame(animationFrameRef.current);
      if (mediaStreamRef.current)     mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (recognitionRef.current && recognitionActiveRef.current) recognitionRef.current.stop();
    };
  }, []);

  const initializeCanvas = () => {
    const canvas      = canvasRef.current;
    const wavesCanvas = wavesCanvasRef.current;
    canvas.width      = 260;
    canvas.height     = 260;
    wavesCanvas.width = window.innerWidth;
    wavesCanvas.height = 300;
  };

  /* ── Backend call ─────────────────────────────────────── */
  const sendToBackend = async (text) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/process-speech`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ speech: text }),
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data.top1_words)              setSuggestions(data.top1_words);
      if (data.combinations)            setCombinations(data.combinations);
      if (data.fluency_score !== undefined) setFluencyScore(data.fluency_score);

      if (data.stutter_types && data.stutter_types[0] !== 'None') {
        setStutterType(data.stutter_types.join(', '));
        setStutterDetails('');
      } else {
        setStutterType('');
        setStutterDetails('');
      }
    } catch (err) {
      console.error('Backend error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Recording toggle ─────────────────────────────────── */
  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current     = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        startVisualization();

        if (recognitionRef.current) {
          recognitionRef.current.start();
          recognitionActiveRef.current = true;
          setRecognitionActive(true);
        }

        setIsRecording(true);
        setStutterType('');
        setStutterDetails('');
      } catch (err) {
        console.error('Microphone error:', err);
        alert('Please allow microphone access to use this feature.');
      }
    } else {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());

      if (recognitionRef.current && recognitionActiveRef.current) {
        recognitionRef.current.stop();
        recognitionActiveRef.current = false;
        setRecognitionActive(false);
      }

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      // Clear canvases
      if (canvasRef.current) {
        canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      if (wavesCanvasRef.current) {
        wavesCanvasRef.current.getContext('2d').clearRect(0, 0, wavesCanvasRef.current.width, wavesCanvasRef.current.height);
      }

      setIsRecording(false);
    }
  };

  /* ── Visualisation ────────────────────────────────────── */
  const startVisualization = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray    = new Uint8Array(bufferLength);
    const canvas       = canvasRef.current;
    const ctx          = canvas.getContext('2d');
    const wavesCanvas  = wavesCanvasRef.current;
    const wavesCtx     = wavesCanvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r  = Math.min(cx, cy) - 10;

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      wavesCtx.clearRect(0, 0, wavesCanvas.width, wavesCanvas.height);

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(79, 70, 229, 0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Frequency bars
      const step = (2 * Math.PI) / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const barH = dataArray[i] / 2;
        const angle = i * step;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r,           cy + Math.sin(angle) * r);
        ctx.lineTo(cx + Math.cos(angle) * (r + barH),  cy + Math.sin(angle) * (r + barH));
        ctx.lineWidth = 2;
        ctx.strokeStyle = `hsla(${(i / bufferLength) * 240}, 100%, 55%, 0.85)`;
        ctx.stroke();
      }

      drawWaves(wavesCtx, wavesCanvas.width, wavesCanvas.height, dataArray);
    };

    render();
  };

  const drawWaves = (ctx, w, h, dataArray) => {
    const time = Date.now() * 0.001;
    for (let wi = 0; wi < 3; wi++) {
      const alpha = 0.3 - wi * 0.08;
      const amp   = 1  - wi * 0.2;
      const avg   = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
      const dynAmp = Math.max(5, avg * 0.5 * amp);

      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x < w; x += 5) {
        const y = Math.sin(x * 0.01 + time * (wi + 1) * 0.5) * dynAmp
                + Math.sin(x * 0.02 - time * (wi + 1) * 0.7) * dynAmp * 0.5
                + h / 2;
        ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0,   `rgba(124,58,237,${alpha})`);
      g.addColorStop(0.5, `rgba(79,70,229,${alpha})`);
      g.addColorStop(1,   `rgba(124,58,237,${alpha})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  /* ── Word toggle helpers ──────────────────────────────── */
  const toggleWord = (word) => {
    if (addedWords[word]) {
      setTranscribedText(prev => prev.replace(new RegExp(`\\s${word}\\b`, 'g'), ''));
      setAddedWords(prev => ({ ...prev, [word]: false }));
    } else {
      setTranscribedText(prev => `${prev} ${word}`);
      setAddedWords(prev => ({ ...prev, [word]: true }));
    }
  };

  const toggleCombination = (prefix, word) => {
    const combo = `${prefix} ${word}`;
    if (addedWords[combo]) {
      setTranscribedText(prev => prev.replace(new RegExp(`\\s${prefix}\\s${word}\\b`, 'g'), ''));
      setAddedWords(prev => ({ ...prev, [combo]: false }));
    } else {
      setTranscribedText(prev => `${prev} ${combo}`);
      setAddedWords(prev => ({ ...prev, [combo]: true }));
    }
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="stutter-help-container">

      {/* ── HERO ── */}
      <motion.section
        className="sh-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>Start Detecting Stutters</h1>
        <p>Speak naturally and let our AI help improve your speech fluency in real time.</p>

        <div className="sh-hero-wave">
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
            <path fill="#ffffff" fillOpacity="1"
              d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L0,120Z" />
          </svg>
        </div>
      </motion.section>

      {/* ── VISUALIZER ── */}
      <section className="sh-visualizer-section">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Live Speech Visualizer
        </motion.h2>
        <p>Press record and start speaking — watch your voice come alive.</p>

        <motion.div
          className="sh-visualization-container"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <canvas ref={wavesCanvasRef} className="sh-waves-canvas" />

          <div className="sh-record-section">
            <canvas ref={canvasRef} className="sh-visualizer-canvas" />

            <motion.button
              className={`sh-record-button ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isRecording ? (
                <><span className="sh-recording-icon" />Recording...</>
              ) : (
                <>🎙 Start Recording</>
              )}
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── RESULTS ── */}
      <section className="sh-results-section">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Analysis Results
        </motion.h2>

        <div className="sh-results-grid">

          {/* Speech Recognition Card */}
          <motion.div
            className="sh-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="sh-card-header">
              <span className="sh-card-icon">🗣️</span>
              <h3>Speech Recognition</h3>
            </div>

            <div className="sh-text-display">
              {transcribedText || (
                <span className="sh-placeholder">Your speech will appear here as you speak…</span>
              )}
            </div>

            {fluencyScore > 0 && (
              <div className="sh-fluency-box">
                <h4>Fluency Score</h4>
                <div className="sh-fluency-percentage">{Math.round(fluencyScore * 100)}%</div>
                <div className="sh-fluency-bar">
                  <div className="sh-fluency-fill" style={{ width: `${fluencyScore * 100}%` }} />
                </div>
              </div>
            )}

            {stutterType && (
              <div className="sh-stutter-box">
                <h4>Detected Stutter Type</h4>
                <div className="sh-stutter-badge">
                  <span className="sh-stutter-type">{stutterType}</span>
                  {stutterDetails && <p className="sh-stutter-description">{stutterDetails}</p>}
                </div>
              </div>
            )}
          </motion.div>

          {/* Suggestions Card */}
          <motion.div
            className="sh-card purple"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="sh-card-header">
              <span className="sh-card-icon">💡</span>
              <h3>Suggested Words</h3>
            </div>

            <div className="sh-suggestions-group">
              <p className="sh-suggestions-label">Single Words</p>
              <div className="sh-chips">
                {suggestions.length > 0 ? suggestions.map((word, i) => (
                  <button
                    key={i}
                    className={`sh-chip ${addedWords[word] ? 'active' : ''}`}
                    onClick={() => toggleWord(word)}
                  >
                    {word}
                  </button>
                )) : (
                  <span className="sh-empty">No suggestions yet…</span>
                )}
              </div>
            </div>

            <div className="sh-suggestions-group">
              <p className="sh-suggestions-label">Word Combinations</p>
              <div className="sh-chips">
                {Object.keys(combinations).length > 0 ? (
                  Object.entries(combinations).flatMap(([prefix, words]) =>
                    words.map(word => {
                      const combo = `${prefix} ${word}`;
                      return (
                        <button
                          key={combo}
                          className={`sh-chip combo ${addedWords[combo] ? 'active' : ''}`}
                          onClick={() => toggleCombination(prefix, word)}
                        >
                          {combo}
                        </button>
                      );
                    })
                  )
                ) : (
                  <span className="sh-empty">No combinations yet…</span>
                )}
              </div>
            </div>

            {isLoading && (
              <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '1rem' }}>
                ⏳ Analysing speech…
              </p>
            )}
          </motion.div>

        </div>
      </section>

      {/* ── HOW IT WORKS (mirrors workflow-section) ── */}
      <section className="sh-info-section">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          How SPEAKEASE Works
        </motion.h2>

        <div className="sh-info-grid">
          {HOW_IT_WORKS.map((item, i) => (
            <motion.div
              className="sh-info-card"
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="sh-info-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── TIPS (mirrors mission-section card) ── */}
      <section className="sh-tips-section">
        <motion.div
          className="sh-tips-inner"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h3>💬 Tips for Best Results</h3>
          <ul>
            {TIPS.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </motion.div>
      </section>

    </div>
  );
};

export default StutterHelp;