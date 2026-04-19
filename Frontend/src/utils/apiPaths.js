// src/utils/apiPaths.js

export const BASE_URL = "http://localhost:5000/api";

export const API_PATHS = {
  AUTH: {
    LOGIN: "/login",
    SIGNUP: "/signup",
    PROFILE: "/profile",
  },

  SPEECH: {
    PROCESS: "/process-speech",  // used in StutterHelp.jsx
    RESULTS: "/results",         // used if you want raw DB results
  },

  DASHBOARD: {
    STATS: "/dashboard/stats",
    SESSIONS: "/dashboard/sessions", // ✅ used in ProfileDashboard
  }
};