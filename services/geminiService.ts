import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGameCommentary = async (score: number): Promise<string> => {
  try {
    const prompt = `
      The user just finished playing a Flappy Bird clone game.
      Their score was: ${score}.
      
      Scores reference:
      0-2: Terrible.
      3-10: Average.
      10-20: Good.
      20+: Legend.

      Act as a funny, slightly sarcastic, but encouraging game announcer.
      Write a ONE sentence reaction to their score in Vietnamese (Tiếng Việt).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Không thể kết nối với bình luận viên AI...";
  } catch (error) {
    console.error("Error fetching commentary:", error);
    return "AI đang bận đi ngủ, nhưng bạn chơi tốt lắm (hoặc không)!";
  }
};
