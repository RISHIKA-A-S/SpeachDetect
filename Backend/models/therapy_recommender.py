"""
Evidence-based Adaptive Recommendation Layer
Maps (stutter class, severity) → structured therapy exercises.

Evidence base:
  - Guitar (2006): Overcoming Stuttering — prolonged speech technique
  - Bloodstein & Ratner (2008): Handbook on Stuttering — voluntary stuttering
  - Manning (2009): Clinical Decision Making in Fluency Disorders — DAF/AAF
  - Bothe et al. (2006): Stuttering treatment research — breathing exercises
"""

THERAPY_MAP = {
    ("Prolongation", "Mild"): {
        "exercise": "Prolonged Speech",
        "description": "Intentionally stretch vowel sounds to 2–3 seconds. Gradually reduce to natural rate.",
        "evidence": "Guitar (2006), Ch. 8",
        "duration_min": 10,
    },
    ("Prolongation", "Moderate"): {
        "exercise": "Delayed Auditory Feedback (DAF)",
        "description": "Use a DAF device at 50–100ms delay. Focus on smooth, slow speech onset.",
        "evidence": "Manning (2009), pp. 210–215",
        "duration_min": 15,
    },
    ("Block", "Mild"): {
        "exercise": "Easy Onset",
        "description": "Begin each phrase with a soft, breathy initiation of the first sound.",
        "evidence": "Guitar (2006), Ch. 7",
        "duration_min": 10,
    },
    ("Block", "Moderate"): {
        "exercise": "Voluntary Stuttering",
        "description": "Purposefully produce easy bounces on feared words to reduce anticipatory anxiety.",
        "evidence": "Bloodstein & Ratner (2008), Ch. 15",
        "duration_min": 15,
    },
    ("Block", "Severe"): {
        "exercise": "Cancellation Technique",
        "description": "After a block, pause, release tension, then repeat the word smoothly.",
        "evidence": "Van Riper (1973), Stuttering Treatment Manual",
        "duration_min": 20,
    },
    ("SoundRep", "Mild"): {
        "exercise": "Smooth Speech Phrasing",
        "description": "Link syllables within phrases without pausing. Practice with 3-word chunks.",
        "evidence": "Bothe et al. (2006), JSLHR",
        "duration_min": 10,
    },
    ("WordRep", "Mild"): {
        "exercise": "Pausing and Phrasing",
        "description": "Use intentional pauses between phrases. Avoid fillers by pausing silently.",
        "evidence": "Guitar (2006), Ch. 9",
        "duration_min": 8,
    },
    ("Interjection", "Mild"): {
        "exercise": "Filler Reduction Drill",
        "description": "Replace uh/um with a silent pause of 1 second. Record and self-monitor.",
        "evidence": "Manning (2009), pp. 190–195",
        "duration_min": 8,
    },
}

DEFAULT_EXERCISE = {
    "exercise": "Diaphragmatic Breathing",
    "description": "4-count inhale, 4-count hold, 4-count exhale. Repeat before speaking tasks.",
    "evidence": "Bloodstein & Ratner (2008), Ch. 12",
    "duration_min": 5,
}

def recommend(stutter_class: str, severity: str) -> dict:
    key = (stutter_class, severity)
    exercise = THERAPY_MAP.get(key, DEFAULT_EXERCISE).copy()
    exercise["stutter_class"] = stutter_class
    exercise["severity"]      = severity
    return exercise