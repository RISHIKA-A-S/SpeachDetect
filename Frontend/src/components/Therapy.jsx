import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import './Therapy.css';

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
  MIN_WORD_LENGTH:           3,
  MIN_AUTO_HIGHLIGHT_SPEED:  50,
  MAX_AUTO_HIGHLIGHT_SPEED:  500,
  DEFAULT_AUTO_HIGHLIGHT_SPEED: 150,
  SAMPLE_SIZE_FOR_WAVES:     32,
  CANVAS_WIDTH:              80,
  CANVAS_HEIGHT:             80,
  WAVES_CANVAS_HEIGHT:       150,
  FFT_SIZE:                  256,
  LAST_WORDS_COUNT:          5,
};

const SAMPLE_TEXT =
  "It was a bright, sunny morning when Jack and his family decided to visit the zoo. Jack had been looking forward to this day for weeks. He loved animals and was excited to see them up close. His mom packed a picnic lunch, and they all got into the car to drive to the zoo. When they arrived, Jack could see many people already walking around. The zoo was full of families, children, and even some school groups. The first stop was the lion exhibit. Jack could hear the lions roaring from a distance. As they got closer, he saw the large, powerful animals resting in the shade. He was amazed at how big they were. Next, they went to see the monkeys. The monkeys were jumping from tree to tree and making funny noises. Jack laughed as he watched them swing around so easily. His little sister, Emma, pointed at the baby monkey and said it was the cutest thing she had ever seen. After the monkeys, Jack and his family walked to the elephant enclosure. The elephants were eating leaves and using their trunks to grab food. Jack was fascinated by how long their trunks were and how gently they ate. He thought the elephants looked very wise. Later, they visited the penguin exhibit. The penguins were swimming in the water and waddling on the ground. Jack liked how fast they could swim, and he watched them slide on their bellies with excitement. At the end of the day, Jack and his family sat on a bench and ate their lunch. They talked about their favorite animals. Jack couldn't wait to tell his friends about his visit to the zoo.";

const HOW_IT_WORKS = [
  { icon: '📖', title: 'Read Along',        desc: 'Follow the highlighted text as you read aloud at your own pace.' },
  { icon: '🎤', title: 'Voice Tracking',    desc: 'Real-time speech recognition follows your words automatically.' },
  { icon: '📊', title: 'Live Stats',        desc: 'Accuracy, WPM, and fluency score update as you speak.' },
  { icon: '⚡', title: 'Auto-Highlight',   desc: 'Set a target CPM and let the highlighter guide your pace.' },
];

const TIPS = [
  'Read in a quiet room with minimal background noise.',
  'Speak clearly at a natural pace — do not rush.',
  'Use Auto-Highlight to practice keeping up with a target speed.',
  'Watch your WPM and accuracy improve over multiple sessions.',
  'Pause and replay any section as many times as you need.',
  'The blinking cursor shows exactly where you are in the text.',
];

