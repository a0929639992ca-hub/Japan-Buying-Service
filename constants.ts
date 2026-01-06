// 基礎匯率設定
// 規則：日幣總額 >= 5500 匯率 0.23 (優惠), 否則 0.24 (基本)
export const calculateTwd = (jpyAmount: number): number => {
  const rate = jpyAmount >= 5500 ? 0.23 : 0.24;
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

export const CATEGORIES = [
  { name: 'UNIQLO', logo: 'https://www.google.com/s2/favicons?sz=128&domain=www.uniqlo.com', initial: 'U', color: '#ff0000' },
  { name: 'GU', logo: 'https://www.google.com/s2/favicons?sz=128&domain=www.gu-global.com', initial: 'G', color: '#0026a3' },
  { name: 'MUJI', logo: 'https://www.google.com/s2/favicons?sz=128&domain=www.muji.com', initial: 'M', color: '#7f0019' },
  { name: 'Donki', logo: 'https://www.google.com/s2/favicons?sz=128&domain=www.donki.com', initial: 'D', color: '#f7d100' },
  { name: '3Coins', logo: 'https://www.google.com/s2/favicons?sz=128&domain=www.3coins.jp', initial: '3', color: '#3bb99c' },
  { name: 'Bic Camera', logo: 'https://www.google.com/s2/favicons?sz=128&domain=www.biccamera.com', initial: 'B', color: '#e60012' },
  { name: '藥妝店', logo: 'https://www.google.com/s2/favicons?sz=128&domain=www.matsukiyococokara-online.com', initial: '藥', color: '#fbe400' },
  { name: '便利商店', logo: 'https://www.google.com/s2/favicons?sz=128&domain=www.lawson.co.jp', initial: 'L', color: '#0066b1' },
];