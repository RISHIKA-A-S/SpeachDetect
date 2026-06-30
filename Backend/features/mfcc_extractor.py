import librosa
import numpy as np

def extract_features(audio_path: str, sr: int = 16000, n_mfcc: int = 40) -> np.ndarray:
    """
    Returns a (T, 120) feature matrix:
      - 40 MFCCs
      - 40 delta MFCCs
      - 40 delta-delta MFCCs
    T = number of frames.
    """
    y, _ = librosa.load(audio_path, sr=sr, mono=True)
    mfcc      = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    delta     = librosa.feature.delta(mfcc)
    delta2    = librosa.feature.delta(mfcc, order=2)
    # Shape: (3*n_mfcc, T) → transpose → (T, 3*n_mfcc)
    features  = np.concatenate([mfcc, delta, delta2], axis=0).T
    return features.astype(np.float32)

def extract_spectrogram(audio_path: str, sr: int = 16000) -> np.ndarray:
    y, _ = librosa.load(audio_path, sr=sr, mono=True)
    S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
    return librosa.power_to_db(S, ref=np.max)