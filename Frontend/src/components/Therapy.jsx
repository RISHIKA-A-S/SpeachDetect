import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from "../utils/axiosInstance";
import './Therapy.css';

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
  MIN_WORD_LENGTH:              2,
  MIN_AUTO_HIGHLIGHT_SPEED:     50,
  MAX_AUTO_HIGHLIGHT_SPEED:     600,
  DEFAULT_AUTO_HIGHLIGHT_SPEED: 150,
  CANVAS_WIDTH:                 80,
  CANVAS_HEIGHT:                80,
  WAVES_CANVAS_HEIGHT:          150,
  FFT_SIZE:                     256,
  LOOKAHEAD_WORDS:              8,   // how many words ahead to search for a match
};

// ─── Reading Passages ─────────────────────────────────────────
const PASSAGES = [
  {
    id:         'zoo',
    title:      "Jack's Day at the Zoo",
    emoji:      '🦁',
    level:      'Beginner',
    levelColor: '#16a34a',
    wordCount:  193,
    topic:      'Nature & Animals',
    text: "It was a bright sunny morning when Jack and his family decided to visit the zoo. Jack had been looking forward to this day for weeks. He loved animals and was excited to see them up close. His mom packed a picnic lunch and they all got into the car to drive to the zoo. When they arrived Jack could see many people already walking around. The zoo was full of families children and even some school groups. The first stop was the lion exhibit. Jack could hear the lions roaring from a distance. As they got closer he saw the large powerful animals resting in the shade. He was amazed at how big they were. Next they went to see the monkeys. The monkeys were jumping from tree to tree and making funny noises. Jack laughed as he watched them swing around so easily. His little sister Emma pointed at the baby monkey and said it was the cutest thing she had ever seen. After the monkeys Jack and his family walked to the elephant enclosure. The elephants were eating leaves and using their trunks to grab food. Jack was fascinated by how long their trunks were and how gently they ate. He thought the elephants looked very wise. Later they visited the penguin exhibit. The penguins were swimming in the water and waddling on the ground. Jack liked how fast they could swim and he watched them slide on their bellies with excitement. At the end of the day Jack and his family sat on a bench and ate their lunch. They talked about their favorite animals. Jack could not wait to tell his friends about his visit to the zoo.",
  },
  {
    id:         'seasons',
    title:      'The Four Seasons',
    emoji:      '🍂',
    level:      'Beginner',
    levelColor: '#16a34a',
    wordCount:  160,
    topic:      'Science & Nature',
    text: "There are four seasons in a year and each one is special in its own way. Spring comes after winter and brings warm weather and new life. Flowers begin to bloom and trees grow new leaves. Animals come out of their hiding places and birds return from warmer lands. Children love to play outside in the soft green grass during spring. Summer is the hottest season. The days are long and the sun shines brightly. People go to the beach swim in pools and enjoy ice cream. Schools close for summer holidays and families often go on vacations. Autumn or fall follows summer. The leaves on trees change colour from green to red orange and yellow. They then fall to the ground creating a carpet of colour. The air becomes cool and crisp. People wear sweaters and enjoy warm drinks like tea and cocoa. Winter is the coldest season. Snow falls in many places making everything white. Children build snowmen and have snowball fights. Families gather indoors to stay warm and celebrate holidays. Each season brings something beautiful and unique making the year a wonderful journey through nature.",
  },
  {
    id:         'space',
    title:      'Our Solar System',
    emoji:      '🪐',
    level:      'Intermediate',
    levelColor: '#d97706',
    wordCount:  185,
    topic:      'Science & Space',
    text: "Our solar system is a vast and fascinating place. At its centre is the Sun a massive star that provides light and warmth to everything around it. Eight planets orbit the Sun each travelling in its own path called an orbit. The four inner planets Mercury Venus Earth and Mars are rocky and relatively small. Mercury is the smallest planet and closest to the Sun. Venus is the hottest planet due to its thick atmosphere. Earth is our home and the only known planet with life. Mars is called the red planet because of its reddish surface. Beyond Mars lies the asteroid belt a region filled with rocks and space debris. The four outer planets Jupiter Saturn Uranus and Neptune are much larger and are called gas giants. Jupiter is the largest planet in our solar system and has a famous storm called the Great Red Spot. Saturn is known for its beautiful rings made of ice and rock. Uranus rotates on its side which makes it unique among the planets. Neptune is the farthest planet from the Sun and has the strongest winds in the solar system. Beyond Neptune lies a region called the Kuiper Belt where dwarf planets like Pluto reside.",
  },
  {
    id:         'technology',
    title:      'How the Internet Works',
    emoji:      '🌐',
    level:      'Intermediate',
    levelColor: '#d97706',
    wordCount:  178,
    topic:      'Technology',
    text: "The internet is one of the most important inventions in human history. It is a global network that connects billions of computers and devices around the world. When you type a website address into your browser your computer sends a request through this network to find the correct server. A server is a powerful computer that stores the data for websites. This request travels as small packets of data through cables satellites and wireless signals. The data can travel thousands of kilometres in just milliseconds. Every device on the internet has a unique address called an IP address. This is like a postal address that helps direct data to the right place. The Domain Name System or DNS works like a phone book for the internet. It translates easy to remember website names like google dot com into numerical IP addresses that computers understand. Security is very important on the internet. Encryption is used to scramble data so that only the intended recipient can read it. This protects your personal information when you shop or bank online. The internet has transformed how we communicate learn shop and entertain ourselves. It continues to grow and evolve bringing new possibilities every single day.",
  },
  {
    id:         'climate',
    title:      'Climate and Weather',
    emoji:      '🌦️',
    level:      'Advanced',
    levelColor: '#dc2626',
    wordCount:  200,
    topic:      'Environment',
    text: "Climate and weather are two terms that people often use interchangeably but they refer to very different things. Weather describes the short term atmospheric conditions in a specific place at a particular time. It includes things like temperature rainfall wind speed and cloud cover. Weather can change from hour to hour or day to day and is what you experience when you step outside. Climate on the other hand refers to the average weather patterns in a region over a long period of time usually thirty years or more. While weather tells you whether to carry an umbrella today climate tells you whether you should own one at all. The Earth has several major climate zones determined largely by latitude altitude and proximity to oceans. Tropical climates near the equator are hot and wet throughout the year. Temperate climates found in mid latitudes experience four distinct seasons. Polar climates near the North and South Poles are extremely cold with little precipitation. Human activities have significantly influenced the global climate. The burning of fossil fuels releases carbon dioxide and other greenhouse gases into the atmosphere. These gases trap heat from the Sun causing average global temperatures to rise. This phenomenon known as climate change is leading to more extreme weather events rising sea levels and shifts in ecosystems across the planet.",
  },
  {
    id:         'storytelling',
    title:      'The Art of Storytelling',
    emoji:      '📚',
    level:      'Advanced',
    levelColor: '#dc2626',
    wordCount:  190,
    topic:      'Language & Arts',
    text: "Storytelling is one of the oldest and most universal human traditions. Long before people could read or write they gathered around fires to share stories about their experiences beliefs and dreams. These oral traditions were the primary way that knowledge culture and history were passed from one generation to the next. Every great story contains certain fundamental elements. The setting establishes where and when the events take place providing context and atmosphere. Characters are the people or beings who drive the narrative forward. A compelling protagonist must have clear desires goals and flaws that make them feel real and relatable. Conflict is the engine of any story. Without tension or obstacles the narrative loses its momentum and the reader loses interest. Conflict can be external such as a battle against nature or an enemy or internal such as a character struggling with their own fears and doubts. The plot is the sequence of events that builds from the initial situation through rising action to a climax and finally to a resolution. Good storytellers understand that the most memorable tales do more than entertain. They illuminate truths about the human condition foster empathy and challenge us to see the world through different eyes. Whether told through books films theatre or conversation storytelling remains one of the most powerful forces that connect us all.",
  },
];

