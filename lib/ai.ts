
import { GoogleGenAI } from "@google/genai";

// Standardized AI client for the entire app
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
