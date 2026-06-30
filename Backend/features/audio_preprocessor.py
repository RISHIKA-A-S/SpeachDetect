import noisereduce as nr
import librosa
import soundfile as sf
import numpy as np
import tempfile, os

def preprocess(audio_path: str, sr: int = 16000) -> str:
    """
    1. Load audio
    2. Denoise via spectral gating (noisereduce)
    3. Normalize amplitude
    4. Save to a temp file and return its path
    """
    y, _ = librosa.load(audio_path, sr=sr, mono=True)
    # Estimate noise from first 0.5s
    noise_sample = y[:int(sr * 0.5)]
    y_denoised = nr.reduce_noise(y=y, y_noise=noise_sample, sr=sr)
    # Peak normalize
    peak = np.max(np.abs(y_denoised))
    if peak > 0:
        y_denoised = y_denoised / peak * 0.95
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    sf.write(tmp.name, y_denoised, sr)
    return tmp.name