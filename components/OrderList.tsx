import React from 'react';
import { OrderItem, OrderStatus } from '../types.ts';
import { STATUS_LABELS, STATUS_COLORS } from '../constants.ts';
import { 
  Package, Clock, Trash2, User, ImageIcon, CheckCircle, 
  CreditCard, ShoppingCart, Minus, Plus, AlertCircle, 
  Share2, Check 
} from 'lucide-react';

interface OrderListProps {
  orders: OrderItem[];
  onRemoveOrder: (id: string) => void;
  onUpdateOrder: (id: string, updates: Partial<OrderItem>) => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onRemoveOrder, onUpdateOrder }) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-[2rem] border border-dashed border-gray-200">
        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Package className="text-gray-200" size={40} />
        </div>
        <h3 className="text-lg font-bold text-gray-800">暫無代購清單</h3>
        <p className="text-gray-400 text-sm mt-1">開始新增你的第一筆代購委託吧！</p>
      </div>
    );
  }

  const groupedOrders = orders.reduce((groups, order) => {
    const name = order.buyerName || '未知買家';
    if (!groups[name]) groups[name] = [];
    groups[name].push(order);
    return groups;
  }, {} as Record<string, OrderItem[]>);

  const togglePurchased = (order: OrderItem) => {
    if (order.status === OrderStatus.PURCHASED) {
      onUpdateOrder(order.id, { status: OrderStatus.PENDING, purchasedQuantity: 0 });
    } else {
      onUpdateOrder(order.id, { status: OrderStatus.PURCHASED, purchasedQuantity: order.requestedQuantity });
    }
  };

  const adjustPurchasedQty = (order: OrderItem, delta: number) => {
    const newQty = Math.max(0, Math.min(order.requestedQuantity, order.purchasedQuantity + delta));
    onUpdateOrder(order.id, { 
      purchasedQuantity: newQty,
      status: newQty === order.requestedQuantity ? OrderStatus.PURCHASED : (newQty > 0 ? OrderStatus.PURCHASED : OrderStatus.PENDING)
    });
  };

  const copySummary = (name: string, items: OrderItem[]) => {
    const total = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
    const text = `🌸 SakuraProxy 代購清單 - ${name}\n` +
      `--------------------------\n` +
      items.map(i => `• ${i.productName} (x${i.requestedQuantity}): NT$ ${i.calculatedPrice}`).join('\n') +
      `\n--------------------------\n總計: NT$ ${total.toLocaleString()}`;
    
    navigator.clipboard.writeText(text);
    alert('明細已複製到剪貼簿！');
  };

  return (
    <div className="space-y-16">
      {(Object.entries(groupedOrders) as [string, OrderItem[]][]).map(([buyerName, items]) => {
        const buyerTotalTwd = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
        const buyerPaidTwd = items.filter(i => i.isPaid).reduce((sum, i) => sum + i.calculatedPrice, 0);
        const buyerUnpaidTwd = buyerTotalTwd - buyerPaidTwd;

        return (
          <div key={buyerName} className="space-y-6 animate-slide-in">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <User size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{buyerName}</h2>
                  <p className="text-xs text-gray-400 font-bold tracking-tight">{items.length} 件委託商品</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">應收總額 / 未收</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-gray-900">NT$ {buyerTotalTwd.toLocaleString()}</span>
                    {buyerUnpaidTwd > 0 && (
                      <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                        還差 {buyerUnpaidTwd.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => copySummary(buyerName, items)}
                  className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl transition-all border border-gray-100 flex items-center gap-2 text-sm font-bold"
                >
                  <Share2 size={16} />
                  分享明細
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {items.map((order) => (
                <div key={order.id} className="bg-white rounded-[2rem] border border-gray-100 hover:border-primary/20 hover:shadow-xl hover:shadow-gray-200/50 transition-all group overflow-hidden flex flex-col">
                  <div className="p-6 flex gap-5 flex-1">
                    <div className="w-24 h-24 shrink-0 rounded-2xl bg-gray-50 border border-gray-50 overflow-hidden flex items-center justify-center relative">
                      {order.imageUrl ? (
                        <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={28} className="text-gray-200" />
                      )}
                      {order.isPaid && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white p-1 rounded-bl-xl shadow-sm">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug truncate group-hover:text-primary transition-colors">
                        {order.productName}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={12} /> {new Date(order.createdAt).toLocaleDateString()}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold tracking-tight">日幣單價</p>
                          <p className="text-sm font-bold text-gray-700">¥ {order.originalPriceJpy.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 font-bold tracking-tight">預估台幣</p>
                          <p className="text-base font-black text-gray-900">NT$ {order.calculatedPrice.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-2">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${(order.purchasedQuantity / order.requestedQuantity) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 mb-4">
                      <span className="text-[10px] font-bold text-gray-400 tracking-wider">採購進度</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-700">{order.purchasedQuantity} / {order.requestedQuantity}</span>
                        <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                          <button onClick={() => adjustPurchasedQty(order, -1)} className="p-1 hover:text-primary"><Minus size={12} /></button>
                          <button onClick={() => adjustPurchasedQty(order, 1)} className="p-1 hover:text-primary"><Plus size={12} /></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => togglePurchased(order)}
                        className={`p-2 rounded-xl transition-all ${order.status === OrderStatus.PURCHASED ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-gray-400 border border-gray-100'}`}
                      >
                        <ShoppingCart size={16} />
                      </button>
                      <button 
                        onClick={() => onUpdateOrder(order.id, { isPaid: !order.isPaid })}
                        className={`p-2 rounded-xl transition-all ${order.isPaid ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white text-gray-400 border border-gray-100'}`}
                      >
                        <CreditCard size={16} />
                      </button>
                    </div>
                    <button onClick={() => onRemoveOrder(order.id)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderList;