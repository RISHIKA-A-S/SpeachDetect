import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './StutterHelp.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const HOW_IT_WORKS = [
  { icon: '🎤', title: 'Speech Capture',    desc: 'Real-time audio captured directly from your microphone.' },
  { icon: '🔍', title: 'Stutter Detection', desc: 'Pattern analysis identifies stutter types from your transcript.' },
  { icon: '🧩', title: 'Classification',    desc: 'Categorises blocks, prolongations, repetitions, and more.' },
  { icon: '✨', title: 'Smart Suggestions', desc: 'BERT predicts the most likely next words to aid fluency.' },
];

const STUTTER_DESCRIPTIONS = {
  'Word Repetition': 'Repetition of whole words — e.g. "I I want to go".',
  'Sound Repeat':    'Letter-level repetitions — e.g. "c-c-cat" or "b b ball".',
  'Prolongation':    'Stretched sounds — e.g. "ssssomething" or "noooo".',
  'Interjection':    'Filler sounds inserted — e.g. "um", "uh", "like", "you know".',
  'Block':           'Silence or struggle artefacts in the transcript — e.g. "...".',
};

const TIPS = [
  'Speak in a quiet environment with minimal background noise.',
  'Position yourself close to your microphone.',
  'Speak at a natural pace — do not rush.',
  'Click a suggestion once to add it, click again to remove it.',
  'Pay attention to the detected stutter type to understand your patterns.',
  'The more you practise, the better our system adapts to you.',
];

