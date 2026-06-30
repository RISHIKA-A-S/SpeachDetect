import os

import torch
import torch.nn as nn


class Wav2VecBiLSTM(nn.Module):

    def __init__(
        self,
        input_dim=768,
        hidden=512,
        num_classes=6,
        dropout=0.4
    ):
        super().__init__()

        # BiLSTM encoder
        self.bilstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden,
            num_layers=2,
            bidirectional=True,
            batch_first=True,
            dropout=dropout
        )

        # Attention layer
        self.attention = nn.Linear(hidden * 2, 1)

        # Classifier head
        self.classifier = nn.Sequential(
            nn.Linear(hidden * 2, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):

        # x: (batch, time, feature_dim)
        out, _ = self.bilstm(x)

        # attention scores
        attn_weights = torch.softmax(
            self.attention(out),
            dim=1
        )

        # weighted sum (context vector)
        context = torch.sum(out * attn_weights, dim=1)

        return self.classifier(context)


def load_model(path, device="cpu"):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model file not found: {path}")

    model = Wav2VecBiLSTM().to(device)

    checkpoint = torch.load(path, map_location=device, weights_only=False)

    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
    else:
        state_dict = checkpoint

    cleaned_state_dict = {}
    for key, value in state_dict.items():
        cleaned_state_dict[key.replace("module.", "")] = value

    model.load_state_dict(cleaned_state_dict, strict=True)
    model.eval()

    print("Model loaded successfully.")
    return model