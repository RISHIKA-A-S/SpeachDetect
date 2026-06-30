import { useState, useRef, useEffect } from "react";

export default function AudioRecorder({ onAudioReady }) {
  const [recording, setRecording] = useState(false);

  const mediaRef       = useRef(null);
  const chunksRef      = useRef([]);
  const canvasRef      = useRef(null);
  const wavesCanvasRef = useRef(null);
  const audioCtxRef    = useRef(null);
  const analyserRef    = useRef(null);
  const animFrameRef   = useRef(null);
  const streamRef      = useRef(null);

  useEffect(() => {
    const resize = () => {
      if (wavesCanvasRef.current) {
        wavesCanvasRef.current.width  = wavesCanvasRef.current.offsetWidth;
        wavesCanvasRef.current.height = wavesCanvasRef.current.offsetHeight;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const drawCircle = (ctx, w, h, data) => {
    const cx  = w / 2;
    const cy  = h / 2;
    const r   = Math.min(cx, cy) - 8;
    const avg = data.reduce((s, v) => s + v, 0) / data.length;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(124,58,237,0.2)";
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.62 + (avg / 512) * 0.28), 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(124,58,237,${0.45 + avg / 512})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.38, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();
  };

  const drawWaves = (ctx, w, h, data) => {
    const t = Date.now() * 0.001;
    ctx.clearRect(0, 0, w, h);

    for (let wi = 0; wi < 3; wi++) {
      const alpha = 0.28 - wi * 0.07;
      const amp   = 1    - wi * 0.22;
      const ss    = Math.min(data.length, 32);
      let sum = 0;
      for (let i = 0; i < ss; i++) sum += data[i * Math.floor(data.length / ss)];
      const dyn  = Math.max(4, (sum / ss) * 0.45 * amp);
      const step = Math.max(4, Math.floor(w / 120));

      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x <= w; x += step) {
        const y =
          Math.sin(x * 0.01 + t * (wi + 1) * 0.5) * dyn +
          Math.sin(x * 0.02 - t * (wi + 1) * 0.7) * dyn * 0.5 +
          h / 2;
        ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0,   `rgba(124,58,237,${alpha})`);
      g.addColorStop(0.5, `rgba(79,70,229,${alpha})`);
      g.addColorStop(1,   `rgba(124,58,237,${alpha})`);
      ctx.strokeStyle = g;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    }
  };

  const startViz = () => {
    const data    = new Uint8Array(analyserRef.current.frequencyBinCount);
    const canvas  = canvasRef.current;
    const wCanvas = wavesCanvasRef.current;
    if (!canvas || !wCanvas) return;
    const ctx  = canvas.getContext("2d");
    const wCtx = wCanvas.getContext("2d");

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCircle(ctx, canvas.width, canvas.height, data);
      drawWaves(wCtx, wCanvas.width, wCanvas.height, data);
    };
    render();
  };

  const stopViz = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const canvas  = canvasRef.current;
    const wCanvas = wavesCanvasRef.current;
    if (canvas)  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    if (wCanvas) wCanvas.getContext("2d").clearRect(0, 0, wCanvas.width, wCanvas.height);
  };

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
    });
    streamRef.current = stream;

    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    audioCtxRef.current.createMediaStreamSource(stream).connect(analyserRef.current);
    startViz();

    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/wav" });
      const file = new File([blob], "recording.wav", { type: "audio/wav" });
      onAudioReady(file, URL.createObjectURL(blob));
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
  };

  const stop = () => {
    mediaRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopViz();
    setRecording(false);
  };

  return (
    <div className="ar-wrap">
      <canvas ref={wavesCanvasRef} className="ar-waves" />

      <div className="ar-card">
        <div className="ar-circle-wrap">
          <button
            className={`ar-circle-btn ${recording ? "ar-recording" : ""}`}
            onClick={recording ? stop : start}
            aria-label={recording ? "Stop recording" : "Start recording"}
          >
            <canvas ref={canvasRef} className="ar-circle-canvas" width={140} height={140} />
            <span className="ar-circle-icon">
              {recording ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="5" width="14" height="14" rx="2" fill="white" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4Z" fill="white"/>
                  <path d="M19 10a7 7 0 0 1-14 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="17" x2="12" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8"  y1="21" x2="16" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </span>
          </button>
        </div>

        <p className="ar-status">
          {recording ? "Recording… tap to stop" : "Tap to start recording"}
        </p>

        <label className="ar-upload-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Upload audio file
          <input
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) onAudioReady(f, URL.createObjectURL(f));
            }}
          />
        </label>
      </div>
    </div>
  );
}