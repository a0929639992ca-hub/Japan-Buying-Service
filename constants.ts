// 基礎匯率設定：根據需求預設為 0.25
export const calculateTwd = (jpyAmount: number): number => {
  const rate = 0.25;
  return Math.ceil(jpyAmount * rate);
};

// 成本匯率 (計算淨賺用)
export const COST_EXCHANGE_RATE = 0.205;

export const APP_NAME = "Rento 代購團";

export const STATUS_LABELS: Record<string, string> = {
  pending: "待處理",
  purchased: "已購入",
  shipped: "運送中",
  arrived: "已到貨",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  purchased: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  arrived: "bg-emerald-100 text-emerald-700",
};