const StutterHelp = () => {
  const [isRecording,     setIsRecording]     = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [suggestions,     setSuggestions]     = useState([]);
  const [combinations,    setCombinations]    = useState({});
  const [addedWords,      setAddedWords]      = useState({});
  const [stutterType,     setStutterType]     = useState('');
  const [stutterDetails,  setStutterDetails]  = useState('');
  const [fluencyScore,    setFluencyScore]    = useState(null);
  const [isLoading,       setIsLoading]       = useState(false);
  const [statusMsg,       setStatusMsg]       = useState('');

  const audioContextRef      = useRef(null);
  const analyserRef          = useRef(null);
  const mediaStreamRef       = useRef(null);
  const recognitionRef       = useRef(null);
  const canvasRef            = useRef(null);
  const animationFrameRef    = useRef(null);
  const wavesCanvasRef       = useRef(null);
  const recognitionActiveRef = useRef(false);

  /* ── Speech Recognition ─────────────────────────────────── */
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support the Web Speech API. Please use Chrome or Edge.');
      return;
    }

    const SR = window.webkitSpeechRecognition;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous     = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang           = 'en-US';

    recognitionRef.current.onresult = (event) => {
      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
          sendToBackend(final.trim());
        } else {
          interim += t;
        }
      }

      setTranscribedText(final || interim);
      setAddedWords({});
    };

    recognitionRef.current.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      if (e.error === 'not-allowed') alert('Microphone access is required.');
    };
  }, []);

  /* ── Canvas init ────────────────────────────────────────── */
  useEffect(() => {
    if (canvasRef.current && wavesCanvasRef.current) {
      canvasRef.current.width       = 260;
      canvasRef.current.height      = 260;
      wavesCanvasRef.current.width  = window.innerWidth;
      wavesCanvasRef.current.height = 300;
    }

    const onResize = () => {
      if (wavesCanvasRef.current) wavesCanvasRef.current.width = window.innerWidth;
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mediaStreamRef.current)    mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (recognitionRef.current && recognitionActiveRef.current) recognitionRef.current.stop();
    };
  }, []);

  /* ── Backend call ───────────────────────────────────────── */
  const sendToBackend = async (text) => {
    if (!text || text.length < 2) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setStatusMsg('⚠️ You must be logged in. Please log in first.');
      return;
    }

    setIsLoading(true);
    setStatusMsg('⏳ Analysing speech…');

    try {
      console.log(`📤 Sending to backend: "${text}"`);
      console.log(`🔑 Token present: ${!!token}`);

      const response = await fetch(`${API_URL}/api/process-speech`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ speech: text }),
      });

      console.log(`📡 Response status: ${response.status}`);

      if (response.status === 401) {
        setStatusMsg('⚠️ Session expired — please log in again.');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const err = await response.text();
        console.error('Backend error:', err);
        setStatusMsg(`❌ Server error (${response.status})`);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('✅ Backend response:', data);

      /* ── Suggestions ── */
      if (Array.isArray(data.top1_words) && data.top1_words.length > 0) {
        setSuggestions(data.top1_words);
      } else {
        setSuggestions([]);
        console.warn('⚠️ No suggestions returned from backend');
      }

      /* ── Combinations ── */
      if (data.combinations && Object.keys(data.combinations).length > 0) {
        setCombinations(data.combinations);
      } else {
        setCombinations({});
      }

      /* ── Fluency score ── */
      if (data.fluency_score !== undefined && data.fluency_score !== null) {
        setFluencyScore(data.fluency_score);
      }

      /* ── Stutter types ── */
      if (
        Array.isArray(data.stutter_types) &&
        data.stutter_types.length > 0 &&
        data.stutter_types[0] !== 'None'
      ) {
        const types = data.stutter_types;
        setStutterType(types.join(', '));
        setStutterDetails(
          types.map(t => STUTTER_DESCRIPTIONS[t] || t).join(' | ')
        );
      } else {
        setStutterType('');
        setStutterDetails('');
      }

      setStatusMsg('');
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setStatusMsg('❌ Could not reach the server. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Recording toggle ───────────────────────────────────── */
  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current     = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        audioContextRef.current
          .createMediaStreamSource(stream)
          .connect(analyserRef.current);

        startVisualization();

        if (recognitionRef.current) {
          recognitionRef.current.start();
          recognitionActiveRef.current = true;
        }

        setIsRecording(true);
        setStutterType('');
        setStutterDetails('');
        setSuggestions([]);
        setCombinations({});
        setFluencyScore(null);
        setStatusMsg('');
      } catch (err) {
        console.error('Microphone error:', err);
        alert('Please allow microphone access to use this feature.');
      }
    } else {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());

      if (recognitionRef.current && recognitionActiveRef.current) {
        recognitionRef.current.stop();
        recognitionActiveRef.current = false;
      }

      cancelAnimationFrame(animationFrameRef.current);

      canvasRef.current?.getContext('2d')
        .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      wavesCanvasRef.current?.getContext('2d')
        .clearRect(0, 0, wavesCanvasRef.current.width, wavesCanvasRef.current.height);

      setIsRecording(false);
    }
  };

  /* ── Visualisation ──────────────────────────────────────── */
  const startVisualization = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray    = new Uint8Array(bufferLength);
    const canvas       = canvasRef.current;
    const ctx          = canvas.getContext('2d');
    const wc           = wavesCanvasRef.current;
    const wCtx         = wc.getContext('2d');
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const r  = Math.min(cx, cy) - 10;

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      wCtx.clearRect(0, 0, wc.width, wc.height);

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(79,70,229,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const step = (2 * Math.PI) / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const barH = dataArray[i] / 2, angle = i * step;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * r,          cy + Math.sin(angle) * r);
        ctx.lineTo(cx + Math.cos(angle) * (r + barH), cy + Math.sin(angle) * (r + barH));
        ctx.lineWidth = 2;
        ctx.strokeStyle = `hsla(${(i / bufferLength) * 240},100%,55%,0.85)`;
        ctx.stroke();
      }

      const time = Date.now() * 0.001;
      for (let wi = 0; wi < 3; wi++) {
        const alpha = 0.3 - wi * 0.08;
        const avg   = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
        const dAmp  = Math.max(5, avg * 0.5 * (1 - wi * 0.2));
        wCtx.beginPath();
        wCtx.moveTo(0, wc.height / 2);
        for (let x = 0; x < wc.width; x += 5) {
          const y = Math.sin(x * 0.01 + time * (wi + 1) * 0.5) * dAmp
                  + Math.sin(x * 0.02 - time * (wi + 1) * 0.7) * dAmp * 0.5
                  + wc.height / 2;
          wCtx.lineTo(x, y);
        }
        const g = wCtx.createLinearGradient(0, 0, wc.width, 0);
        g.addColorStop(0,   `rgba(124,58,237,${alpha})`);
        g.addColorStop(0.5, `rgba(79,70,229,${alpha})`);
        g.addColorStop(1,   `rgba(124,58,237,${alpha})`);
        wCtx.strokeStyle = g;
        wCtx.lineWidth = 3;
        wCtx.stroke();
      }
    };
    render();
  };

  /* ── Word toggle helpers ────────────────────────────────── */
  const toggleWord = (word) => {
    if (addedWords[word]) {
      setTranscribedText(prev => prev.replace(new RegExp(`\\s?\\b${word}\\b`, 'g'), '').trim());
      setAddedWords(prev => ({ ...prev, [word]: false }));
    } else {
      setTranscribedText(prev => `${prev} ${word}`.trim());
      setAddedWords(prev => ({ ...prev, [word]: true }));
    }
  };

  const toggleCombination = (prefix, word) => {
    const combo = `${prefix} ${word}`;
    if (addedWords[combo]) {
      setTranscribedText(prev => prev.replace(new RegExp(`\\s?\\b${prefix}\\s${word}\\b`, 'g'), '').trim());
      setAddedWords(prev => ({ ...prev, [combo]: false }));
    } else {
      setTranscribedText(prev => `${prev} ${combo}`.trim());
      setAddedWords(prev => ({ ...prev, [combo]: true }));
    }
  };

  /* ── Fluency colour helper ──────────────────────────────── */
  const fluencyColour = (score) => {
    if (score >= 0.8) return '#16a34a';
    if (score >= 0.5) return '#d97706';
    return '#dc2626';
  };

  const fluencyLabel = (score) => {
    if (score >= 0.8) return '🟢 Excellent fluency';
    if (score >= 0.5) return '🟡 Moderate — keep practising';
    return '🔴 Disfluencies detected';
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="stutter-help-container">

      {/* HERO */}
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

      {/* STATUS BANNER */}
      {statusMsg && (
        <div className={`sh-status-banner ${statusMsg.startsWith('❌') || statusMsg.startsWith('⚠️') ? 'error' : 'info'}`}>
          {statusMsg}
        </div>
      )}

      {/* VISUALIZER */}
      <section className="sh-visualizer-section">
        <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
          Live Speech Visualizer
        </motion.h2>
        <p>Press record and start speaking — watch your voice come alive.</p>

        <motion.div className="sh-visualization-container"
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }}
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
              {isRecording
                ? <><span className="sh-recording-icon" />Stop Recording</>
                : <>🎙 Start Recording</>}
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* RESULTS */}
      <section className="sh-results-section">
        <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
          Analysis Results
        </motion.h2>

        <div className="sh-results-grid">

          {/* Speech Recognition Card */}
          <motion.div className="sh-card"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }} viewport={{ once: true }}
          >
            <div className="sh-card-header">
              <span className="sh-card-icon">🗣️</span>
              <h3>Speech Recognition</h3>
            </div>

            <div className="sh-text-display">
              {transcribedText
                ? transcribedText
                : <span className="sh-placeholder">Your speech will appear here as you speak…</span>}
            </div>

            {/* Fluency Score */}
            {fluencyScore !== null && (
              <div className="sh-fluency-box">
                <h4>Fluency Score</h4>
                <div className="sh-fluency-percentage" style={{ color: fluencyColour(fluencyScore) }}>
                  {Math.round(fluencyScore * 100)}%
                </div>
                <div className="sh-fluency-bar">
                  <div
                    className="sh-fluency-fill"
                    style={{
                      width: `${fluencyScore * 100}%`,
                      background: fluencyColour(fluencyScore),
                    }}
                  />
                </div>
                <p className="sh-fluency-label">{fluencyLabel(fluencyScore)}</p>
              </div>
            )}

            {/* Stutter Types */}
            {stutterType && (
              <div className="sh-stutter-box">
                <h4>Detected Stutter Type</h4>
                <div className="sh-stutter-badge">
                  {stutterType.split(', ').map((t, i) => (
                    <span key={i} className="sh-stutter-type">{t}</span>
                  ))}
                  {stutterDetails && (
                    <p className="sh-stutter-description">{stutterDetails}</p>
                  )}
                </div>
              </div>
            )}

            {/* Clean speech confirmation */}
            {transcribedText && !stutterType && fluencyScore !== null && !isLoading && (
              <div className="sh-no-stutter">✅ No stutters detected — great fluency!</div>
            )}

            {isLoading && <p className="sh-analysing">⏳ Analysing with BERT…</p>}
          </motion.div>

          {/* Suggestions Card */}
          <motion.div className="sh-card purple"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }} viewport={{ once: true }}
          >
            <div className="sh-card-header">
              <span className="sh-card-icon">💡</span>
              <h3>Suggested Words</h3>
            </div>

            <div className="sh-suggestions-group">
              <p className="sh-suggestions-label">Single Words</p>
              <div className="sh-chips">
                {suggestions.length > 0
                  ? suggestions.map((word, i) => (
                      <button key={i}
                        className={`sh-chip ${addedWords[word] ? 'active' : ''}`}
                        onClick={() => toggleWord(word)}
                      >
                        {word}
                      </button>
                    ))
                  : <span className="sh-empty">
                      {isLoading ? '⏳ Generating…' : 'No suggestions yet — start speaking!'}
                    </span>}
              </div>
            </div>

            <div className="sh-suggestions-group">
              <p className="sh-suggestions-label">Word Combinations</p>
              <div className="sh-chips">
                {Object.keys(combinations).length > 0
                  ? Object.entries(combinations).flatMap(([prefix, words]) =>
                      words.map(word => {
                        const combo = `${prefix} ${word}`;
                        return (
                          <button key={combo}
                            className={`sh-chip combo ${addedWords[combo] ? 'active' : ''}`}
                            onClick={() => toggleCombination(prefix, word)}
                          >
                            {combo}
                          </button>
                        );
                      })
                    )
                  : <span className="sh-empty">
                      {isLoading ? '⏳ Generating…' : 'No combinations yet — start speaking!'}
                    </span>}
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="sh-info-section">
        <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
          How SPEAKEASE Works
        </motion.h2>
        <div className="sh-info-grid">
          {HOW_IT_WORKS.map((item, i) => (
            <motion.div className="sh-info-card" key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }} viewport={{ once: true }}
            >
              <div className="sh-info-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TIPS */}
      <section className="sh-tips-section">
        <motion.div className="sh-tips-inner"
          initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }}
        >
          <h3>💬 Tips for Best Results</h3>
          <ul>{TIPS.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
        </motion.div>
      </section>

    </div>
  );
};

export default StutterHelp;