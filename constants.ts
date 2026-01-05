// 基礎匯率設定
// 規則: 總金額 >= 5500 JPY 匯率 0.23, 未滿 0.24
export const calculateTwd = (jpyAmount: number): number => {
  const rate = jpyAmount >= 5500 ? 0.23 : 0.24;
  return Math.ceil(jpyAmount * rate);
};

// 成本匯率 (計算淨賺用)
export const COST_EXCHANGE_RATE = 0.205;

// 保留此常數僅作為參考或 fallback，實際計算應使用 calculateTwd
export const HIDDEN_EXCHANGE_RATE = 0.24;

export const APP_NAME = "Rento 代購團";

export const STATUS_LABELS: Record<string, string> = {
  pending: "等待報價/付款",
  purchased: "已購買",
  shipped: "日本國內運送中",
  arrived: "已抵達倉庫",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  purchased: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  arrived: "bg-green-100 text-green-800",
};