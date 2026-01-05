import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, remove, serverTimestamp } from 'firebase/database';
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

// 初始化連線 (支援從 LocalStorage 或 URL 參數載入設定)
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
  await set(newOrderRef, {
    ...order,
    _cloudTimestamp: serverTimestamp()
  });
  return true;
};

// 系統：從雲端收件匣移除訂單 (接收或拒絕後使用)
export const removeOrderFromInbox = async (storeId: string, orderId: string) => {
  if (!db) return;
  // 確保路徑正確，直接刪除該 ID 的節點
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
        const order = { ...data[key], id: key }; // 使用 Firebase Key 作為 ID
        callback(order);
      });
    }
  });

  return unsubscribe;
};

// 輔助：將設定檔編碼到 URL (給買家連結用)
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