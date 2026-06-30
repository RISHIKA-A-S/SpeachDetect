import torch
import torch.nn as nn

class CNNBiLSTM(nn.Module):
    """
    Architecture:
      CNN block  → extract local acoustic patterns
      BiLSTM     → capture temporal context in both directions
      Classifier → per-class softmax
    """
    def __init__(self, input_dim=120, num_classes=6, hidden=256, dropout=0.3):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv1d(input_dim, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(128),
            nn.Conv1d(128, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.BatchNorm1d(128),
            nn.MaxPool1d(2),
            nn.Dropout(dropout),
        )
        self.bilstm = nn.LSTM(
            input_size=128,
            hidden_size=hidden,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=dropout,
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden * 2, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        # x: (B, T, input_dim)
        x = x.permute(0, 2, 1)             # → (B, input_dim, T) for Conv1d
        x = self.cnn(x)                    # → (B, 128, T//2)
        x = x.permute(0, 2, 1)             # → (B, T//2, 128)
        out, _ = self.bilstm(x)            # → (B, T//2, hidden*2)
        x = out[:, -1, :]                  # last timestep
        return self.classifier(x)          # → (B, num_classes)


def load_model(path: str, device="cpu") -> CNNBiLSTM:
    model = CNNBiLSTM()
    model.load_state_dict(torch.load(path, map_location=device))
    model.eval()
    return model