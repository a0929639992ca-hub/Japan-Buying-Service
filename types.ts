export interface OrderItem {
  id: string;
  buyerName: string;
  productName: string;
  imageUrl?: string; // Base64 encoded image data
  originalPriceJpy: number;
  requestedQuantity: number;
  purchasedQuantity: number;
  calculatedPrice: number; // Based on requested quantity
  status: 'pending' | 'purchased' | 'shipped' | 'arrived';
  isPaid: boolean;
  notes?: string;
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