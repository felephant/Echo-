import { GoogleGenAI, Type } from "@google/genai";
import { OverviewSectionConfig } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_TEXT = 'gemini-3-flash-preview';

export const generateDailySummary = async (entries: string[], config?: OverviewSectionConfig[], language: string = 'English') => {
  if (!apiKey) return null;
  
  const entriesText = entries.join('\n---\n');
  
  // Construct a prompt based on the config
  let summaryInstruction = "Provide a concise summary of the day's events and thoughts, ending with an encouraging sentence.";
  let moodInstruction = "The overall mood of the day.";
  let statsInstruction = "Calculate basic stats (count of entries, tasks completed if any).";
  let happinessInstruction = "List 1-3 things that felt happy or positive based on the input.";

  if (config) {
      const summaryCfg = config.find(c => c.id === 'summary');
      if (summaryCfg?.prompt) summaryInstruction = summaryCfg.prompt;

      const moodCfg = config.find(c => c.id === 'mood');
      if (moodCfg?.prompt) moodInstruction = moodCfg.prompt;

      const statsCfg = config.find(c => c.id === 'stats');
      if (statsCfg?.prompt) statsInstruction = statsCfg.prompt;

      const happinessCfg = config.find(c => c.id === 'happiness');
      if (happinessCfg?.prompt) happinessInstruction = happinessCfg.prompt;
  }

  const prompt = `Analyze the following journal entries for the day and provide a structured summary in ${language}.
  
  Entries:
  ${entriesText}

  Instructions:
  - Text Summary: ${summaryInstruction}
  - Mood: ${moodInstruction} (Include a label, a short suggestion, and a trend hint)
  - Stats: ${statsInstruction} (Include count, tasks completed, and a list of specific details/accomplishments)
  - Happiness: ${happinessInstruction}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Summary text" },
            mood: { 
                type: Type.OBJECT, 
                properties: {
                    label: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                    trend: { type: Type.STRING }
                },
                required: ["label", "suggestion", "trend"]
            },
            keywords: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Keywords"
            },
            stats: {
                type: Type.OBJECT,
                properties: {
                    count: { type: Type.NUMBER },
                    tasksCompleted: { type: Type.NUMBER },
                    details: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["count", "tasksCompleted", "details"]
            },
            happiness: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of happy moments"
            }
          },
          required: ["text", "mood", "keywords", "stats", "happiness"]
        }
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error generating summary:", error);
    return null;
  }
};

export const generateEntryReply = async (entryContent: string, language: string = 'English') => {
  if (!apiKey) return "AI services are unavailable (missing API key).";

  const prompt = `You are a thoughtful, empathetic personal journaling assistant. 
  The user has just written the following entry. Provide a brief, supportive, or insightful comment 
  that encourages deeper reflection or simply acknowledges their experience. Keep it conversational.
  Please reply in ${language}.
  
  User Entry: "${entryContent}"`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error("Error generating reply:", error);
    return "I'm having trouble connecting to my thought process right now.";
  }
};

export const findAssociations = async (entryContent: string, language: string = 'English'): Promise<any[]> => {
  if (!apiKey) return [];

  const prompt = `Based on the user's journal entry below, generate 4-6 fictional but realistic "past journal entries" or "Vault (knowledge base) articles" 
  that would be semantically relevant to recall. 
  Content should be in ${language}.
  
  IMPORTANT: Assign a 'keyword' to items to group them (e.g., 'Productivity', 'Meditation').
  
  User Entry: "${entryContent}"
  
  Return a JSON array of items.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              snippet: { type: Type.STRING, description: "A short preview of the content" },
              fullContent: { type: Type.STRING, description: "The full content of the entry (simulated)" },
              date: { type: Type.STRING, description: "YYYY-MM-DD" },
              type: { type: Type.STRING, enum: ["journal", "vault"] },
              keyword: { type: Type.STRING, description: "The shared topic/keyword for grouping" }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Error finding associations:", error);
    return [];
  }
};
