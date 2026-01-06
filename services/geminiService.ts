
import { GoogleGenAI, Type } from "@google/genai";
import { calculateTwd } from "../constants.ts";

const MODEL_NAME = 'gemini-3-flash-preview';

// 懶載入實例，避免在模組載入時因 API Key 空值或 process 未定義而崩潰
let aiInstance: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!aiInstance) {
    // FIX: Always use a named parameter when initializing GoogleGenAI
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

/**
 * AI 智慧解析：從一段雜亂的文字（如 Line 對話）中提取訂單資訊
 */
export const parseOrderFromText = async (text: string): Promise<any | null> => {
  try {
    const ai = getAI();
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
      6. 請計算台幣價格(TWD)，規則: 日幣總額 >= 5500 匯率 0.23, 否則 0.24。`,
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

    // FIX: Ensure correct extraction of text from GenerateContentResponse using the .text property
    const responseText = response.text?.trim();
    if (!responseText) return null;
    const result = JSON.parse(responseText);
    
    // 雖然 AI 會計算，但為了保證匯率邏輯 (滿 5500 變 0.23) 絕對準確，我們在這邊強制重新計算一次
    const finalJpy = result.originalPriceJpy || 0;
    const finalQty = result.requestedQuantity || 1;
    const finalTwd = calculateTwd(finalJpy * finalQty);

    return {
      ...result,
      calculatedPrice: finalTwd,
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
  history: { role: string; text: string }[],
  base64Image?: string
): Promise<string> => {
  try {
    const ai = getAI();
    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: `你是一位專業的日本代購助理 Rento AI。
        你的主要任務是：
        1. 翻譯商品日文說明為繁體中文。
        2. 檢查商品是否符合空運規範 (如：是否含鋰電池、高壓噴霧、酒精 > 24%、生鮮食品等)。
        3. 如果使用者詢問價格，請根據你的知識庫提供「預估」日幣價格，並強調是估算。
        4. 如果使用者上傳圖片，請根據圖片內容回答使用者的問題。
        
        回答請簡潔有力，適合手機閱讀。`,
      },
      // Ensure history is correctly mapped for the chat interface
      history: history.map(h => ({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.text }] })) as any,
    });

    let messageContent: any = prompt;

    if (base64Image) {
      // 移除可能的 header (如 data:image/jpeg;base64,)
      const cleanBase64 = base64Image.split(',')[1] || base64Image;
      messageContent = [
        { text: prompt },
        { 
          inlineData: { 
            mimeType: "image/jpeg", 
            data: cleanBase64
          } 
        }
      ];
    }

    // FIX: chat.sendMessage only accepts the message parameter, property .text is used to extract result
    const result = await chat.sendMessage({ message: messageContent });
    return result.text || "抱歉，我暫時無法回答。";
  } catch (error) {
    console.error(error);
    return "連線不穩定或 API Key 未設定。";
  }
};

export interface AnalyzedProductData {
  suggestedName: string;
  estimatedPriceJpy: number;
  warnings: string;
  category: string;
}

export const analyzeProduct = async (name: string, base64Image?: string): Promise<AnalyzedProductData | null> => {
   try {
    const ai = getAI();
    const parts: any[] = [{ text: `你是一個專業代購。請根據圖片或名稱，辨識這項日本商品。
    
    請回傳 JSON 格式：
    1. suggestedName: 完整的商品繁體中文名稱 (包含品牌、型號)。
    2. estimatedPriceJpy: 根據你的知識庫，預估此商品的日幣售價 (整數)。如果不確定，請根據同類商品估算。
    3. warnings: 檢查是否有空運限制 (如: 液體、電池、易碎、體積過大)，若無請填空字串。
    4. category: 商品類別 (如: 電器、藥妝、服飾)。
    
    商品名稱/關鍵字: ${name || "未提供，請依圖片判斷"}` }];
    
    if (base64Image) {
      parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] || base64Image } });
    }
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedName: { type: Type.STRING },
            estimatedPriceJpy: { type: Type.NUMBER },
            warnings: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["suggestedName", "estimatedPriceJpy", "warnings", "category"]
        }
      }
    });
    // FIX: Extract text property from GenerateContentResponse correctly and handle trimming
    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as AnalyzedProductData;
  } catch (error) {
    console.error(error);
    return null;
  }
}
