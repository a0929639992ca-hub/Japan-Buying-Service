import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, remove, serverTimestamp, update } from 'firebase/database';
import { OrderItem } from '../types.ts';

// 定義 Firebase 設定介面
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let db: any = null;

// 清理物件中的 undefined 值，Firebase 不接受 undefined
const sanitizeForFirebase = (obj: any): any => {
  const clean = { ...obj };
  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined) {
      delete clean[key]; // 或者設為 null: clean[key] = null;
    } else if (typeof clean[key] === 'object' && clean[key] !== null && !Array.isArray(clean[key])) {
      clean[key] = sanitizeForFirebase(clean[key]);
    }
  });
  return clean;
};

// 初始化連線
export const initCloud = (config: FirebaseConfig) => {
  try {
    if (!getApps().length) {
      const app = initializeApp(config);
      db = getDatabase(app);
    } else {
      const app = getApp();
      db = getDatabase(app);
    }
    return true;
  } catch (e) {
    console.error("Firebase Init Failed:", e);
    return false;
  }
};

// 買家：發送訂單到雲端
export const sendOrderToCloud = async (storeId: string, order: OrderItem) => {
  if (!db) throw new Error("Cloud not connected");
  
  const ordersRef = ref(db, `stores/${storeId}/inbox`);
  const newOrderRef = push(ordersRef);
  
  // 確保資料中沒有 undefined 屬性，避免傳送失敗
  const sanitizedOrder = sanitizeForFirebase(order);
  
  await set(newOrderRef, {
    ...sanitizedOrder,
    _cloudTimestamp: serverTimestamp()
  });
  return true;
};

// 系統：從雲端收件匣移除訂單
export const removeOrderFromInbox = async (storeId: string, orderId: string) => {
  if (!db) return;
  const orderRef = ref(db, `stores/${storeId}/inbox/${orderId}`);
  try {
    await remove(orderRef);
  } catch (e) {
    console.error("Failed to remove order from cloud:", e);
  }
};

// 團長：監聽雲端新訂單
export const subscribeToInbox = (storeId: string, callback: (order: OrderItem) => void) => {
  if (!db) return () => {};

  const inboxRef = ref(db, `stores/${storeId}/inbox`);
  
  const unsubscribe = onValue(inboxRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      Object.keys(data).forEach(key => {
        const order = { ...data[key], id: key }; 
        callback(order);
      });
    }
  });

  return unsubscribe;
};

// 團長：更新表單狀態與截單日
export const updateStoreConfig = async (storeId: string, config: { isFormActive: boolean, deadline: string }) => {
  if (!db) return;
  const configRef = ref(db, `stores/${storeId}/config`);
  await update(configRef, config);
};

// 監聽表單設定
export const subscribeToConfig = (storeId: string, callback: (config: { isFormActive: boolean, deadline: string }) => void) => {
  if (!db) return () => {};
  const configRef = ref(db, `stores/${storeId}/config`);
  return onValue(configRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data);
    }
  });
};

// 輔助：將設定檔編碼到 URL
export const encodeConfig = (config: FirebaseConfig, storeId: string): string => {
  const payload = JSON.stringify({ c: config, s: storeId });
  return btoa(payload);
};

// 輔助：從 URL 解碼設定檔
export const decodeConfig = (encoded: string): { config: FirebaseConfig, storeId: string } | null => {
  try {
    const json = atob(encoded);
    const parsed = JSON.parse(json);
    return { config: parsed.c, storeId: parsed.s };
  } catch (e) {
    return null;
  }
};