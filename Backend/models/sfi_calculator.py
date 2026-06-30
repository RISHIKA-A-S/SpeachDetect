from config import SR_WEIGHT, SF_WEIGHT, PD_WEIGHT, PA_WEIGHT
from config import SFI_MAX_SR, SFI_MAX_SF, SFI_MAX_PD, THRESHOLDS
import numpy as np

def compute_sfi(stutter_rate, stutter_freq, prolong_dur, phrase_acc):
    SR_n = np.clip(stutter_rate / SFI_MAX_SR, 0, 1)
    SF_n = np.clip(stutter_freq  / SFI_MAX_SF, 0, 1)
    PD_n = np.clip(prolong_dur   / SFI_MAX_PD, 0, 1)
    PA_n = np.clip(phrase_acc,                 0, 1)

    disfluency_score = (
        SR_WEIGHT * SR_n +
        SF_WEIGHT * SF_n +
        PD_WEIGHT * PD_n +
        PA_WEIGHT * (1 - PA_n)
    )

    sfi = round(float(100 * (1 - disfluency_score)), 2)
    sfi = max(0.0, min(100.0, sfi))

    normal_min = THRESHOLDS["sfi_normal_min"]
    mild_min   = THRESHOLDS["sfi_mild_min"]

    if   sfi >= normal_min: severity = "Normal"
    elif sfi >= mild_min:   severity = "Mild"
    elif sfi >= 35:         severity = "Moderate"
    else:                   severity = "Severe"

    return {
        "sfi": sfi,
        "severity": severity,
        "components": {
            "SR_norm": round(float(SR_n), 4),
            "SF_norm": round(float(SF_n), 4),
            "PD_norm": round(float(PD_n), 4),
            "PA_norm": round(float(PA_n), 4),
        },
    }