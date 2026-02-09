
import { Type } from "@google/genai";
import { ai } from "../lib/ai";

/**
 * MemoryLoom Intelligence Service
 */

export async function analyzeSubmissions(projectName: string, milestone: string, submissions: { name: string, message: string }[]) {
  const prompt = `Act as a master documentary film editor. Analyze these tribute video submissions for "${projectName}" (a ${milestone} celebration). 
  1. Identify the core emotional tone.
  2. Map out a 3-act narrative storyboard.
  3. Assign an "Emotional Beat" to each segment (e.g., "The Inside Joke", "The Tearjerker", "The Legacy").
  4. Suggest a closing quote based on the shared sentiment.
  
  Submissions:
  ${submissions.map(s => `${s.name}: ${s.message}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
                  isClimax: { type: Type.BOOLEAN }
                }
              }
            },
            closingSentiment: { type: Type.STRING }
          },
          required: ["tone", "musicGenre", "themes", "closingSentiment"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return null;
  }
}

export async function generateContributorPrompts(milestone: string, recipient: string) {
  const prompt = `You are an emotionally intelligent host. Suggest 4 unique, highly specific prompts to help people record a video message for ${recipient}'s ${milestone}. 
  Avoid clichés like "Happy Birthday." 
  Focus on:
  - Hidden talents
  - Lessons learned from them
  - A funny "you had to be there" moment
  - A wish for their legacy.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Prompts Error:", error);
    return [
      "What is a small, quiet way they've made your life better?",
      "If you had to pick one 'trademark' habit of theirs, what would it be?",
      "Tell a story about a time they showed up for you when it mattered.",
      "What is one piece of advice they gave you that you actually followed?"
    ];
  }
}

export async function generateNudgeMessage(recipientName: string, milestone: string, deadline: string, tone: string) {
  const prompt = `Write a short, warm, but effective nudge message for someone who hasn't submitted their video for ${recipientName}'s ${milestone} yet.
  The deadline is ${deadline}. 
  The project tone is ${tone}.
  Make it feel like a gentle reminder from a friend, not a corporate alert.
  Provide two options: one that's funny/light and one that's more heartfelt.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return {
      funny: "Just a quick nudge! ${recipientName} is going to love this video, and it wouldn't be complete without you. You've got until ${deadline}!",
      heartfelt: "Hi! We're almost done weaving together ${recipientName}'s tribute. It would mean so much to have your voice in there. Any chance you could record a quick clip by ${deadline}?"
    };
  }
}

export async function generateInviteCopy(recipientName: string, milestone: string) {
  const prompt = `Write a short, warm, and clear invitation message for a group tribute video. 
  Recipient: ${recipientName}
  Occasion: ${milestone}
  Style: Helpful, low-pressure, and exciting. 
  Provide three versions: one for WhatsApp (short), one for Email (detailed), and one for Slack/Teams (professional).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return {
      whatsapp: `Hey! I'm putting together a surprise video for ${recipientName}'s ${milestone}. Would love for you to add a quick 30-sec clip!`,
      email: `Subject: Help us surprise ${recipientName}!\n\nHi everyone,\n\nI'm creating a group tribute video for ${recipientName}'s ${milestone}. It would mean the world if you could record a short message.`,
      slack: `Hi Team! Let's celebrate ${recipientName}'s ${milestone} with a surprise group video. Please record a message by clicking the link!`
    };
  }
}
