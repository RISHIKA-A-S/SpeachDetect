import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "weights")

# SFI thresholds — bump Normal down to 70 so borderline cases aren't mislabelled
THRESHOLDS = {
    "stutter_confidence": 0.6,
    "sfi_normal_min": 70.0,   # was 75, caused 74.5 to show as Mild
    "sfi_mild_min": 50.0,     # was 55
}

MODEL_PATHS = {
    "wav2vec_bilstm": os.path.join(MODEL_DIR, "wav2vec_bilstm.pt"),
    "t5":             os.path.join(MODEL_DIR, "t5_corrector"),
    "distilgpt2":     os.path.join(MODEL_DIR, "distilgpt2_recommender"),
}

CLASSES = ["Prolongation", "Block", "SoundRep", "WordRep", "Interjection", "Normal"]

SR_WEIGHT = 0.30
SF_WEIGHT = 0.25
PD_WEIGHT = 0.25
PA_WEIGHT = 0.20

SFI_MAX_SR = 1.0
SFI_MAX_SF = 60.0
SFI_MAX_PD = 3.0