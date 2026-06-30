import unittest
import numpy as np

from models.stutter_detector import analyze_audio_for_stutter


class StutterDetectionTests(unittest.TestCase):
    def test_detects_repetitive_audio_as_stutter(self):
        sample_rate = 16000
        duration = 1.0
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        audio = np.concatenate([
            np.sin(2 * np.pi * 220 * t[:4000]),
            np.sin(2 * np.pi * 220 * t[4000:5000]),
            np.sin(2 * np.pi * 220 * t[5000:9000]),
            np.sin(2 * np.pi * 220 * t[9000:10000]),
        ])

        result = analyze_audio_for_stutter(audio, sample_rate=sample_rate)

        self.assertTrue(result["stutter_detected"])
        self.assertIn(result["predicted_class"], {"SoundRep", "Block", "Prolongation", "Normal"})
        self.assertGreaterEqual(result["confidence"], 0.0)


if __name__ == "__main__":
    unittest.main()
