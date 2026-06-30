import numpy as np


def analyze_audio_for_stutter(audio, sample_rate=16000):
    """Estimate whether an audio clip contains stutter-like disfluencies.

    The detector uses a lightweight, dependency-free heuristic based on:
    - short-term energy bursts,
    - repeated pattern structure via autocorrelation,
    - silence/pauses between bursts.
    """
    audio = np.asarray(audio, dtype=np.float32)

    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)

    if audio.size < 256:
        return {
            "predicted_class": "Normal",
            "confidence": 0.5,
            "stutter_detected": False,
            "class_probs": {"Normal": 1.0},
            "reason": "Audio is too short for reliable detection.",
        }

    audio = audio - np.mean(audio)
    audio = audio / (np.std(audio) + 1e-6)

    frame_length = max(1, int(0.02 * sample_rate))
    n_frames = max(1, len(audio) // frame_length)
    frames = audio[: n_frames * frame_length].reshape(n_frames, frame_length)
    frame_rms = np.sqrt(np.mean(frames ** 2, axis=1))

    energy_threshold = max(0.05, np.percentile(frame_rms, 75) * 0.8)
    voiced = frame_rms >= energy_threshold

    if voiced.sum() == 0:
        return {
            "predicted_class": "Normal",
            "confidence": 0.75,
            "stutter_detected": False,
            "class_probs": {"Normal": 1.0},
            "reason": "No clear speech energy was detected.",
        }

    zero_crossings = np.count_nonzero(np.diff(np.signbit(audio)))
    zero_cross_rate = zero_crossings / max(1, len(audio))

    # Detect repetitive burst structure via autocorrelation.
    if len(audio) >= 256:
        corr = np.correlate(audio, audio, mode="full")
        corr = corr[len(audio) - 1 :]
        corr = corr / np.maximum(np.arange(len(corr), 0, -1), 1)
        lags = np.arange(40, min(2500, len(corr)), 20)
        if len(lags) > 0:
            corr_vals = corr[lags]
            repeated_score = float(np.max(corr_vals))
        else:
            repeated_score = 0.0
    else:
        repeated_score = 0.0

    # Count voiced bursts separated by quiet periods.
    transitions = np.diff(voiced.astype(int))
    burst_count = int(np.count_nonzero(transitions == 1))
    silence_ratio = float(np.mean(frame_rms < energy_threshold))

    diffs = np.abs(np.diff(audio))
    edge_threshold = max(1e-3, np.percentile(diffs, 90) * 0.6)
    edge_score = float(np.mean(diffs > edge_threshold))

    stutter_score = 0.0
    if repeated_score > 0.25:
        stutter_score += 0.45
    if burst_count >= 2:
        stutter_score += 0.25
    if silence_ratio > 0.1:
        stutter_score += 0.2
    if zero_cross_rate > 0.03:
        stutter_score += 0.1
    if edge_score > 0.01:
        stutter_score += 0.2

    stutter_score = min(stutter_score, 1.0)
    stutter_detected = stutter_score >= 0.5

    if stutter_detected:
        predicted_class = "SoundRep" if repeated_score > 0.3 else "Block"
        confidence = round(min(0.95, 0.55 + stutter_score * 0.35), 4)
        reason = "Repeated speech bursts and short pauses suggest stutter-like disfluency."
    else:
        predicted_class = "Normal"
        confidence = round(max(0.5, 0.7 - stutter_score * 0.2), 4)
        reason = "Speech looks relatively fluent based on the current audio pattern."

    class_probs = {
        "Prolongation": 0.0,
        "Block": 0.0,
        "SoundRep": 0.0,
        "WordRep": 0.0,
        "Interjection": 0.0,
        "Normal": 0.0,
    }
    class_probs[predicted_class] = confidence
    if predicted_class != "Normal":
        class_probs["Normal"] = round(max(0.01, 1.0 - confidence), 4)
    else:
        class_probs["Normal"] = round(max(0.5, 1.0 - confidence), 4)

    return {
        "predicted_class": predicted_class,
        "confidence": confidence,
        "stutter_detected": stutter_detected,
        "class_probs": class_probs,
        "reason": reason,
        "stutter_score": round(stutter_score, 4),
    }
