
import { Type, GoogleGenAI } from "@google/genai";

/**
 * MemoryLoom Intelligence Service
 */

export type Submission = { id: string; name: string; message: string; type: string };

export type AnalysisTheme = {
  themeName: string;
  contributors: string[];
  suggestedTransition: string;
  emotionalBeat: string;
  isClimax: boolean;
  assetId?: string;
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

// Internal helper for AI calls
async function callAi<T>(
  modelName: string,
  prompt: string,
  schema: any,
  retries = 2
): Promise<T | null> {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return null;

  // Always initialize with named parameter and ensure fresh instance right before call
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

      // Guidelines: access .text as a property, not a method call
      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return JSON.parse(text.trim()) as T;
    } catch (error: any) {
      if (error?.message?.includes("429") || error?.status === 429) {
        if (i < retries) {
          await new Promise(r => setTimeout(r, 2000 * (i + 1)));
          continue;
        }
        throw new Error("QUOTA_EXCEEDED");
      }
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  return null;
}

export async function analyzeSubmissions(
  projectName: string,
  milestone: string,
  submissions: Submission[]
): Promise<AnalysisResult | null> {
  // Improved fallback to include more variety if many submissions exist
  const themes = submissions.map((s, i) => ({
    themeName: i === 0 ? "Opening Moments" : (i === submissions.length - 1 ? "Closing Wishes" : s.name + "'s Perspective"),
    contributors: [s.name],
    suggestedTransition: "Cross dissolve",
    emotionalBeat: i % 2 === 0 ? "Heartfelt Connection" : "A Bit of Humour",
    isClimax: i === Math.floor(submissions.length / 2),
    assetId: s.id
  }));

  const fallbackResult: AnalysisResult = {
    tone: "Heartfelt & Sincere",
    musicGenre: "Acoustic Folk",
    themes: themes.length > 0 ? themes : [
      { themeName: "Opening Moments", contributors: ["Family"], suggestedTransition: "Cross dissolve", emotionalBeat: "Warm Welcome", isClimax: false }
    ],
    closingSentiment: "Wishing you a wonderful celebration!",
    isFallback: true
  };

  const prompt = `Act as a documentary film editor. Analyze submissions for "${projectName}" (${milestone}).
Return JSON with themes, emotional beats, and a closing sentiment. 
IMPORTANT: Create a narrative sequence that uses EVERY submission provided.
Submissions:
${submissions.map((s, i) => `${i + 1}. [ID:${s.id}] Name: ${s.name} (${s.type})\nMsg: ${s.message}`).join("\n\n")}`;

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
            assetId: { type: Type.STRING, description: "The ID of the submission/asset this theme represents." },
          },
          required: ["themeName", "contributors", "suggestedTransition", "emotionalBeat", "isClimax", "assetId"],
          propertyOrdering: ["themeName", "contributors", "suggestedTransition", "emotionalBeat", "isClimax", "assetId"]
        },
      },
      closingSentiment: { type: Type.STRING },
    },
    required: ["tone", "musicGenre", "themes", "closingSentiment"],
    propertyOrdering: ["tone", "musicGenre", "themes", "closingSentiment"]
  };

  try {
    // For complex reasoning/sequencing tasks, use gemini-3-pro-preview
    const result = await callAi<AnalysisResult>("gemini-3-pro-preview", prompt, schema);
    return result || fallbackResult;
  } catch (error: any) {
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
        assetId: { type: Type.STRING },
      },
      required: ["id", "themeName", "contributors", "suggestedTransition", "emotionalBeat", "isClimax", "assetId"],
      propertyOrdering: ["id", "themeName", "contributors", "suggestedTransition", "emotionalBeat", "isClimax", "assetId"]
    },
  };

  try {
    // Basic text task: use gemini-3-flash-preview
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
    // Simple creative task: use gemini-3-flash-preview
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
    required: ["funny", "heartfelt"],
    propertyOrdering: ["funny", "heartfelt"]
  };

  try {
    // Simple text generation: use gemini-3-flash-preview
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
    required: ["whatsapp", "email", "slack"],
    propertyOrdering: ["whatsapp", "email", "slack"]
  };

  try {
    // Simple copy generation: use gemini-3-flash-preview
    const result = await callAi<InviteCopyResult>("gemini-3-flash-preview", prompt, schema);
    return result || fallback;
  } catch {
    return fallback;
  }
}
