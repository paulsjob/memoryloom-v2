
import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI client using the environment variable directly as per guidelines.
// Assume process.env.API_KEY is pre-configured and valid.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
