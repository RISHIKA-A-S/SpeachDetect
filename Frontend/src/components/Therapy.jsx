import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Therapy.css';

// 🔧 CONFIGURATION CONSTANTS
const CONFIG = {
  PROCESSING_DEBOUNCE_MS: 50,
  MIN_WORD_LENGTH: 3,
  MIN_AUTO_HIGHLIGHT_SPEED: 50,
  MAX_AUTO_HIGHLIGHT_SPEED: 500,
  DEFAULT_AUTO_HIGHLIGHT_SPEED: 150,
  SAMPLE_SIZE_FOR_WAVES: 32,
  CANVAS_WIDTH: 80,
  CANVAS_HEIGHT: 80,
  WAVES_CANVAS_HEIGHT: 150,
  FFT_SIZE: 256,
  LAST_WORDS_COUNT: 5,
  COMBINATIONS_FOR_STATS: 10
};

const Therapy = () => {
  // 📊 STATE: Recording & Playback
  const [isRecording, setIsRecording] = useState(false);
  const [highlightPosition, setHighlightPosition] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoHighlightSpeed, setAutoHighlightSpeed] = useState(CONFIG.DEFAULT_AUTO_HIGHLIGHT_SPEED);
  const [isAutoHighlighting, setIsAutoHighlighting] = useState(false);
  
  // 📊 STATE: Accuracy & Fluency Tracking
  const [sessionStats, setSessionStats] = useState({
    totalWordsSpoken: 0,
    correctWordsMatched: 0,
    totalTime: 0,
    accuracy: 0,
    wordsPerMinute: 0
  });
  const [fluencyScore, setFluencyScore] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [currentText, setCurrentText] = useState(
    "It was a bright, sunny morning when Jack and his family decided to visit the zoo. Jack had been looking forward to this day for weeks. He loved animals and was excited to see them up close. His mom packed a picnic lunch, and they all got into the car to drive to the zoo. When they arrived, Jack could see many people already walking around. The zoo was full of families, children, and even some school groups. The first stop was the lion exhibit. Jack could hear the lions roaring from a distance. As they got closer, he saw the large, powerful animals resting in the shade. He was amazed at how big they were. Next, they went to see the monkeys. The monkeys were jumping from tree to tree and making funny noises. Jack laughed as he watched them swing around so easily. His little sister, Emma, pointed at the baby monkey and said it was the cutest thing she had ever seen. After the monkeys, Jack and his family walked to the elephant enclosure. The elephants were eating leaves and using their trunks to grab food. Jack was fascinated by how long their trunks were and how gently they ate. He thought the elephants looked very wise. Later, they visited the penguin exhibit. The penguins were swimming in the water and waddling on the ground. Jack liked how fast they could swim, and he watched them slide on their bellies with excitement. At the end of the day, Jack and his family sat on a bench and ate their lunch. They talked about their favorite animals. Jack couldn’t wait to tell his friends about his visit to the zoo."
  );

  // Refs for DOM elements and objects
  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const wavesCanvasRef = useRef(null);
  const textContainerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const autoHighlightTimerRef = useRef(null);
  
  // 📊 Performance optimization & tracking refs
  const lastRecognizedIndexRef = useRef(0);
  const currentTranscriptRef = useRef('');
  const processingTimeoutRef = useRef(null);
  const textLowerCaseRef = useRef(currentText.toLowerCase());
  const wordsArrayRef = useRef(currentText.toLowerCase().split(/\s+/));
  const matchedWordsRef = useRef(new Set()); // Track matched words for accuracy
  const sessionStartTimeRef = useRef(null);  const lastMatchedWordIndexRef = useRef(-1); // Track the last word index (word-based, not character-based)
  // Precompute text data on init or when text changes
  useEffect(() => {
    textLowerCaseRef.current = currentText.toLowerCase();
    wordsArrayRef.current = currentText.toLowerCase().split(/\s+/);
  }, [currentText]);

  // Initialize canvas for wave visualization
  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current || !wavesCanvasRef.current) return;
    
    const canvas = canvasRef.current;
    const wavesCanvas = wavesCanvasRef.current;
    
    // Main circular visualizer
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;
    
    // Background waves
    wavesCanvas.width = window.innerWidth;
    wavesCanvas.height = CONFIG.WAVES_CANVAS_HEIGHT;
  }, []);

  // Initialize speech recognition and audio visualization
  useEffect(() => {
    initializeCanvas();
    
    const handleResize = () => {
      if (wavesCanvasRef.current) {
        wavesCanvasRef.current.width = window.innerWidth;
      }
    };
    
    window.addEventListener('resize', handleResize);

    // Setup speech recognition
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      // Use higher settings for more real-time response
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onresult = handleSpeechResult;
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone access is required for speech recognition.');
        }
      };
    } else {
      alert('Your browser does not support the Web Speech API. Please try Chrome or Edge.');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      if (autoHighlightTimerRef.current) {
        clearInterval(autoHighlightTimerRef.current);
      }
    };
  }, [initializeCanvas]);

  // Auto-highlight effect
  useEffect(() => {
    if (isAutoHighlighting) {
      // Clear any existing timer
      if (autoHighlightTimerRef.current) {
        clearInterval(autoHighlightTimerRef.current);
      }
      
      // Calculate interval based on speed (characters per minute)
      // Convert to milliseconds per character
      const msPerChar = 60000 / autoHighlightSpeed;
      
      autoHighlightTimerRef.current = setInterval(() => {
        setHighlightPosition(prev => {
          const newPosition = prev + 1;
          
          // If we've reached the end, reset or stop
          if (newPosition >= currentText.length) {
            // Optional: reset to beginning
            // return 0;
            
            // Or stop auto-highlighting
            setIsAutoHighlighting(false);
            return prev;
          }
          
          scrollToHighlight(newPosition);
          return newPosition;
        });
      }, msPerChar);
      
      return () => {
        if (autoHighlightTimerRef.current) {
          clearInterval(autoHighlightTimerRef.current);
        }
      };
    }
  }, [isAutoHighlighting, autoHighlightSpeed, currentText]);

  // Handle speech recognition results with optimized performance
  const handleSpeechResult = (event) => {
    // Skip processing if we have a pending timeout (debounce)
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    
    let interimTranscript = '';
    let finalTranscript = currentTranscriptRef.current;
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += ' ' + transcript;
        console.log('🎤 Final transcript:', transcript);
        // Process final results immediately for better responsiveness
        processTranscript(finalTranscript);
      } else {
        interimTranscript += transcript;
      }
    }
    
    currentTranscriptRef.current = finalTranscript;
  };

  // Process the transcript with optimized matching algorithm
  const processTranscript = (transcript) => {
    if (!transcript || transcript.trim() === '') return;
    
    const cleanTranscript = transcript.toLowerCase().trim();
    const words = cleanTranscript.split(/\s+/);
    
    // Fast processing - use the last few words
    const lastFewWordsCount = Math.min(CONFIG.LAST_WORDS_COUNT, words.length);
    const startIndex = Math.max(0, words.length - lastFewWordsCount);
    const lastFewWords = words.slice(startIndex);
    
    // Use a faster match method for short phrases
    findAndHighlightMatch(lastFewWords);
  };

  // Optimized matching algorithm with accuracy tracking - WORD-BASED
  const findAndHighlightMatch = (searchWords) => {
    if (!searchWords || searchWords.length === 0) return;
    
    const allWords = wordsArrayRef.current;
    const lastWord = searchWords[searchWords.length - 1];
    
    // Skip very short words (noise or non-meaningful content)
    if (!lastWord || lastWord.length < CONFIG.MIN_WORD_LENGTH) return;
    
    // Start searching from the last matched word position
    const startSearchIndex = Math.max(0, lastMatchedWordIndexRef.current + 1);
    
    console.log(`🔍 Looking for word: "${lastWord}", starting from index: ${startSearchIndex}`);
    
    // Find the next occurrence of this word in the text
    for (let i = startSearchIndex; i < allWords.length; i++) {
      const textWord = allWords[i];
      
      // Check for exact word match (case-insensitive, with punctuation handling)
      const cleanTextWord = textWord.replace(/[.,!?;:\-]/g, '').toLowerCase();
      const cleanSpokenWord = lastWord.replace(/[.,!?;:\-]/g, '').toLowerCase();
      
      if (cleanTextWord === cleanSpokenWord && cleanTextWord.length >= CONFIG.MIN_WORD_LENGTH) {
        console.log(`✅ Matched word at index ${i}: "${textWord}"`);
        
        // Update last matched word index
        lastMatchedWordIndexRef.current = i;
        matchedWordsRef.current.add(lastWord);
        
        // Calculate character position up to and including this word
        let charPosition = 0;
        for (let j = 0; j <= i; j++) {
          charPosition += allWords[j].length + 1; // +1 for space
        }
        
        setHighlightPosition(charPosition);
        scrollToHighlight(charPosition);
        updateFluencyScore(charPosition);
        
        return; // Stop after finding first match
      }
    }
    
    console.log(`❌ No match found for "${lastWord}"`);
  };
  
  // 📊 NEW: Calculate fluency score based on progress
  const updateFluencyScore = useCallback((currentPosition) => {
    const progress = currentPosition / currentText.length;
    const score = Math.min(progress, 1); // Cap at 1.0
    setFluencyScore(score);
    
    // Calculate words per minute if we have time data
    if (currentTime > 0) {
      const minutesElapsed = currentTime / 60;
      const wordsSpoken = matchedWordsRef.current.size;
      const wpm = Math.round(wordsSpoken / minutesElapsed);
      
      setSessionStats(prev => ({
        ...prev,
        wordsPerMinute: wpm,
        accuracy: matchedWordsRef.current.size > 0 ? 
          Math.round((matchedWordsRef.current.size / wordsArrayRef.current.length) * 100) : 0
      }));
    }
  }, [currentTime, currentText]);
  
  // 📊 NEW: Calculate and display session statistics
  const getSessionStats = useCallback(() => {
    const accuracy = matchedWordsRef.current.size > 0 ? 
      Math.round((matchedWordsRef.current.size / wordsArrayRef.current.length) * 100) : 0;
    const progress = Math.round((highlightPosition / currentText.length) * 100);
    
    return {
      accuracy,
      progress,
      wordsMatched: matchedWordsRef.current.size,
      totalWords: wordsArrayRef.current.length,
      wpm: sessionStats.wordsPerMinute
    };
  }, [highlightPosition, currentText, sessionStats]);
  
  // 📊 NEW: Handle speech recognition error with recovery
  const handleSpeechError = useCallback((error) => {
    console.error('🚨 Speech recognition error:', error);
    setLastError(error);
    
    // Auto-recovery attempts
    if (error === 'network' || error === 'audio-capture') {
      console.log('🔄 Attempting recovery from', error);
      setTimeout(() => {
        if (recognitionRef.current && isRecording) {
          recognitionRef.current.stop();
          setTimeout(() => {
            if (recognitionRef.current && isRecording) {
              recognitionRef.current.start();
            }
          }, 500);
        }
      }, 1000);
    }
  }, [isRecording]);
  
  // 📊 NEW: Reset session stats
  const resetSessionStats = useCallback(() => {
    matchedWordsRef.current.clear();
    lastMatchedWordIndexRef.current = -1; // Reset word index
    lastRecognizedIndexRef.current = 0;
    sessionStartTimeRef.current = Date.now();
    setSessionStats({
      totalWordsSpoken: 0,
      correctWordsMatched: 0,
      totalTime: 0,
      accuracy: 0,
      wordsPerMinute: 0
    });
    setFluencyScore(0);
    setLastError(null);
  }, []);
  const scrollToHighlight = (position) => {
    if (!textContainerRef.current) return;
    
    // Skip animation for faster response
    const container = textContainerRef.current;
    
    // Calculate approximation of where this text position would be
    const textLength = currentText.length;
    const containerHeight = container.scrollHeight;
    const approximatePosition = (position / textLength) * containerHeight;
    
    // Center the position in the viewport
    const scrollPosition = Math.max(0, approximatePosition - (container.clientHeight / 2));
    
    // Use scrollTo without smooth behavior for immediate response
    container.scrollTop = scrollPosition;
  };

  const toggleRecording = async () => {
    // If auto-highlighting is on, turn it off when recording starts
    if (isAutoHighlighting) {
      setIsAutoHighlighting(false);
    }
    
    if (!isRecording) {
      try {
        // Reset position and stats when starting a new recording
        setHighlightPosition(0);
        lastRecognizedIndexRef.current = 0;
        lastMatchedWordIndexRef.current = -1; // Reset word index
        currentTranscriptRef.current = '';
        setCurrentTime(0);
        setTotalTime(0);
        resetSessionStats();
        
        // Start timer
        let seconds = 0;
        timerRef.current = setInterval(() => {
          seconds++;
          setCurrentTime(seconds);
          setTotalTime(seconds);
        }, 1000);
        
        // Start audio stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000
          } 
        });
        mediaStreamRef.current = stream;
        
        // Setup audio context
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = CONFIG.FFT_SIZE;
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        // Start visualization
        startVisualization();
        
        // Start speech recognition
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
        
        setIsRecording(true);
        console.log('🎤 Recording started');
      } catch (error) {
        console.error('❌ Error accessing microphone:', error);
        setLastError('Microphone access denied');
        alert('Please allow microphone access to use this feature.');
      }
    } else {
      // Stop recording
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      setIsRecording(false);
    }
  };

  const toggleAutoHighlight = () => {
    // If recording is on, turn it off when auto-highlighting starts
    if (isRecording) {
      toggleRecording();
    }
    
    setIsAutoHighlighting(prev => !prev);
    
    // Reset position when starting auto-highlighting
    if (!isAutoHighlighting) {
      setHighlightPosition(0);
    }
  };

  const changeAutoHighlightSpeed = (change) => {
    setAutoHighlightSpeed(prev => {
      const newSpeed = Math.max(CONFIG.MIN_AUTO_HIGHLIGHT_SPEED, Math.min(CONFIG.MAX_AUTO_HIGHLIGHT_SPEED, prev + change));
      return newSpeed;
    });
  };

  const startVisualization = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const wavesCanvas = wavesCanvasRef.current;
    const wavesCtx = wavesCanvas.getContext('2d');
    
    const renderFrame = () => {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Clear canvases
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      wavesCtx.clearRect(0, 0, wavesCanvas.width, wavesCanvas.height);
      
      // Draw waves with purple theme
      drawWaves(wavesCtx, wavesCanvas.width, wavesCanvas.height, dataArray);
      
      // Draw circle visualization
      drawCircleVisualizer(ctx, canvas.width, canvas.height, dataArray);
    };
    
    renderFrame();
  };

  const drawCircleVisualizer = (ctx, width, height, dataArray) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 5;
    
    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Calculate average amplitude for size
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avgAmplitude = sum / dataArray.length;
    const dynamicRadius = radius * (0.8 + avgAmplitude / 512);
    
    // Draw animated fill
    ctx.beginPath();
    ctx.arc(centerX, centerY, dynamicRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(124, 58, 237, 0.6)';
    ctx.fill();
  };

  const drawWaves = (ctx, width, height, dataArray) => {
    const time = Date.now() * 0.001;
    const waveCount = 3;
    
    for (let waveIndex = 0; waveIndex < waveCount; waveIndex++) {
      ctx.beginPath();
      
      const alpha = 0.3 - waveIndex * 0.1;
      const amplitudeFactor = 1 - waveIndex * 0.2;
      
      // Calculate average of frequency data for amplitude (optimized)
      let sum = 0;
      const sampleSize = Math.min(dataArray.length, CONFIG.SAMPLE_SIZE_FOR_WAVES); // Sample fewer data points for performance
      for (let i = 0; i < sampleSize; i++) {
        sum += dataArray[i * Math.floor(dataArray.length / sampleSize)];
      }
      const averageAmplitude = sum / sampleSize;
      const dynamicAmplitude = Math.max(5, averageAmplitude * 0.5 * amplitudeFactor);
      
      ctx.moveTo(0, height / 2);
      
      // Optimize wave drawing - use fewer points for better performance
      const step = Math.max(5, Math.floor(width / 120)); // Adaptive step size based on screen width
      
      for (let x = 0; x < width; x += step) {
        // Multiple sine waves with different frequencies
        const y = Math.sin(x * 0.01 + time * (waveIndex + 1) * 0.5) * dynamicAmplitude + 
                 Math.sin(x * 0.02 - time * (waveIndex + 1) * 0.7) * dynamicAmplitude * 0.5 +
                 height / 2;
        
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, height / 2);
      
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, `rgba(124, 58, 237, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(79, 70, 229, ${alpha})`);
      gradient.addColorStop(1, `rgba(124, 58, 237, ${alpha})`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  // Format time for display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Change playback speed
  const adjustPlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  // Memoize text rendering to avoid unnecessary re-renders
  const renderTextWithHighlight = useCallback(() => {
    if (!currentText) return null;
    
    const beforeHighlight = currentText.substring(0, highlightPosition);
    const afterHighlight = currentText.substring(highlightPosition);
    
    return (
      <div className="text-container" ref={textContainerRef}>
        <p>
          <span className="spoken-text">{beforeHighlight}</span>
          <span className="unspoken-text">{afterHighlight}</span>
        </p>
      </div>
    );
  }, [currentText, highlightPosition]);

  return (
    <div className="Therapy-container">
      {/* Wave visualization background */}
      <canvas ref={wavesCanvasRef} className="waves-canvas"></canvas>
      
      {/* Header */}
      <div className="header">
        <h1 className="app-title">Therapy</h1>
        <p className="app-subtitle">Personalized Stutter Detection and Helper Model</p>
      </div>
      
      {/* Main content */}
      <div className="main-content">
        {/* Text display */}
        <div className="text-display">
          {renderTextWithHighlight()}
        </div>
      </div>
      
      {/* Auto-highlight speed controls */}
      <div className="auto-highlight-controls">
        <div className="speed-display">
          <span>Auto-Highlight Speed: {autoHighlightSpeed} CPM</span>
        </div>
        <div className="speed-buttons">
          <button 
            className="speed-btn" 
            onClick={() => changeAutoHighlightSpeed(-25)}
            disabled={autoHighlightSpeed <= CONFIG.MIN_AUTO_HIGHLIGHT_SPEED}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button 
            className={`auto-highlight-btn ${isAutoHighlighting ? 'active' : ''}`} 
            onClick={toggleAutoHighlight}
          >
            {isAutoHighlighting ? 'Pause' : 'Auto-Highlight'}
          </button>
          <button 
            className="speed-btn" 
            onClick={() => changeAutoHighlightSpeed(25)}
            disabled={autoHighlightSpeed >= CONFIG.MAX_AUTO_HIGHLIGHT_SPEED}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Control panel */}
      <div className="controls">
        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(totalTime)}
        </div>
        
        <div className="control-buttons">
          <button className="control-btn volume-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button className="control-btn record-btn" onClick={toggleRecording}>
            <canvas ref={canvasRef} className="visualizer"></canvas>
            {isRecording ? (
              <svg className="control-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="1" fill="white"/>
              </svg>
            ) : (
              <svg className="control-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5V19L19 12L8 5Z" fill="white"/>
              </svg>
            )}
          </button>
          
          <button className="control-btn speed-btn" onClick={adjustPlaybackSpeed}>
            <span>{playbackSpeed}x</span>
          </button>
        </div>
      </div>
      
      {/* 📊 NEW: Progress & Fluency Display */}
      {isRecording && (
        <div className="stats-container">
          <div className="progress-section">
            <h3>Reading Progress</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${getSessionStats().progress}%` }}
              />
            </div>
            <div className="progress-text">
              {getSessionStats().progress}% complete | {getSessionStats().wordsMatched}/{getSessionStats().totalWords} words matched
            </div>
          </div>
          
          <div className="fluency-section">
            <h3>Fluency Score</h3>
            <div className="fluency-score-display">
              <div className="score-percentage">{Math.round(fluencyScore * 100)}%</div>
              <div className="score-bar">
                <div 
                  className="score-fill" 
                  style={{ 
                    width: `${fluencyScore * 100}%`,
                    background: fluencyScore > 0.7 ? '#22c55e' : fluencyScore > 0.4 ? '#f97316' : '#ef4444'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">{getSessionStats().accuracy}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">WPM</span>
              <span className="stat-value">{getSessionStats().wpm}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Time</span>
              <span className="stat-value">{formatTime(currentTime)}</span>
            </div>
          </div>
          
          {lastError && (
            <div className="error-message">
              ⚠️ {lastError}
            </div>
          )}
        </div>
      )}
      
      {/* Add CSS for new controls */}
      <style>{`
        .auto-highlight-controls {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 20px;
          background: rgba(124, 58, 237, 0.1);
          padding: 12px;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          margin: 0 auto 20px;
        }
        
        .speed-display {
          font-size: 14px;
          margin-bottom: 8px;
          color: #7c3aed;
        }
        
        .speed-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .speed-btn {
          background: rgba(124, 58, 237, 0.2);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #7c3aed;
          transition: all 0.2s;
        }
        
        .speed-btn:hover {
          background: rgba(124, 58, 237, 0.3);
        }
        
        .speed-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .auto-highlight-btn {
          background: #7c3aed;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .auto-highlight-btn:hover {
          background: #6d28d9;
        }
        
        .auto-highlight-btn.active {
          background: #ef4444;
        }
        
        .auto-highlight-btn.active:hover {
          background: #dc2626;
        }
        
        /* 📊 NEW: Stats & Progress Styles */
        .stats-container {
          max-width: 600px;
          margin: 20px auto;
          background: linear-gradient(135deg, #f0f4ff 0%, #e6eeff 100%);
          border-radius: 12px;
          padding: 20px;
          border-left: 4px solid #7c3aed;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        
        .progress-section {
          margin-bottom: 20px;
        }
        
        .progress-section h3,
        .fluency-section h3 {
          font-size: 0.95rem;
          color: #7c3aed;
          margin-bottom: 8px;
          font-weight: 600;
        }
        
        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #4f46e5);
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          font-size: 0.85rem;
          color: #666;
          text-align: center;
        }
        
        .fluency-section {
          margin-bottom: 20px;
        }
        
        .fluency-score-display {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .score-percentage {
          font-size: 2rem;
          font-weight: 700;
          color: #7c3aed;
          min-width: 60px;
        }
        
        .score-bar {
          flex: 1;
          height: 12px;
          background: #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .score-fill {
          height: 100%;
          border-radius: 6px;
          transition: all 0.3s ease;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 16px;
        }
        
        .stat-item {
          background: white;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .stat-label {
          display: block;
          font-size: 0.8rem;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        
        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #7c3aed;
        }
        
        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px;
          border-radius: 6px;
          margin-top: 12px;
          font-size: 0.9rem;
        }
        
        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Therapy;