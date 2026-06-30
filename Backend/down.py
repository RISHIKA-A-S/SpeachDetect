from transformers import Wav2Vec2Model

print("Starting download...")

model = Wav2Vec2Model.from_pretrained(
    "facebook/wav2vec2-base",
    # resume_download=False
)

print("Downloaded successfully!")