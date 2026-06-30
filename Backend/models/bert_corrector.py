import re

class BERTCorrector:
    def correct(self, text):
        original = text

        # Remove fillers
        text = re.sub(r'\b(um+|uh+|er+|ah+|hmm+)\b', '', text, flags=re.IGNORECASE)
        # Remove prolongation dots: "Can...." -> "Can"
        text = re.sub(r'(\w+)\.{2,}', r'\1', text)
        # Remove ellipsis: "Ryan…" -> "Ryan"
        text = re.sub(r'(\w+)[…]+', r'\1', text)
        # Sound repetition: "w-w-want" -> "want"
        text = re.sub(r'\b(?:\w+-)+(\w{3,})\b', r'\1', text)
        # Single char repetition: "I-I-I" -> "I"
        text = re.sub(r'\b(\w)-\1(?:-\1)+\b', r'\1', text, flags=re.IGNORECASE)
        # Word repetition: "I I I" -> "I"
        text = re.sub(r'\b(\w+)(?:\s+\1){1,3}\b', r'\1', text, flags=re.IGNORECASE)
        # Clean whitespace
        text = re.sub(r'\s{2,}', ' ', text)
        text = re.sub(r'\s+([.,!?])', r'\1', text)

        corrected = text.strip()
        was_corrected = corrected.lower() != original.lower()

        return corrected, was_corrected