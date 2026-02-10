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
  if (!ai) {
    console.warn("Gemini client not initialized. Missing VITE_GEMINI_API_KEY.");
    return null;
  }

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
   - Mark whether this theme is the climax (true for exactly one theme, typically Act 2 or early Act 3)
4) Provide a closingSentiment that could be used as a final line or voiceover.

Submissions:
${submissions
  .map((s, i) => `${i + 1}. Name: ${s.name}\nMessage: ${s.message}`)
  .join("\n\n")}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
                required: [
                  "themeName",
                  "contributors",
                  "suggestedTransition",
                  "emotionalBeat",
                  "isClimax",
                ],
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

export async function generateContributorPrompts(
  milestone: string,
  recipient: string
): Promise<string[]> {
  if (!ai) {
    console.warn("Gemini client not initialized. Missing VITE_GEMINI_API_KEY.");
    return [
      "What is a small, quiet way they've made your life better?",
      "If you had to pick one trademark habit of theirs, what would it be?",
      "Tell a story about a time they showed up for you when it mattered.",
      "What is one piece of advice they gave you that you actually followed?",
    ];
  }

  const prompt = `You are an emotionally intelligent host. Suggest 10 short, specific prompt questions that will help people record a video message for ${recipient}'s ${milestone}.
Avoid clichés like "Happy Birthday."
Focus on:
- Hidden talents
- Lessons learned from them
- A funny "you had to be there" moment
- A wish for their legacy

Return JSON only as an array of strings.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    return JSON.parse(response.text) as string[];
  } catch (error) {
    console.error("Gemini Prompts Error:", error);
    return [
      "What is a small, quiet way they've made your life better?",
      "If you had to pick one trademark habit of theirs, what would it be?",
      "Tell a story about a time they showed up for you when it mattered.",
      "What is one piece of advice they gave you that you actually followed?",
    ];
  }
}

export async function generateNudgeMessage(
  recipientName: string,
  milestone: string,
  deadline: string,
  tone: string
): Promise<NudgeResult> {
  if (!ai) {
    console.warn("Gemini client not initialized. Missing VITE_GEMINI_API_KEY.");
    return {
      funny: `Quick nudge.  We are collecting messages for ${recipientName}'s ${milestone} and you're on the highlight reel list.  Deadline: ${deadline}.  Can you sneak yours in?`,
      heartfelt: `Hi.  Just a gentle reminder that we are almost ready to wrap the messages for ${recipientName}'s ${milestone}.  Your voice matters here.  If you can, please submit by ${deadline}.`,
    };
  }

  const prompt = `Write a short, warm, but effective nudge message to someone who has not submitted their video for ${recipientName}'s ${milestone} yet.
The deadline is ${deadline}.
The project tone is ${tone}.
Make it feel like a gentle reminder from a friend, not a corporate alert.
Provide two options: one that's funny/light and one that's more heartfelt.

Return JSON only with keys: funny, heartfelt.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            funny: { type: Type.STRING },
            heartfelt: { type: Type.STRING },
          },
          required: ["funny", "heartfelt"],
        },
      },
    });

    return JSON.parse(response.text) as NudgeResult;
  } catch (error) {
    console.error("Gemini Nudge Error:", error);
    return {
      funny: `Quick nudge.  ${recipientName}'s ${milestone} project is waiting on you.  Deadline: ${deadline}.`,
      heartfelt: `Hi.  We are almost done weaving this together for ${recipientName}.  If you can, please submit by ${deadline}.`,
    };
  }
}

export async function generateInviteCopy(
  recipientName: string,
  milestone: string
): Promise<InviteCopyResult> {
  if (!ai) {
    console.warn("Gemini client not initialized. Missing VITE_GEMINI_API_KEY.");
    return {
      whatsapp: `I’m putting together a group video for ${recipientName}'s ${milestone}.  Want to add a short message?`,
      email: `Hi,\n\nI’m organizing a group video to celebrate ${recipientName}'s ${milestone}.  If you’re up for it, please record a short message and share it with me.\n\nThank you.`,
      slack: `Putting together a celebration video for ${recipientName}'s ${milestone}.  If you can share a short message, that would be awesome.`,
    };
  }

  const prompt = `Write invitation copy asking someone to contribute a short video message for ${recipientName}'s ${milestone}.
Provide three versions:
1) WhatsApp (short)
2) Email (detailed)
3) Slack or Teams (professional)

Return JSON only with keys: whatsapp, email, slack.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatsapp: { type: Type.STRING },
            email: { type: Type.STRING },
            slack: { type: Type.STRING },
          },
          required: ["whatsapp", "email", "slack"],
        },
      },
    });

    return JSON.parse(response.text) as InviteCopyResult;
  } catch (error) {
    console.error("Gemini Invite Error:", error);
    return {
      whatsapp: `I’m putting together a group video for ${recipientName}'s ${milestone}.  Want to add a short message?`,
      email: `Hi,\n\nI’m organizing a group video to celebrate ${recipientName}'s ${milestone}.  If you’re up for it, please record a short message and share it with me.\n\nThank you.`,
      slack: `Putting together a celebration video for ${recipientName}'s ${milestone}.  If you can share a short message, that would be awesome.`,
    };
  }
}
