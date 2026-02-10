
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
  isFallback?: boolean;
  error?: string;
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
 * Helper to handle API calls with retries and specific error types
 */
async function callAi<T>(
  modelName: string,
  prompt: string,
  schema: any,
  retries = 2
): Promise<T | null> {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return null;

  const ai = new GoogleGenAI({ apiKey });
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return JSON.parse(text) as T;
    } catch (error: any) {
      const isQuotaError = error?.message?.includes("429") || error?.status === 429;
      
      if (isQuotaError) {
        console.warn("Gemini Quota Exceeded (429). Check your billing plan at ai.google.dev/gemini-api/docs/billing");
        if (i < retries) {
          // Wait for 2 seconds before retry on 429
          await new Promise(r => setTimeout(r, 2000 * (i + 1)));
          continue;
        }
        throw new Error("QUOTA_EXCEEDED");
      }
      
      if (i === retries) {
        console.error("AI call failed after retries:", error);
        return null;
      }
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  return null;
}

/**
 * Narrative Analysis
 */
export async function analyzeSubmissions(
  projectName: string,
  milestone: string,
  submissions: Submission[]
): Promise<AnalysisResult | null> {
  const fallbackResult: AnalysisResult = {
    tone: "Heartfelt & Sincere",
    musicGenre: "Acoustic Folk",
    themes: [
      { themeName: "Opening Moments", contributors: submissions.slice(0, 2).map(s => s.name), suggestedTransition: "Cross dissolve", emotionalBeat: "Warm Welcome", isClimax: false },
      { themeName: "Family Stories", contributors: submissions.slice(2).map(s => s.name), suggestedTransition: "Fade to black", emotionalBeat: "The Core Memories", isClimax: true },
    ],
    closingSentiment: "Wishing you a wonderful celebration!",
    isFallback: true
  };

  const prompt = `Act as a documentary film editor. Analyze submissions for "${projectName}" (${milestone}).
Return JSON with themes, emotional beats, and a closing sentiment.
Submissions:
${submissions.length > 0 ? submissions.map((s, i) => `${i + 1}. Name: ${s.name}\nMsg: ${s.message}`).join("\n\n") : "None yet. Create placeholder themes."}`;

  const schema = {
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
  };

  try {
    const result = await callAi<AnalysisResult>("gemini-3-pro-preview", prompt, schema);
    return result || fallbackResult;
  } catch (error: any) {
    if (error.message === "QUOTA_EXCEEDED") {
      return { ...fallbackResult, error: "QUOTA_EXCEEDED" };
    }
    return fallbackResult;
  }
}

export async function reorderStoryboard(
  currentThemes: any[],
  instruction: string
): Promise<any[] | null> {
  const prompt = `Reorder these video themes based on: "${instruction}"\n\n${JSON.stringify(currentThemes)}`;
  const schema = {
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
  };

  try {
    return await callAi<any[]>("gemini-3-flash-preview", prompt, schema);
  } catch {
    return null;
  }
}

export async function generateContributorPrompts(milestone: string, recipient: string): Promise<string[]> {
  const fallbacks = ["Tell a story about them", "What do they mean to you?", "A funny memory", "Your wish for them"];
  const prompt = `Suggest 10 prompt questions for ${recipient}'s ${milestone}. Return a JSON array of strings.`;
  const schema = {
    type: Type.ARRAY,
    items: { type: Type.STRING }
  };

  try {
    const result = await callAi<string[]>("gemini-3-flash-preview", prompt, schema);
    return result || fallbacks;
  } catch {
    return fallbacks;
  }
}

export async function generateNudgeMessage(recipientName: string, milestone: string, deadline: string, tone: string): Promise<NudgeResult> {
  const fallback = { funny: "Hey! The Loom is waiting for you!", heartfelt: `We'd love to have your voice in the video for ${recipientName}.` };
  const prompt = `Nudge message for ${recipientName}'s ${milestone}. Return a JSON object with keys: funny, heartfelt.`;
  const schema = {
    type: Type.OBJECT,
    properties: {
      funny: { type: Type.STRING },
      heartfelt: { type: Type.STRING }
    },
    required: ["funny", "heartfelt"]
  };

  try {
    const result = await callAi<NudgeResult>("gemini-3-flash-preview", prompt, schema);
    return result || fallback;
  } catch {
    return fallback;
  }
}

export async function generateInviteCopy(recipientName: string, milestone: string): Promise<InviteCopyResult> {
  const fallback = { whatsapp: "Hey! Join the video tribute for " + recipientName, email: "Contribution request for video tribute.", slack: "Team project for " + recipientName };
  const prompt = `Invite copy for ${recipientName}'s ${milestone}. Return a JSON object with keys: whatsapp, email, slack.`;
  const schema = {
    type: Type.OBJECT,
    properties: {
      whatsapp: { type: Type.STRING },
      email: { type: Type.STRING },
      slack: { type: Type.STRING }
    },
    required: ["whatsapp", "email", "slack"]
  };

  try {
    const result = await callAi<InviteCopyResult>("gemini-3-flash-preview", prompt, schema);
    return result || fallback;
  } catch {
    return fallback;
  }
}
