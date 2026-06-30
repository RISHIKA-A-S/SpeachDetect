import librosa
import torch

from transformers import (
    Wav2Vec2Processor,
    Wav2Vec2Model
)

processor = Wav2Vec2Processor.from_pretrained(
    "facebook/wav2vec2-base"
)

wav2vec = Wav2Vec2Model.from_pretrained(
    "facebook/wav2vec2-base"
)

wav2vec.eval()


def extract_features(audio_path):

    audio, sr = librosa.load(
        audio_path,
        sr=16000
    )

    inputs = processor(
        audio,
        sampling_rate=16000,
        return_tensors="pt",
        padding=True
    )

    with torch.no_grad():

        outputs = wav2vec(
            inputs.input_values
        )

    features = outputs.last_hidden_state

    return features.squeeze(0).cpu().numpy()