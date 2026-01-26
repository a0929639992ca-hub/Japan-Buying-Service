import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, remove, serverTimestamp, update, onChildAdded, onChildChanged, onChildRemoved } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { OrderItem } from '../types.ts';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let app: any = null;
let db: any = null;
let auth: any = null;

const sanitizeForFirebase = (obj: any): any => {
  const clean = { ...obj };
  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined) {
      delete clean[key];
    } else if (typeof clean[key] === 'object' && clean[key] !== null && !Array.isArray(clean[key])) {
      clean[key] = sanitizeForFirebase(clean[key]);
    }
  });
  return clean;
};

export const initCloud = (config: FirebaseConfig) => {
  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getDatabase(app);
    auth = getAuth(app);
    return true;
  } catch (e) {
    console.error("Firebase Init Failed:", e);
    return false;
  }
};

// --- Auth 功能 ---
export const loginGoogle = async () => {
  if (!auth) {
    alert("Firebase Auth 尚未初始化，請檢查網路連線或 Config");
    throw new Error("Auth not initialized");
  }
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.error("Login failed", error);
    // 針對常見錯誤給予中文提示
    let msg = error.message;
    if (error.code === 'auth/unauthorized-domain') {
      msg = "網域未授權：請至 Firebase Console > Authentication > Settings > Authorized Domains 新增您的 Vercel網域。";
    } else if (error.code === 'auth/operation-not-allowed') {
      msg = "登入方式未啟用：請至 Firebase Console > Authentication > Sign-in method 啟用 Google 登入。";
    } else if (error.code === 'auth/popup-closed-by-user') {
      msg = "登入視窗已關閉";
    } else if (error.code === 'auth/cancelled-popup-request') {
      msg = "重複請求：偵測到多重登入視窗，請勿重複點擊。";
    }
    alert(`登入失敗：\n${msg}`);
    throw error;
  }
};

export const logoutGoogle = async () => {
  if (!auth) return;
  await signOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

// --- 收件匣功能 (臨時) ---
export const sendOrderToCloud = async (storeId: string, order: OrderItem) => {
  if (!db) throw new Error("Cloud not connected");
  const ordersRef = ref(db, `stores/${storeId}/inbox`);
  const newOrderRef = push(ordersRef);
  const sanitizedOrder = sanitizeForFirebase(order);
  await set(newOrderRef, { ...sanitizedOrder, _cloudTimestamp: serverTimestamp() });
  return true;
};

export const removeOrderFromInbox = async (storeId: string, orderId: string) => {
  if (!db) return;
  const orderRef = ref(db, `stores/${storeId}/inbox/${orderId}`);
  await remove(orderRef);
};

export const subscribeToInbox = (storeId: string, callback: (order: OrderItem) => void) => {
  if (!db) return () => {};
  const inboxRef = ref(db, `stores/${storeId}/inbox`);
  return onChildAdded(inboxRef, (snapshot) => {
    const data = snapshot.val();
    if (data) callback({ ...data, id: snapshot.key });
  });
};

// --- 已接收訂單功能 (永久儲存) ---
export const saveOrderToStore = async (storeId: string, order: OrderItem) => {
  if (!db) return;
  const orderRef = ref(db, `stores/${storeId}/orders/${order.id}`);
  const sanitizedOrder = sanitizeForFirebase(order);
  await set(orderRef, sanitizedOrder);
};

export const deleteOrderFromStore = async (storeId: string, orderId: string) => {
  if (!db) return;
  const orderRef = ref(db, `stores/${storeId}/orders/${orderId}`);
  await remove(orderRef);
};

export const subscribeToOrders = (storeId: string, onUpdate: (orders: OrderItem[]) => void) => {
  if (!db) return () => {};
  const ordersRef = ref(db, `stores/${storeId}/orders`);
  return onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      onUpdate([]);
      return;
    }
    const orderList = Object.keys(data).map(key => ({ ...data[key], id: key }));
    // 依據建立時間降序排序
    orderList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    onUpdate(orderList);
  });
};

// --- 設定功能 ---
export const updateStoreConfig = async (storeId: string, config: { isFormActive: boolean, deadline: string }) => {
  if (!db) return;
  const configRef = ref(db, `stores/${storeId}/config`);
  await update(configRef, config);
};

export const subscribeToConfig = (storeId: string, callback: (config: { isFormActive: boolean, deadline: string }) => void) => {
  if (!db) return () => {};
  const configRef = ref(db, `stores/${storeId}/config`);
  return onValue(configRef, (snapshot) => {
    const data = snapshot.val();
    if (data) callback(data);
  });
};

export const encodeConfig = (config: FirebaseConfig, storeId: string): string => btoa(JSON.stringify({ c: config, s: storeId }));
export const decodeConfig = (encoded: string): { config: FirebaseConfig, storeId: string } | null => {
  try {
    const parsed = JSON.parse(atob(encoded));
    return { config: parsed.c, storeId: parsed.s };
  } catch (e) { return null; }
};