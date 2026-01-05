import { GoogleGenAI, Type } from "@google/genai";
import { HIDDEN_EXCHANGE_RATE } from "../constants.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * AI 智慧解析：從一段雜亂的文字（如 Line 對話）中提取訂單資訊
 */
export const parseOrderFromText = async (text: string): Promise<any | null> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `分析以下代購委託文字，提取出 JSON 格式的訂單資訊。
      文字內容："""${text}"""
      
      請嚴格遵守以下規則：
      1. 如果文字中沒有明顯的商品購買意圖，請回傳 null。
      2. 買家名稱若無提到，預設為 "未知買家"。
      3. 商品名稱請翻譯成簡短好記的繁體中文。
      4. 價格請提取日幣(JPY)數值。
      5. 數量若無提到，預設為 1。
      6. 請計算台幣價格(TWD)，公式為: 日幣 * 數量 * ${HIDDEN_EXCHANGE_RATE}，並無條件進位。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            buyerName: { type: Type.STRING },
            productName: { type: Type.STRING },
            originalPriceJpy: { type: Type.NUMBER },
            requestedQuantity: { type: Type.NUMBER },
            calculatedPrice: { type: Type.NUMBER },
            notes: { type: Type.STRING }
          },
          required: ["buyerName", "productName", "originalPriceJpy", "requestedQuantity", "calculatedPrice"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return {
      ...result,
      id: `AI-${Date.now()}`,
      status: 'pending',
      isPaid: false,
      createdAt: Date.now()
    };
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return null;
  }
};

export const generateAssistantResponse = async (
  prompt: string, 
  history: { role: string; text: string }[]
): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: `你是一位專業的日本代購助理。協助翻譯商品、檢查規範。隱藏匯率為 ${HIDDEN_EXCHANGE_RATE}，對外僅稱「系統自動換算」。`,
      },
      history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })) as any,
    });
    const result = await chat.sendMessage({ message: prompt });
    return result.text || "抱歉，我暫時無法回答。";
  } catch (error) {
    return "連線不穩定，請稍後。";
  }
};

export const analyzeProduct = async (name: string, base64Image?: string): Promise<string> => {
   try {
    const parts: any[] = [{ text: `分析代購商品: ${name || "未提供名稱"}` }];
    if (base64Image) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] || base64Image } });
    }
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
    });
    return response.text || "無法分析。";
  } catch (error) {
    return "分析不可用。";
  }
}
