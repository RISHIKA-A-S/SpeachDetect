from transformers import GPT2LMHeadModel, GPT2Tokenizer
import torch

class DistilGPT2Recommender:
    """
    DistilGPT-2 fine-tuned on speech therapy transcripts
    for next-word suggestion.
    Evaluation: perplexity on held-out therapy session transcripts.
    """
    def __init__(self, model_path: str, device="cpu"):
        self.tokenizer = GPT2Tokenizer.from_pretrained(model_path)
        self.model = GPT2LMHeadModel.from_pretrained(model_path)
        self.model.eval().to(device)
        self.device = device

    def suggest(self, context: str, top_k: int = 5) -> list[str]:
        inputs = self.tokenizer(
            context, return_tensors="pt"
        ).to(self.device)
        with torch.no_grad():
            outputs = self.model(**inputs)
        logits = outputs.logits[:, -1, :]   # last token distribution
        probs  = torch.softmax(logits, dim=-1)
        top_ids = torch.topk(probs, top_k).indices[0].tolist()
        words  = [self.tokenizer.decode([i]).strip() for i in top_ids]
        return [w for w in words if w.isalpha()][:top_k]