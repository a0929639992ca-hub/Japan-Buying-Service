// 預設匯率設定 - 不會在 UI 上直接顯示
export const HIDDEN_EXCHANGE_RATE = 0.25;

export const APP_NAME = "SakuraProxy";

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