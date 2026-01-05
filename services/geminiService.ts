
import { GoogleGenAI } from "@google/genai";

// Use process.env.API_KEY directly for initialization as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_TEXT = 'gemini-3-flash-preview';

export const generateAssistantResponse = async (
  prompt: string, 
  history: { role: string; text: string }[]
): Promise<string> => {
  try {
    const formattedHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }],
    }));

    const chat = ai.chats.create({
      model: MODEL_TEXT,
      config: {
        systemInstruction: `
          你是一位專業的日本代購小幫手，名叫 "Sakura AI"。
          你的職責是：
          1. 協助使用者翻譯日文商品說明成繁體中文。
          2. 幫忙確認商品是否為國際禁運品（例如：香水、含電池產品、易燃物、生鮮食品等）。
          3. 如果使用者詢問價格計算方式，請委婉告知「系統會自動計算台幣報價」，不要透露具體的 0.25 匯率數字。
          4. 語氣親切、專業、有禮貌。
          5. 回答請簡短有力，重點清晰。
        `,
      },
      // Passing history to initialize the chat context
      history: formattedHistory as any,
    });

    const result = await chat.sendMessage({ message: prompt });
    // Use the .text property to access generated content
    return result.text || "抱歉，我目前無法回答這個問題。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "連線發生錯誤，請稍後再試。";
  }
};

export const analyzeProduct = async (name: string, base64Image?: string): Promise<string> => {
   try {
    const parts: any[] = [
      { text: `使用者想購買商品: ${name || "未提供名稱"}` }
    ];

    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          // Extract base64 data from the data URL
          data: base64Image.split(',')[1] || base64Image,
        }
      });
      parts.push({ text: "請看這張圖片，分析這個商品類型，並告知使用者：1. 這是什麼商品？(翻譯) 2. 是否有潛在運送風險？ 3. 購買建議。" });
    } else {
      parts.push({ text: "請根據名稱分析這個商品類型，並告知使用者：1. 這是什麼商品？ 2. 是否有潛在運送風險？ 3. 購買建議。" });
    }
    
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: { parts },
    });
    // Use the .text property to access generated content
    return response.text || "無法分析此商品。";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "分析時發生錯誤。";
  }
}
