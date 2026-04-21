// useTherapySave.js
// Drop this hook into src/hooks/ and call it from Therapy.jsx
// to automatically save session results to the backend.
//
// Usage in Therapy.jsx:
//   import useTherapySave from "../../hooks/useTherapySave";
//   const { saveSession } = useTherapySave();
//
//   // Call when user stops recording or completes the passage:
//   saveSession({
//     passageId:    selectedPassage.id,
//     passageTitle: selectedPassage.title,
//     totalWords:   totalWords,
//     wordsRead:    currentWordIndex + 1,
//     wpm:          sessionStats.wordsPerMinute,
//     accuracy:     sessionStats.accuracy,
//     fluencyScore: fluencyScore,
//     duration:     totalTime,   // seconds
//   });

import { useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";

const useTherapySave = () => {
  const saveSession = useCallback(async (data) => {
    // Guard: only save if meaningful progress was made (> 5 words)
    if (!data.passageId || data.wordsRead < 5) return;

    try {
      await axiosInstance.post("/therapy/save", {
        passageId:    data.passageId,
        passageTitle: data.passageTitle,
        totalWords:   data.totalWords,
        wordsRead:    data.wordsRead,
        wpm:          data.wpm   || 0,
        accuracy:     data.accuracy || 0,
        fluencyScore: parseFloat((data.fluencyScore || 0).toFixed(2)),
        duration:     data.duration || 0,
      });
      console.log("✅ Therapy session saved");
    } catch (err) {
      // Silent fail — don't interrupt the UX
      console.warn("⚠️ Could not save therapy session:", err?.response?.data || err.message);
    }
  }, []);

  return { saveSession };
};

export default useTherapySave;