const HOW_IT_WORKS = [
  { icon: '📖', title: 'Choose a Passage',   desc: 'Pick from beginner, intermediate, or advanced reading modules.' },
  { icon: '🎤', title: 'Voice Tracking',     desc: 'Real-time speech recognition highlights each word as you speak it.' },
  { icon: '📊', title: 'Live Stats',         desc: 'Accurate WPM, word count, and fluency score update as you read.' },
  { icon: '⚡', title: 'Auto-Highlight',    desc: 'Set a target CPM and let the highlighter guide your reading pace.' },
];

const TIPS = [
  'Read in a quiet room with minimal background noise.',
  'Speak clearly at a natural pace — do not rush.',
  'Use Auto-Highlight to practice keeping up with a target speed.',
  'Watch your WPM and accuracy improve over multiple sessions.',
  'Try different difficulty levels to challenge yourself progressively.',
  'The highlighted word shows exactly where you are in the text.',
];

// ─── Save therapy session to backend ─────────────────────────
async function saveTherapySession({ passage, wordsRead, wpm, accuracy, fluencyScore, duration }) {
  if (!passage || wordsRead < 5) return; // skip trivial sessions
  try {
    await axiosInstance.post('/therapy/save', {
      passageId:    passage.id,
      passageTitle: passage.title,
      totalWords:   passage.wordCount,
      wordsRead:    Math.max(0, wordsRead),
      wpm:          wpm          || 0,
      accuracy:     accuracy     || 0,
      fluencyScore: parseFloat((fluencyScore || 0).toFixed(2)),
      duration:     duration     || 0,
    });
    console.log('✅ Therapy session saved');
  } catch (err) {
    // Silent fail — never interrupt the UX
    console.warn('⚠️ Could not save therapy session:', err?.response?.data || err.message);
  }
}

