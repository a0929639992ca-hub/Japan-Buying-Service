export interface OrderItem {
  id: string;
  buyerName: string;
  productName: string;
  imageUrl?: string; // Base64 encoded image data
  shopInfo?: string; // Where to buy (optional)
  originalPriceJpy: number; // 報價給客人的含稅價
  costPriceJpy?: number; // (New) Admin看：免稅入貨價/成本價
  customExchangeRate?: number; // (New) Admin看：自訂匯率
  requestedQuantity: number;
  purchasedQuantity: number;
  calculatedPrice: number; // Based on requested quantity and rate
  status: 'pending' | 'purchased' | 'shipped' | 'arrived';
  isPaid: boolean;
  notes?: string;
  spec?: { // (New) 針對服飾的詳細規格
    code?: string;
    size?: string;
    color?: string;
    gender?: string;
  };
  createdAt: number;
}

export enum OrderStatus {
  PENDING = 'pending',
  PURCHASED = 'purchased',
  SHIPPED = 'shipped',
  ARRIVED = 'arrived'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ExchangeRateConfig {
  hiddenRate: number;
}