// src/utils/apiPaths.js

export const BASE_URL = "http://localhost:5000/api";

export const AUTH_PATHS = {
  LOGIN: "/login",     // ✅ matches Flask
  SIGNUP: "/signup",   // ✅ matches Flask
  PROFILE: "/profile", // optional, add later if backend supports it
};

export const API_PATHS = {
  AUTH: AUTH_PATHS,
};
