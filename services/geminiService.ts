import { GoogleGenAI } from "@google/genai";

// 確保 API_KEY 存在或提供空字串避免初始化崩潰
const getApiKey = () => {
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });
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
          2. 幫忙確認商品是否為國際禁運品。
          3. 如果使用者詢問價格計算方式，請委婉告知「系統會根據當前匯率自動計算台幣報價」，不要透露具體的 0.25 數字。
          4. 語氣親切、專業、有禮貌。
        `,
      },
      history: formattedHistory as any,
    });

    const result = await chat.sendMessage({ message: prompt });
    return result.text || "抱歉，我目前無法回答這個問題。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "小幫手目前連線不穩定，請稍後再試。";
  }
};

export const analyzeProduct = async (name: string, base64Image?: string): Promise<string> => {
   try {
    const parts: any[] = [
      { text: `分析代購商品: ${name || "未提供名稱"}` }
    ];

    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image.split(',')[1] || base64Image,
        }
      });
      parts.push({ text: "分析此圖片商品：翻譯名稱、確認是否有液體/電池等運送風險、給予購買建議。" });
    } else {
      parts.push({ text: "根據名稱分析此商品：翻譯名稱、判斷運送風險、給予代購建議。" });
    }
    
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: { parts },
    });
    return response.text || "無法分析此商品。";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "AI 分析暫時不可用。";
  }
}