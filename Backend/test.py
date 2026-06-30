import torch

ckpt = torch.load("models/weights/wav2vec_bilstm.pt", map_location="cpu")

print(type(ckpt))

if isinstance(ckpt, dict):
    print(ckpt.keys())