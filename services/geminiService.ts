
import { Type } from "@google/genai";
import { ai } from "../lib/ai";

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

export async function analyzeSubmissions(
  projectName: string,
  milestone: string,
  submissions: Submission[]
): Promise<AnalysisResult | null> {
  const prompt = `Act as a master documentary film editor. Analyze these short written submissions for "${projectName}" (a ${milestone} celebration).

Return JSON only.

Goals:
1) Identify the core emotional tone.
2) Group the submissions into a set of 3 to 7 themes that can form a 3-act narrative arc.
3) For each theme:
   - Name the theme
   - List the contributors whose submission fits the theme (use their exact name field)
   - Suggest a simple transition idea to move to the next theme
   - Assign an emotional beat label (example: "The Inside Joke", "The Tearjerker", "The Legacy", "The Gratitude Wave", "The Glow-Up")
   - Mark whether this theme is the climax (true for exactly one theme)
4) Provide a closingSentiment.

Submissions:
${submissions
  .map((s, i) => `${i + 1}. Name: ${s.name}\nMessage: ${s.message}`)
  .join("\n\n")}
`;

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

    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
}

/**
 * Live Director Reordering
 */
export async function reorderStoryboard(
  currentThemes: any[],
  instruction: string
): Promise<any[] | null> {
  const prompt = `You are a film editor. Here is the current storyboard for a tribute video:
${JSON.stringify(currentThemes, null, 2)}

The Director wants to make this change: "${instruction}"

Reorder the themes or adjust their emotional beat labels to satisfy this request. 
Return only the updated array of theme objects as JSON.`;

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

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Reorder Error:", error);
    return null;
  }
}

export async function generateContributorPrompts(
  milestone: string,
  recipient: string
): Promise<string[]> {
  const prompt = `You are an host. Suggest 10 prompt questions for ${recipient}'s ${milestone}. Return JSON array of strings.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  return JSON.parse(response.text);
}

export async function generateNudgeMessage(
  recipientName: string,
  milestone: string,
  deadline: string,
  tone: string
): Promise<NudgeResult> {
  const prompt = `Nudge message for ${recipientName}'s ${milestone}. JSON with keys: funny, heartfelt.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  return JSON.parse(response.text);
}

export async function generateInviteCopy(
  recipientName: string,
  milestone: string
): Promise<InviteCopyResult> {
  const prompt = `Invite copy for ${recipientName}'s ${milestone}. JSON with keys: whatsapp, email, slack.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  return JSON.parse(response.text);
}