// ─── Component ───────────────────────────────────────────────
const Therapy = () => {
  // State
  const [isRecording,         setIsRecording]         = useState(false);
  const [highlightPosition,   setHighlightPosition]   = useState(0);
  const [currentTime,         setCurrentTime]         = useState(0);
  const [totalTime,           setTotalTime]           = useState(0);
  const [playbackSpeed,       setPlaybackSpeed]       = useState(1.0);
  const [autoHighlightSpeed,  setAutoHighlightSpeed]  = useState(CONFIG.DEFAULT_AUTO_HIGHLIGHT_SPEED);
  const [isAutoHighlighting,  setIsAutoHighlighting]  = useState(false);
  const [fluencyScore,        setFluencyScore]        = useState(0);
  const [lastError,           setLastError]           = useState(null);
  const [sessionStats,        setSessionStats]        = useState({ accuracy: 0, wordsPerMinute: 0 });
  const [currentText]                                 = useState(SAMPLE_TEXT);

  // Refs
  const recognitionRef          = useRef(null);
  const mediaStreamRef          = useRef(null);
  const timerRef                = useRef(null);
  const canvasRef               = useRef(null);
  const wavesCanvasRef          = useRef(null);
  const textContainerRef        = useRef(null);
  const audioContextRef         = useRef(null);
  const analyserRef             = useRef(null);
  const animationFrameRef       = useRef(null);
  const autoHighlightTimerRef   = useRef(null);
  const currentTranscriptRef    = useRef('');
  const wordsArrayRef           = useRef(currentText.toLowerCase().split(/\s+/));
  const matchedWordsRef         = useRef(new Set());
  const lastMatchedWordIndexRef = useRef(-1);

  // Pre-compute words on text change
  useEffect(() => {
    wordsArrayRef.current = currentText.toLowerCase().split(/\s+/);
  }, [currentText]);

  // ── Canvas init + cleanup ───────────────────────────────
  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current || !wavesCanvasRef.current) return;
    canvasRef.current.width      = CONFIG.CANVAS_WIDTH;
    canvasRef.current.height     = CONFIG.CANVAS_HEIGHT;
    wavesCanvasRef.current.width  = window.innerWidth;
    wavesCanvasRef.current.height = CONFIG.WAVES_CANVAS_HEIGHT;
  }, []);

  useEffect(() => {
    initializeCanvas();

    const handleResize = () => {
      if (wavesCanvasRef.current) wavesCanvasRef.current.width = window.innerWidth;
    };
    window.addEventListener('resize', handleResize);

    if ('webkitSpeechRecognition' in window) {
      const SR = window.webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous      = true;
      recognitionRef.current.interimResults  = true;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.onresult = handleSpeechResult;
      recognitionRef.current.onerror  = (e) => {
        if (e.error === 'not-allowed') alert('Microphone access is required.');
        else setLastError(e.error);
      };
    } else {
      alert('Your browser does not support the Web Speech API. Please try Chrome or Edge.');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current)     cancelAnimationFrame(animationFrameRef.current);
      if (mediaStreamRef.current)        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (recognitionRef.current)        recognitionRef.current.stop();
      if (timerRef.current)              clearInterval(timerRef.current);
      if (autoHighlightTimerRef.current) clearInterval(autoHighlightTimerRef.current);
    };
  }, [initializeCanvas]);

  // ── Auto-highlight effect ───────────────────────────────
  useEffect(() => {
    if (!isAutoHighlighting) return;

    if (autoHighlightTimerRef.current) clearInterval(autoHighlightTimerRef.current);

    const msPerChar = 60000 / autoHighlightSpeed;

    autoHighlightTimerRef.current = setInterval(() => {
      setHighlightPosition(prev => {
        if (prev + 1 >= currentText.length) {
          setIsAutoHighlighting(false);
          return prev;
        }
        scrollToHighlight(prev + 1);
        return prev + 1;
      });
    }, msPerChar);

    return () => { if (autoHighlightTimerRef.current) clearInterval(autoHighlightTimerRef.current); };
  }, [isAutoHighlighting, autoHighlightSpeed, currentText]);

  // ── Speech processing ───────────────────────────────────
  const handleSpeechResult = (event) => {
    let finalTranscript = currentTranscriptRef.current;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += ' ' + t;
        processTranscript(finalTranscript);
      }
    }
    currentTranscriptRef.current = finalTranscript;
  };

  const processTranscript = (transcript) => {
    if (!transcript?.trim()) return;
    const words      = transcript.toLowerCase().trim().split(/\s+/);
    const startIdx   = Math.max(0, words.length - CONFIG.LAST_WORDS_COUNT);
    findAndHighlightMatch(words.slice(startIdx));
  };

  const findAndHighlightMatch = (searchWords) => {
    if (!searchWords?.length) return;
    const allWords   = wordsArrayRef.current;
    const lastWord   = searchWords[searchWords.length - 1];
    if (!lastWord || lastWord.length < CONFIG.MIN_WORD_LENGTH) return;

    const startFrom = Math.max(0, lastMatchedWordIndexRef.current + 1);

    for (let i = startFrom; i < allWords.length; i++) {
      const clean1 = allWords[i].replace(/[.,!?;:\-]/g, '').toLowerCase();
      const clean2 = lastWord.replace(/[.,!?;:\-]/g, '').toLowerCase();

      if (clean1 === clean2 && clean1.length >= CONFIG.MIN_WORD_LENGTH) {
        lastMatchedWordIndexRef.current = i;
        matchedWordsRef.current.add(lastWord);

        let charPos = 0;
        for (let j = 0; j <= i; j++) charPos += allWords[j].length + 1;

        setHighlightPosition(charPos);
        scrollToHighlight(charPos);
        updateStats(charPos);
        return;
      }
    }
  };

  const updateStats = useCallback((currentPosition) => {
    const progress = currentPosition / currentText.length;
    setFluencyScore(Math.min(progress, 1));

    setCurrentTime(prev => {
      if (prev > 0) {
        const wpm = Math.round(matchedWordsRef.current.size / (prev / 60));
        const acc = Math.round((matchedWordsRef.current.size / wordsArrayRef.current.length) * 100);
        setSessionStats({ accuracy: acc, wordsPerMinute: wpm });
      }
      return prev;
    });
  }, [currentText]);

  const scrollToHighlight = (position) => {
    if (!textContainerRef.current) return;
    const c   = textContainerRef.current;
    const pos = (position / currentText.length) * c.scrollHeight;
    c.scrollTop = Math.max(0, pos - c.clientHeight / 2);
  };

  const getStats = useCallback(() => ({
    progress:     Math.round((highlightPosition / currentText.length) * 100),
    wordsMatched: matchedWordsRef.current.size,
    totalWords:   wordsArrayRef.current.length,
    accuracy:     sessionStats.accuracy,
    wpm:          sessionStats.wordsPerMinute,
  }), [highlightPosition, currentText, sessionStats]);

  // ── Recording toggle ────────────────────────────────────
  const toggleRecording = async () => {
    if (isAutoHighlighting) setIsAutoHighlighting(false);

    if (!isRecording) {
      try {
        setHighlightPosition(0);
        setCurrentTime(0);
        setTotalTime(0);
        setFluencyScore(0);
        setLastError(null);
        setSessionStats({ accuracy: 0, wordsPerMinute: 0 });
        matchedWordsRef.current.clear();
        lastMatchedWordIndexRef.current = -1;
        currentTranscriptRef.current   = '';

        let secs = 0;
        timerRef.current = setInterval(() => {
          secs++;
          setCurrentTime(secs);
          setTotalTime(secs);
        }, 1000);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        });
        mediaStreamRef.current = stream;

        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current     = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = CONFIG.FFT_SIZE;
        audioContextRef.current.createMediaStreamSource(stream).connect(analyserRef.current);

        startVisualization();
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        setLastError('Microphone access denied');
        alert('Please allow microphone access to use this feature.');
      }
    } else {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      recognitionRef.current?.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current)          clearInterval(timerRef.current);

      // Clear canvases
      if (canvasRef.current)     canvasRef.current.getContext('2d').clearRect(0,0,canvasRef.current.width, canvasRef.current.height);
      if (wavesCanvasRef.current) wavesCanvasRef.current.getContext('2d').clearRect(0,0,wavesCanvasRef.current.width, wavesCanvasRef.current.height);

      setIsRecording(false);
    }
  };

  // ── Auto-highlight toggle ───────────────────────────────
  const toggleAutoHighlight = () => {
    if (isRecording) toggleRecording();
    if (!isAutoHighlighting) setHighlightPosition(0);
    setIsAutoHighlighting(prev => !prev);
  };

  const changeSpeed = (delta) => {
    setAutoHighlightSpeed(prev =>
      Math.max(CONFIG.MIN_AUTO_HIGHLIGHT_SPEED, Math.min(CONFIG.MAX_AUTO_HIGHLIGHT_SPEED, prev + delta))
    );
  };

  const adjustPlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
    setPlaybackSpeed(prev => speeds[(speeds.indexOf(prev) + 1) % speeds.length]);
  };

  // ── Visualisation ───────────────────────────────────────
  const startVisualization = () => {
    if (!analyserRef.current) return;
    const bufLen    = analyserRef.current.frequencyBinCount;
    const data      = new Uint8Array(bufLen);
    const canvas    = canvasRef.current;
    const ctx       = canvas.getContext('2d');
    const wCanvas   = wavesCanvasRef.current;
    const wCtx      = wCanvas.getContext('2d');

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      wCtx.clearRect(0, 0, wCanvas.width, wCanvas.height);
      drawCircle(ctx, canvas.width, canvas.height, data);
      drawWaves(wCtx, wCanvas.width, wCanvas.height, data);
    };
    render();
  };

  const drawCircle = (ctx, w, h, data) => {
    const cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(124,58,237,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.8 + avg / 512), 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(124,58,237,0.6)';
    ctx.fill();
  };

  const drawWaves = (ctx, w, h, data) => {
    const t = Date.now() * 0.001;
    for (let wi = 0; wi < 3; wi++) {
      const alpha = 0.3 - wi * 0.08;
      const amp   = 1   - wi * 0.2;
      const ss    = Math.min(data.length, CONFIG.SAMPLE_SIZE_FOR_WAVES);
      let sum = 0;
      for (let i = 0; i < ss; i++) sum += data[i * Math.floor(data.length / ss)];
      const dyn  = Math.max(5, (sum / ss) * 0.5 * amp);
      const step = Math.max(5, Math.floor(w / 120));

      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x < w; x += step) {
        const y = Math.sin(x * 0.01 + t * (wi + 1) * 0.5) * dyn
                + Math.sin(x * 0.02 - t * (wi + 1) * 0.7) * dyn * 0.5
                + h / 2;
        ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0,   `rgba(124,58,237,${alpha})`);
      g.addColorStop(0.5, `rgba(79,70,229,${alpha})`);
      g.addColorStop(1,   `rgba(124,58,237,${alpha})`);
      ctx.strokeStyle = g;
      ctx.lineWidth   = 3;
      ctx.stroke();
    }
  };

  // ── Helpers ─────────────────────────────────────────────
  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const fluencyColor = fluencyScore > 0.7 ? '#22c55e' : fluencyScore > 0.4 ? '#f97316' : '#ef4444';

  const renderText = useCallback(() => {
    if (!currentText) return null;
    return (
      <div className="th-text-container" ref={textContainerRef}>
        <p>
          <span className="th-spoken-text">{currentText.substring(0, highlightPosition)}</span>
          <span className="th-unspoken-text">{currentText.substring(highlightPosition)}</span>
        </p>
      </div>
    );
  }, [currentText, highlightPosition]);

  const stats = getStats();

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="therapy-container">
      <canvas ref={wavesCanvasRef} className="th-waves-canvas" />

      {/* ── HERO ── */}
      <motion.section
        className="th-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>Speech Therapy</h1>
        <p>Read the passage aloud — our AI tracks your voice, highlights your progress, and measures your fluency in real time.</p>
        <div className="th-hero-wave">
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
            <path fill="#ffffff" fillOpacity="1"
              d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L0,120Z"/>
          </svg>
        </div>
      </motion.section>

      {/* ── READER ── */}
      <section className="th-reader-section">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Reading Passage
        </motion.h2>
        <p>Follow along as you read — the text highlights in real time as your words are recognised.</p>

        <motion.div
          className="th-text-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {/* Card header */}
          <div className="th-text-card-header">
            <span className="th-text-icon">📄</span>
            <span>Jack's Day at the Zoo</span>
          </div>

          {/* Text */}
          {renderText()}

          {/* Controls strip */}
          <div className="th-controls-strip">
            {/* Time */}
            <span className="th-time">{formatTime(currentTime)} / {formatTime(totalTime)}</span>

            {/* Main buttons */}
            <div className="th-ctrl-buttons">
              {/* Volume (visual only) */}
              <button className="th-ctrl-btn" aria-label="Volume">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.54 8.46C16.48 9.4 17 10.67 17 12s-.52 2.6-1.46 3.54" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Record */}
              <button
                className={`th-record-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <canvas ref={canvasRef} className="th-visualizer" />
                {isRecording ? (
                  <svg className="th-ctrl-icon" width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="6" width="12" height="12" rx="1" fill="white"/>
                  </svg>
                ) : (
                  <svg className="th-ctrl-icon" width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5V19L19 12L8 5Z" fill="white"/>
                  </svg>
                )}
              </button>

              {/* Speed */}
              <button className="th-ctrl-btn" onClick={adjustPlaybackSpeed} aria-label="Playback speed">
                <span className="th-speed-label">{playbackSpeed}x</span>
              </button>
            </div>

            {/* Auto-highlight */}
            <div className="th-autohl-group">
              <button
                className="th-icon-btn"
                onClick={() => changeSpeed(-25)}
                disabled={autoHighlightSpeed <= CONFIG.MIN_AUTO_HIGHLIGHT_SPEED}
                aria-label="Decrease speed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  className={`th-autohl-btn ${isAutoHighlighting ? 'active' : ''}`}
                  onClick={toggleAutoHighlight}
                >
                  {isAutoHighlighting ? 'Pause' : 'Auto'}
                </button>
                <div className="th-autohl-speed">{autoHighlightSpeed} CPM</div>
              </div>

              <button
                className="th-icon-btn"
                onClick={() => changeSpeed(25)}
                disabled={autoHighlightSpeed >= CONFIG.MAX_AUTO_HIGHLIGHT_SPEED}
                aria-label="Increase speed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="th-stats-section">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Session Stats
        </motion.h2>

        <div className="th-stats-grid">

          {/* Progress card */}
          <motion.div
            className="th-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="th-card-header">
              <span className="th-card-icon">📈</span>
              <h3>Reading Progress</h3>
            </div>

            {isRecording || stats.progress > 0 ? (
              <>
                <div className="th-progress-wrap">
                  <p className="th-progress-label">Completion</p>
                  <div className="th-progress-bar">
                    <div className="th-progress-fill" style={{ width: `${stats.progress}%` }} />
                  </div>
                  <p className="th-progress-text">
                    {stats.progress}% · {stats.wordsMatched} / {stats.totalWords} words
                  </p>
                </div>

                <div className="th-stat-tiles">
                  <div className="th-tile">
                    <span className="th-tile-label">Accuracy</span>
                    <span className="th-tile-value">{stats.accuracy}%</span>
                  </div>
                  <div className="th-tile">
                    <span className="th-tile-label">WPM</span>
                    <span className="th-tile-value">{stats.wpm}</span>
                  </div>
                  <div className="th-tile">
                    <span className="th-tile-label">Time</span>
                    <span className="th-tile-value">{formatTime(currentTime)}</span>
                  </div>
                </div>

                {lastError && <div className="th-error">⚠️ {lastError}</div>}
              </>
            ) : (
              <p className="th-idle-msg">Press the record button to start tracking your session.</p>
            )}
          </motion.div>

          {/* Fluency card */}
          <motion.div
            className="th-card purple"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="th-card-header">
              <span className="th-card-icon">✨</span>
              <h3>Fluency Score</h3>
            </div>

            {fluencyScore > 0 ? (
              <div className="th-fluency-wrap">
                <span className="th-fluency-pct">{Math.round(fluencyScore * 100)}%</span>
                <div className="th-fluency-bar">
                  <div
                    className="th-fluency-fill"
                    style={{ width: `${fluencyScore * 100}%`, background: fluencyColor }}
                  />
                </div>
              </div>
            ) : (
              <p className="th-idle-msg">Fluency score will appear once you start reading.</p>
            )}
          </motion.div>

        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="th-how-section">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          How Therapy Mode Works
        </motion.h2>

        <div className="th-how-grid">
          {HOW_IT_WORKS.map((item, i) => (
            <motion.div
              className="th-how-card"
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="th-how-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── TIPS ── */}
      <section className="th-tips-section">
        <motion.div
          className="th-tips-inner"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h3>💡 Tips for Best Results</h3>
          <ul>
            {TIPS.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </motion.div>
      </section>

    </div>
  );
};

export default Therapy;