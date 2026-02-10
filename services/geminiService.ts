
import { Type, GoogleGenAI } from "@google/genai";

/**
 * MemoryLoom Intelligence Service
 */

export type Submission = { name: string; message: string };

export type AnalysisTheme = {
  themeName: string;
  contributors: string[];
  suggestedTransition: string;
  emotionalBeat: string;
  isClimax: boolean;
};

export type AnalysisResult = {
  tone: string;
  musicGenre: string;
  themes: AnalysisTheme[];
  closingSentiment: string;
};

export type NudgeResult = {
  funny: string;
  heartfelt: string;
};

export type InviteCopyResult = {
  whatsapp: string;
  email: string;
  slack: string;
};

/**
 * Narrative Analysis
 * Fallback: Chronological heuristic editing.
 */
export async function analyzeSubmissions(
  projectName: string,
  milestone: string,
  submissions: Submission[]
): Promise<AnalysisResult | null> {
  const apiKey = process.env.API_KEY;
  
  // Standard Mode Fallback
  if (!apiKey || apiKey === "undefined") {
    console.log("MemoryLoom: Running in Standard Mode (Static Templates)");
    return {
      tone: "Heartfelt & Sincere",
      musicGenre: "Acoustic Folk",
      themes: [
        { themeName: "The Opening Act", contributors: submissions.slice(0, 2).map(s => s.name), suggestedTransition: "Fade to black", emotionalBeat: "Warm Welcome", isClimax: false },
        { themeName: "Favorite Memories", contributors: submissions.slice(2).map(s => s.name), suggestedTransition: "Cross dissolve", emotionalBeat: "The Heart of the Story", isClimax: true },
      ],
      closingSentiment: "Wishing you a wonderful celebration!"
    };
  }

  // Create a fresh instance for the call to ensure current API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Act as a documentary film editor. Analyze submissions for "${projectName}" (${milestone}).
Return JSON with themes, emotional beats, and a closing sentiment.
Submissions:
${submissions.map((s, i) => `${i + 1}. Name: ${s.name}\nMsg: ${s.message}`).join("\n\n")}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tone: { type: Type.STRING },
            musicGenre: { type: Type.STRING },
            themes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  themeName: { type: Type.STRING },
                  contributors: { type: Type.ARRAY, items: { type: Type.STRING } },
                  suggestedTransition: { type: Type.STRING },
                  emotionalBeat: { type: Type.STRING },
                  isClimax: { type: Type.BOOLEAN },
                },
                required: ["themeName", "contributors", "suggestedTransition", "emotionalBeat", "isClimax"],
              },
            },
            closingSentiment: { type: Type.STRING },
          },
          required: ["tone", "musicGenre", "themes", "closingSentiment"],
        },
      },
    });
    // Extract text from the property directly
    const jsonStr = response.text;
    return jsonStr ? (JSON.parse(jsonStr) as AnalysisResult) : null;
  } catch (error) {
    console.error("Narrative Analysis failed, using fallback.", error);
    return null;
  }
}

export async function reorderStoryboard(
  currentThemes: any[],
  instruction: string
): Promise<any[] | null> {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return null;

  // Create a fresh instance for the call to ensure current API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Reorder these video themes based on: "${instruction}"\n\n${JSON.stringify(currentThemes)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              themeName: { type: Type.STRING },
              contributors: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedTransition: { type: Type.STRING },
              emotionalBeat: { type: Type.STRING },
              isClimax: { type: Type.BOOLEAN },
            },
            required: ["id", "themeName", "contributors", "suggestedTransition", "emotionalBeat", "isClimax"],
          },
        },
      },
    });
    // Extract text from the property directly
    const jsonStr = response.text;
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch (error) {
    throw error;
  }
}

export async function generateContributorPrompts(milestone: string, recipient: string): Promise<string[]> {
  const apiKey = process.env.API_KEY;
  const fallbacks = ["Tell a story about them", "What do they mean to you?", "A funny memory", "Your wish for them"];
  if (!apiKey || apiKey === "undefined") return fallbacks;

  // Create a fresh instance for the call to ensure current API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 10 prompt questions for ${recipient}'s ${milestone}. Return a JSON array of strings.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    });
    // Extract text from the property directly
    const jsonStr = response.text;
    return jsonStr ? JSON.parse(jsonStr) : fallbacks;
  } catch (e) { return fallbacks; }
}

export async function generateNudgeMessage(recipientName: string, milestone: string, deadline: string, tone: string): Promise<NudgeResult> {
  const apiKey = process.env.API_KEY;
  const fallback = { funny: "Hey! The Loom is waiting for you!", heartfelt: `We'd love to have your voice in the video for ${recipientName}.` };
  if (!apiKey || apiKey === "undefined") return fallback;

  // Create a fresh instance for the call to ensure current API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Nudge message for ${recipientName}'s ${milestone}. Return a JSON object with keys: funny, heartfelt.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            funny: { type: Type.STRING },
            heartfelt: { type: Type.STRING }
          },
          required: ["funny", "heartfelt"]
        }
      },
    });
    // Extract text from the property directly
    const jsonStr = response.text;
    return jsonStr ? JSON.parse(jsonStr) : fallback;
  } catch (e) { return fallback; }
}

export async function generateInviteCopy(recipientName: string, milestone: string): Promise<InviteCopyResult> {
  const apiKey = process.env.API_KEY;
  const fallback = { whatsapp: "Hey! Join the video tribute for " + recipientName, email: "Contribution request for video tribute.", slack: "Team project for " + recipientName };
  if (!apiKey || apiKey === "undefined") return fallback;

  // Create a fresh instance for the call to ensure current API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Invite copy for ${recipientName}'s ${milestone}. Return a JSON object with keys: whatsapp, email, slack.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatsapp: { type: Type.STRING },
            email: { type: Type.STRING },
            slack: { type: Type.STRING }
          },
          required: ["whatsapp", "email", "slack"]
        }
      },
    });
    // Extract text from the property directly
    const jsonStr = response.text;
    return jsonStr ? JSON.parse(jsonStr) : fallback;
  } catch (e) { return fallback; }
}