// ─── Word tokenizer ───────────────────────────────────────────
// Returns [{word, start, end}] preserving original positions
function tokenizeText(text) {
  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ raw: m[0], clean: m[0].replace(/[^a-zA-Z']/g, '').toLowerCase(), start: m.index, end: m.index + m[0].length });
  }
  return tokens;
}

// ─── Component ───────────────────────────────────────────────
const Therapy = () => {
  const [selectedPassage,     setSelectedPassage]     = useState(null);
  const [isRecording,         setIsRecording]         = useState(false);
  const [currentWordIndex,    setCurrentWordIndex]    = useState(-1); // index into tokens[]
  const [currentTime,         setCurrentTime]         = useState(0);
  const [totalTime,           setTotalTime]           = useState(0);
  const [playbackSpeed,       setPlaybackSpeed]       = useState(1.0);
  const [autoHighlightSpeed,  setAutoHighlightSpeed]  = useState(CONFIG.DEFAULT_AUTO_HIGHLIGHT_SPEED);
  const [isAutoHighlighting,  setIsAutoHighlighting]  = useState(false);
  const [sessionStats,        setSessionStats]        = useState({ accuracy: 0, wordsPerMinute: 0, wordsRead: 0 });
  const [lastError,           setLastError]           = useState(null);
  const [sessionComplete,     setSessionComplete]     = useState(false);

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
  const wordRefsMap             = useRef({});

  // Live refs for speech processing (avoid stale closure)
  const tokensRef               = useRef([]);
  const nextExpectedRef         = useRef(0);  // next word index we expect to hear
  const startTimeRef            = useRef(null);
  const totalWordsReadRef       = useRef(0);

  // Pre-tokenize whenever passage changes
  useEffect(() => {
    if (selectedPassage) {
      tokensRef.current    = tokenizeText(selectedPassage.text);
      nextExpectedRef.current = 0;
      totalWordsReadRef.current = 0;
      wordRefsMap.current  = {};
    }
  }, [selectedPassage]);

  // Auto-save when passage is fully completed
  useEffect(() => {
    if (!sessionComplete || !selectedPassage) return;
    const wordsRead    = totalWordsReadRef.current;
    const elapsed      = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : totalTime;
    const totalW       = tokensRef.current.length;
    const minutes      = elapsed / 60;
    const wpm          = minutes > 0 ? Math.min(Math.round(wordsRead / minutes), 400) : 0;
    const accuracy     = totalW > 0  ? Math.min(Math.round((wordsRead / totalW) * 100), 100) : 0;
    const fluencyScore = totalW > 0  ? wordsRead / totalW : 0;
    saveTherapySession({ passage: selectedPassage, wordsRead, wpm, accuracy, fluencyScore, duration: elapsed });
  }, [sessionComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas init ─────────────────────────────────────────────
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width  = CONFIG.CANVAS_WIDTH;
      canvasRef.current.height = CONFIG.CANVAS_HEIGHT;
    }
    if (wavesCanvasRef.current) {
      wavesCanvasRef.current.width  = window.innerWidth;
      wavesCanvasRef.current.height = CONFIG.WAVES_CANVAS_HEIGHT;
    }
    const handleResize = () => {
      if (wavesCanvasRef.current) wavesCanvasRef.current.width = window.innerWidth;
    };
    window.addEventListener('resize', handleResize);

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous      = true;
      recognitionRef.current.interimResults  = true;
      recognitionRef.current.maxAlternatives = 3;
      recognitionRef.current.lang            = 'en-US';

      recognitionRef.current.onresult = handleSpeechResult;
      recognitionRef.current.onerror  = (e) => {
        if (e.error === 'not-allowed') alert('Microphone access is required.');
        else if (e.error !== 'no-speech') setLastError(e.error);
      };
      recognitionRef.current.onend = () => {
        // Auto-restart if still recording
        if (isRecording) {
          try { recognitionRef.current.start(); } catch(_) {}
        }
      };
    } else {
      alert('Your browser does not support the Web Speech API. Please use Chrome or Edge.');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current)     cancelAnimationFrame(animationFrameRef.current);
      if (mediaStreamRef.current)        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (recognitionRef.current)        recognitionRef.current.stop();
      if (timerRef.current)              clearInterval(timerRef.current);
      if (autoHighlightTimerRef.current) clearInterval(autoHighlightTimerRef.current);
    };
  }, []);

  // Keep onend aware of isRecording
  useEffect(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.onend = () => {
      if (isRecording) {
        try { recognitionRef.current.start(); } catch(_) {}
      }
    };
  }, [isRecording]);

  // ── Auto-highlight ──────────────────────────────────────────
  useEffect(() => {
    if (!isAutoHighlighting || !selectedPassage) return;
    if (autoHighlightTimerRef.current) clearInterval(autoHighlightTimerRef.current);

    const tokens   = tokensRef.current;
    const msPerWord = (60 / (autoHighlightSpeed / 5)); // approx words per min

    autoHighlightTimerRef.current = setInterval(() => {
      setCurrentWordIndex(prev => {
        const next = prev + 1;
        if (next >= tokens.length) {
          setIsAutoHighlighting(false);
          setSessionComplete(true);
          return prev;
        }
        scrollToWord(next);
        return next;
      });
    }, msPerWord);

    return () => { if (autoHighlightTimerRef.current) clearInterval(autoHighlightTimerRef.current); };
  }, [isAutoHighlighting, autoHighlightSpeed, selectedPassage]);

  // ── Speech processing ───────────────────────────────────────
  const handleSpeechResult = useCallback((event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      // Use all alternatives
      const transcripts = [];
      for (let a = 0; a < event.results[i].length; a++) {
        transcripts.push(event.results[i][a].transcript.toLowerCase().trim());
      }
      // Process on both interim and final for smoother highlighting
      processTranscripts(transcripts);
    }
  }, []);

  const processTranscripts = (transcripts) => {
    const tokens = tokensRef.current;
    if (!tokens.length) return;

    for (const transcript of transcripts) {
      const spokenWords = transcript.split(/\s+/).filter(Boolean).map(w => w.replace(/[^a-zA-Z']/g, '').toLowerCase());
      if (!spokenWords.length) continue;

      // Try to match the last 1-3 spoken words against text from nextExpected onwards
      for (let numWords = Math.min(3, spokenWords.length); numWords >= 1; numWords--) {
        const candidateSpoken = spokenWords.slice(-numWords);
        const matched = findSequenceMatch(candidateSpoken, nextExpectedRef.current);
        if (matched !== -1) {
          // matched is the last word index that was confirmed
          advanceToWord(matched);
          break;
        }
      }
    }
  };

  const findSequenceMatch = (spokenWords, fromIndex) => {
    const tokens   = tokensRef.current;
    const lastSpoken = spokenWords[spokenWords.length - 1];
    if (!lastSpoken || lastSpoken.length < CONFIG.MIN_WORD_LENGTH) return -1;

    const searchEnd = Math.min(fromIndex + CONFIG.LOOKAHEAD_WORDS, tokens.length);

    for (let i = fromIndex; i < searchEnd; i++) {
      if (wordsMatch(tokens[i].clean, lastSpoken)) {
        // If multiple spoken words, verify the preceding ones too
        if (spokenWords.length > 1) {
          let allMatch = true;
          for (let j = 1; j < spokenWords.length; j++) {
            const textIdx = i - (spokenWords.length - 1) + j;
            if (textIdx < 0 || !wordsMatch(tokens[textIdx]?.clean ?? '', spokenWords[j])) {
              // Tolerate mismatch — just require last word
              allMatch = false;
              break;
            }
          }
          if (allMatch) return i;
        }
        return i;
      }
    }
    return -1;
  };

  const wordsMatch = (textWord, spokenWord) => {
    if (!textWord || !spokenWord) return false;
    if (textWord === spokenWord) return true;
    // Handle common contractions / abbreviations
    const contracted = textWord.replace(/'/g, '');
    const spoken2    = spokenWord.replace(/'/g, '');
    if (contracted === spoken2) return true;
    // Fuzzy: allow 1 char difference for longer words
    if (textWord.length >= 5 && spokenWord.length >= 5) {
      return levenshtein(textWord, spokenWord) <= 1;
    }
    return false;
  };

  const levenshtein = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => i || j)
    );
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[a.length][b.length];
  };

  const advanceToWord = (wordIndex) => {
    if (wordIndex <= nextExpectedRef.current - 1 && wordIndex < nextExpectedRef.current) return;
    nextExpectedRef.current = wordIndex + 1;
    totalWordsReadRef.current = wordIndex + 1;

    setCurrentWordIndex(wordIndex);
    scrollToWord(wordIndex);
    updateStats(wordIndex + 1);

    if (wordIndex >= tokensRef.current.length - 1) {
      setSessionComplete(true);
    }
  };

  const updateStats = (wordsRead) => {
    const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 1;
    const minutes = elapsed / 60;
    const wpm     = minutes > 0 ? Math.round(wordsRead / minutes) : 0;
    const total   = tokensRef.current.length;
    const acc     = total > 0 ? Math.round((wordsRead / total) * 100) : 0;

    setSessionStats({
      wordsPerMinute: Math.min(wpm, 400), // cap unrealistic spikes
      accuracy:       Math.min(acc, 100),
      wordsRead,
    });
  };

  const scrollToWord = (index) => {
    const el = wordRefsMap.current[index];
    if (el && textContainerRef.current) {
      const container = textContainerRef.current;
      const elTop     = el.offsetTop - container.offsetTop;
      container.scrollTo({ top: elTop - container.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
    }
  };

  // ── Recording toggle ────────────────────────────────────────
  const toggleRecording = async () => {
    if (isAutoHighlighting) { setIsAutoHighlighting(false); }

    if (!isRecording) {
      try {
        setCurrentWordIndex(-1);
        setCurrentTime(0);
        setTotalTime(0);
        setLastError(null);
        setSessionComplete(false);
        setSessionStats({ accuracy: 0, wordsPerMinute: 0, wordsRead: 0 });
        nextExpectedRef.current   = 0;
        totalWordsReadRef.current = 0;
        startTimeRef.current      = Date.now();

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
      } catch {
        setLastError('Microphone access denied');
        alert('Please allow microphone access to use this feature.');
      }
    } else {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      recognitionRef.current?.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current)          clearInterval(timerRef.current);
      if (canvasRef.current)         canvasRef.current.getContext('2d').clearRect(0,0,CONFIG.CANVAS_WIDTH,CONFIG.CANVAS_HEIGHT);
      if (wavesCanvasRef.current)    wavesCanvasRef.current.getContext('2d').clearRect(0,0,wavesCanvasRef.current.width,CONFIG.WAVES_CANVAS_HEIGHT);
      setIsRecording(false);

      // ── Save session to backend ──────────────────────────────
      const wordsRead    = totalWordsReadRef.current;
      const elapsed      = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;
      const totalW       = tokensRef.current.length;
      const minutes      = elapsed / 60;
      const wpm          = minutes > 0 ? Math.min(Math.round(wordsRead / minutes), 400) : 0;
      const accuracy     = totalW > 0  ? Math.min(Math.round((wordsRead / totalW) * 100), 100) : 0;
      const fluencyScore = totalW > 0  ? wordsRead / totalW : 0;
      saveTherapySession({ passage: selectedPassage, wordsRead, wpm, accuracy, fluencyScore, duration: elapsed });
    }
  };

  const toggleAutoHighlight = () => {
    if (isRecording) toggleRecording();
    if (!isAutoHighlighting) {
      setCurrentWordIndex(-1);
      nextExpectedRef.current = 0;
      setSessionComplete(false);
    }
    setIsAutoHighlighting(prev => !prev);
  };

  const changeSpeed = (delta) =>
    setAutoHighlightSpeed(prev => Math.max(CONFIG.MIN_AUTO_HIGHLIGHT_SPEED, Math.min(CONFIG.MAX_AUTO_HIGHLIGHT_SPEED, prev + delta)));

  const adjustPlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
    setPlaybackSpeed(prev => speeds[(speeds.indexOf(prev) + 1) % speeds.length]);
  };

  const resetSession = () => {
    // Save whatever progress exists before wiping state
    if (totalWordsReadRef.current >= 5 && selectedPassage) {
      const wordsRead    = totalWordsReadRef.current;
      const elapsed      = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : totalTime;
      const totalW       = tokensRef.current.length;
      const minutes      = elapsed / 60;
      const wpm          = minutes > 0 ? Math.min(Math.round(wordsRead / minutes), 400) : 0;
      const accuracy     = totalW > 0  ? Math.min(Math.round((wordsRead / totalW) * 100), 100) : 0;
      const fluencyScore = totalW > 0  ? wordsRead / totalW : 0;
      saveTherapySession({ passage: selectedPassage, wordsRead, wpm, accuracy, fluencyScore, duration: elapsed });
    }

    if (isRecording) {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      recognitionRef.current?.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current)          clearInterval(timerRef.current);
      if (canvasRef.current)         canvasRef.current.getContext('2d').clearRect(0,0,CONFIG.CANVAS_WIDTH,CONFIG.CANVAS_HEIGHT);
      if (wavesCanvasRef.current)    wavesCanvasRef.current.getContext('2d').clearRect(0,0,wavesCanvasRef.current.width,CONFIG.WAVES_CANVAS_HEIGHT);
      setIsRecording(false);
    }
    if (isAutoHighlighting) setIsAutoHighlighting(false);
    setCurrentWordIndex(-1);
    setCurrentTime(0);
    setTotalTime(0);
    setSessionStats({ accuracy: 0, wordsPerMinute: 0, wordsRead: 0 });
    setSessionComplete(false);
    nextExpectedRef.current   = 0;
    totalWordsReadRef.current = 0;
    startTimeRef.current      = null;
  };

  // ── Visualisation ───────────────────────────────────────────
  const startVisualization = () => {
    if (!analyserRef.current) return;
    const data    = new Uint8Array(analyserRef.current.frequencyBinCount);
    const canvas  = canvasRef.current;
    const wCanvas = wavesCanvasRef.current;
    if (!canvas || !wCanvas) return;
    const ctx  = canvas.getContext('2d');
    const wCtx = wCanvas.getContext('2d');

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
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(124,58,237,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.75 + avg / 512), 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(124,58,237,${0.5 + avg / 512})`;
    ctx.fill();
  };

  const drawWaves = (ctx, w, h, data) => {
    const t = Date.now() * 0.001;
    for (let wi = 0; wi < 3; wi++) {
      const alpha = 0.3 - wi * 0.08;
      const amp   = 1   - wi * 0.2;
      const ss    = Math.min(data.length, 32);
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

  const formatTime = s =>
    `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const fluencyColor  = sessionStats.accuracy > 70 ? '#22c55e' : sessionStats.accuracy > 40 ? '#f97316' : '#ef4444';
  const fluencyScore  = selectedPassage ? (currentWordIndex + 1) / tokensRef.current.length : 0;

  // ── Render text with per-word spans ─────────────────────────
  const renderWords = useCallback(() => {
    if (!selectedPassage) return null;
    const tokens = tokensRef.current;

    return (
      <div className="th-text-container" ref={textContainerRef}>
        <p className="th-passage-text">
          {tokens.map((token, i) => {
            const isSpoken  = i < currentWordIndex;
            const isCurrent = i === currentWordIndex;
            const isFuture  = i > currentWordIndex;
            return (
              <React.Fragment key={i}>
                <span
                  ref={el => { if (el) wordRefsMap.current[i] = el; }}
                  className={`th-word ${isSpoken ? 'spoken' : ''} ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`}
                >
                  {token.raw}
                </span>
                {' '}
              </React.Fragment>
            );
          })}
        </p>
      </div>
    );
  }, [selectedPassage, currentWordIndex]);

  const progress   = selectedPassage ? Math.round(((currentWordIndex + 1) / tokensRef.current.length) * 100) : 0;
  const totalWords = selectedPassage ? tokensRef.current.length : 0;

  // ── Passage Selection Screen ─────────────────────────────────
  if (!selectedPassage) {
    return (
      <div className="therapy-container">
        <canvas ref={wavesCanvasRef} className="th-waves-canvas" />

        <motion.section className="th-hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1>Speech Therapy</h1>
          <p>Choose a reading passage to practise. Our AI tracks every word, highlights your progress, and measures your fluency in real time.</p>
          <div className="th-hero-wave">
            <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
              <path fill="#ffffff" fillOpacity="1" d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L0,120Z"/>
            </svg>
          </div>
        </motion.section>

        <section className="th-reader-section">
          <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
            Select a Reading Module
          </motion.h2>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>Six passages across three difficulty levels — beginner to advanced.</p>

          <div className="th-passage-grid">
            {PASSAGES.map((p, i) => (
              <motion.div
                key={p.id}
                className="th-passage-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                viewport={{ once: true }}
                onClick={() => setSelectedPassage(p)}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className="th-passage-emoji">{p.emoji}</div>
                <div className="th-passage-meta">
                  <span className="th-passage-level" style={{ color: p.levelColor, borderColor: p.levelColor }}>{p.level}</span>
                  <span className="th-passage-topic">{p.topic}</span>
                </div>
                <h3 className="th-passage-title">{p.title}</h3>
                <p className="th-passage-preview">{p.text.substring(0, 90)}…</p>
                <div className="th-passage-footer">
                  <span>📝 ~{p.wordCount} words</span>
                  <button className="th-passage-start-btn">Start Reading →</button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="th-how-section">
          <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
            How Therapy Mode Works
          </motion.h2>
          <div className="th-how-grid">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div className="th-how-card" key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }} viewport={{ once: true }}>
                <div className="th-how-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="th-tips-section">
          <motion.div className="th-tips-inner" initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <h3>💡 Tips for Best Results</h3>
            <ul>{TIPS.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
          </motion.div>
        </section>
      </div>
    );
  }

  // ── Reading Screen ───────────────────────────────────────────
  return (
    <div className="therapy-container">
      <canvas ref={wavesCanvasRef} className="th-waves-canvas" />

      <motion.section className="th-hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <h1>Speech Therapy</h1>
        <p>Read the passage aloud — each word highlights as it's recognised. Track your progress in real time.</p>
        <div className="th-hero-wave">
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
            <path fill="#ffffff" fillOpacity="1" d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L0,120Z"/>
          </svg>
        </div>
      </motion.section>

      <section className="th-reader-section">
        {/* Passage header */}
        <div className="th-passage-header">
          <div>
            <button className="th-back-btn" onClick={() => { resetSession(); setSelectedPassage(null); }}>← All Passages</button>
            <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              {selectedPassage.emoji} {selectedPassage.title}
            </motion.h2>
            <div className="th-passage-badges">
              <span className="th-passage-level" style={{ color: selectedPassage.levelColor, borderColor: selectedPassage.levelColor }}>{selectedPassage.level}</span>
              <span className="th-passage-topic">{selectedPassage.topic}</span>
              <span className="th-word-count-badge">📝 {totalWords} words</span>
            </div>
          </div>
          <button className="th-reset-btn" onClick={resetSession} title="Reset session">↺ Reset</button>
        </div>

        <motion.div className="th-text-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="th-text-card-header">
            <span className="th-text-icon">📄</span>
            <span>{selectedPassage.title}</span>
            {sessionComplete && <span className="th-complete-badge">✅ Complete!</span>}
          </div>

          {renderWords()}

          <div className="th-controls-strip">
            <span className="th-time">{formatTime(currentTime)} / {formatTime(totalTime)}</span>

            <div className="th-ctrl-buttons">
              <button className="th-ctrl-btn" aria-label="Volume">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15.54 8.46C16.48 9.4 17 10.67 17 12s-.52 2.6-1.46 3.54" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <button
                className={`th-record-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <canvas ref={canvasRef} className="th-visualizer" />
                {isRecording ? (
                  <svg className="th-ctrl-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="1" fill="white"/></svg>
                ) : (
                  <svg className="th-ctrl-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 5V19L19 12L8 5Z" fill="white"/></svg>
                )}
              </button>

              <button className="th-ctrl-btn" onClick={adjustPlaybackSpeed} aria-label="Playback speed">
                <span className="th-speed-label">{playbackSpeed}x</span>
              </button>
            </div>

            <div className="th-autohl-group">
              <button className="th-icon-btn" onClick={() => changeSpeed(-25)} disabled={autoHighlightSpeed <= CONFIG.MIN_AUTO_HIGHLIGHT_SPEED} aria-label="Decrease speed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
              <div style={{ textAlign: 'center' }}>
                <button className={`th-autohl-btn ${isAutoHighlighting ? 'active' : ''}`} onClick={toggleAutoHighlight}>
                  {isAutoHighlighting ? 'Pause' : 'Auto'}
                </button>
                <div className="th-autohl-speed">{autoHighlightSpeed} CPM</div>
              </div>
              <button className="th-icon-btn" onClick={() => changeSpeed(25)} disabled={autoHighlightSpeed >= CONFIG.MAX_AUTO_HIGHLIGHT_SPEED} aria-label="Increase speed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="th-stats-section">
        <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
          Session Stats
        </motion.h2>

        <div className="th-stats-grid">
          <motion.div className="th-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
            <div className="th-card-header">
              <span className="th-card-icon">📈</span>
              <h3>Reading Progress</h3>
            </div>

            {isRecording || currentWordIndex >= 0 ? (
              <>
                <div className="th-progress-wrap">
                  <p className="th-progress-label">Completion</p>
                  <div className="th-progress-bar">
                    <div className="th-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="th-progress-text">
                    {progress}% · {Math.max(0, currentWordIndex + 1)} / {totalWords} words
                  </p>
                </div>

                <div className="th-stat-tiles">
                  <div className="th-tile">
                    <span className="th-tile-label">Accuracy</span>
                    <span className="th-tile-value">{sessionStats.accuracy}%</span>
                  </div>
                  <div className="th-tile">
                    <span className="th-tile-label">WPM</span>
                    <span className="th-tile-value">{sessionStats.wordsPerMinute}</span>
                  </div>
                  <div className="th-tile">
                    <span className="th-tile-label">Words Read</span>
                    <span className="th-tile-value">{Math.max(0, currentWordIndex + 1)}</span>
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

          <motion.div className="th-card purple" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} viewport={{ once: true }}>
            <div className="th-card-header">
              <span className="th-card-icon">✨</span>
              <h3>Fluency Score</h3>
            </div>
            {fluencyScore > 0 ? (
              <div className="th-fluency-wrap">
                <span className="th-fluency-pct" style={{ color: fluencyColor }}>{Math.round(fluencyScore * 100)}%</span>
                <div className="th-fluency-bar">
                  <div className="th-fluency-fill" style={{ width: `${fluencyScore * 100}%`, background: fluencyColor }} />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem' }}>
                  Based on {Math.max(0, currentWordIndex + 1)} of {totalWords} words read
                </p>
              </div>
            ) : (
              <p className="th-idle-msg">Fluency score will appear once you start reading.</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Other passages */}
      <section className="th-how-section">
        <motion.h2 initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true }}>
          Other Passages
        </motion.h2>
        <div className="th-passage-grid mini">
          {PASSAGES.filter(p => p.id !== selectedPassage.id).map((p, i) => (
            <motion.div
              key={p.id}
              className="th-passage-card mini"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              viewport={{ once: true }}
              onClick={() => { resetSession(); setSelectedPassage(p); }}
              whileHover={{ y: -3 }}
            >
              <span className="th-passage-emoji">{p.emoji}</span>
              <div>
                <div className="th-passage-title" style={{ fontSize: '0.95rem' }}>{p.title}</div>
                <span className="th-passage-level" style={{ color: p.levelColor, borderColor: p.levelColor, fontSize: '0.72rem' }}>{p.level}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="th-tips-section">
        <motion.div className="th-tips-inner" initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          <h3>💡 Tips for Best Results</h3>
          <ul>{TIPS.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
        </motion.div>
      </section>
    </div>
  );
};

export default Therapy;