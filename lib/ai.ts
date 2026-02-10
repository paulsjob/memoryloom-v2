import { GoogleGenAI } from "@google/genai";

// Vite exposes only env vars prefixed with VITE_ in browser builds.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

// Do not crash the app if missing.  Warn so the UI can still render.
if (!apiKey) {
  console.warn("⚠️ Missing VITE_GEMINI_API_KEY. Check Vercel Environment Variables.");
}

// Export a single shared AI client for the app.
// If missing, we export null and downstream code must guard.
export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
