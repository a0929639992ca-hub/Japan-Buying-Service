import React from 'react';
import { OrderItem, OrderStatus } from '../types.ts';
import { STATUS_LABELS, STATUS_COLORS } from '../constants.ts';
import { 
  ShoppingBasket, Clock, Trash2, Contact, ImageIcon, 
  CreditCard, ShoppingCart, Minus, Plus, 
  Share2, Check, Truck, AlertCircle, Edit3
} from 'lucide-react';

interface OrderListProps {
  orders: OrderItem[];
  onRemoveOrder: (id: string) => void;
  onUpdateOrder: (id: string, updates: Partial<OrderItem>) => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onRemoveOrder, onUpdateOrder }) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-100">
        <ShoppingBasket className="text-gray-100 mx-auto mb-3" size={32} />
        <p className="text-gray-400 text-xs font-bold">暫無代購項目</p>
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

  const handleEditPrice = (order: OrderItem) => {
    const newPrice = prompt(`請輸入 ${order.productName} 的日幣單價:`, order.originalPriceJpy.toString());
    if (newPrice !== null) {
        const p = parseFloat(newPrice);
        if (!isNaN(p)) {
            onUpdateOrder(order.id, { 
                originalPriceJpy: p,
                calculatedPrice: Math.ceil(p * order.requestedQuantity * 0.25)
            });
        }
    }
  };

  const copySummary = (name: string, items: OrderItem[]) => {
    const total = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
    const text = `🌸 Rento 代購團 - ${name}\n` +
      `--------------------------\n` +
      items.map(i => `• ${i.productName} (x${i.requestedQuantity}): ${i.originalPriceJpy === 0 ? '待報價' : 'NT$ ' + i.calculatedPrice}`).join('\n') +
      `\n--------------------------\n總計: NT$ ${total.toLocaleString()}`;
    navigator.clipboard.writeText(text);
    alert('明細已複製！');
  };

  return (
    <div className="space-y-10">
      {(Object.entries(groupedOrders) as [string, OrderItem[]][]).map(([buyerName, items]) => {
        const buyerTotalTwd = items.reduce((sum, i) => sum + i.calculatedPrice, 0);

        return (
          <div key={buyerName} className="space-y-3 animate-slide-in">
            <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                  <Contact size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900">{buyerName}</h2>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">{items.length} 件委託</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-black text-gray-900">NT$ {buyerTotalTwd.toLocaleString()}</p>
                </div>
                <button onClick={() => copySummary(buyerName, items)} className="p-2 hover:bg-gray-50 text-gray-400 rounded-lg transition-colors">
                  <Share2 size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 hover:border-primary/20 transition-all flex flex-col relative overflow-hidden">
                  <div className="p-4 flex gap-4">
                    <div className="w-16 h-16 shrink-0 rounded-xl bg-gray-50 border border-gray-50 overflow-hidden relative">
                      {order.imageUrl ? (
                        <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon size={18} className="text-gray-200" /></div>
                      )}
                      {order.isPaid && <div className="absolute top-0 right-0 bg-green-500 text-white p-0.5 rounded-bl-lg"><Check size={8} strokeWidth={4} /></div>}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                           <h3 className="font-bold text-gray-900 text-xs truncate leading-none">{order.productName}</h3>
                           <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${STATUS_COLORS[order.status]}`}>
                             {STATUS_LABELS[order.status].substring(0, 4)}
                           </span>
                        </div>
                        {order.notes && <p className="text-[9px] text-gray-400 mt-1 line-clamp-1 italic">"{order.notes}"</p>}
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="cursor-pointer" onClick={() => handleEditPrice(order)}>
                          <p className="text-[8px] text-gray-400 font-bold flex items-center gap-0.5">日幣 ¥</p>
                          <p className={`text-[10px] font-black ${order.originalPriceJpy === 0 ? 'text-amber-500' : 'text-gray-700'}`}>
                            {order.originalPriceJpy.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-gray-400 font-bold">預估台幣</p>
                          <p className="text-xs font-black text-gray-900">
                            {order.originalPriceJpy === 0 ? '待報價' : `NT$ ${order.calculatedPrice.toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-3">
                    <div className="w-full h-1 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(order.purchasedQuantity / order.requestedQuantity) * 100}%` }} />
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-400">採購 {order.purchasedQuantity}/{order.requestedQuantity}</span>
                        <div className="flex bg-gray-50 rounded-lg p-0.5">
                          <button onClick={() => adjustPurchasedQty(order, -1)} className="p-0.5 hover:text-primary transition-colors"><Minus size={10} /></button>
                          <button onClick={() => adjustPurchasedQty(order, 1)} className="p-0.5 hover:text-primary transition-colors"><Plus size={10} /></button>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => togglePurchased(order)} className={`p-1.5 rounded-lg transition-all ${order.status === OrderStatus.PURCHASED ? 'bg-primary text-white' : 'bg-gray-50 text-gray-300'}`}><ShoppingCart size={12}/></button>
                        <button onClick={() => onUpdateOrder(order.id, { isPaid: !order.isPaid })} className={`p-1.5 rounded-lg transition-all ${order.isPaid ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-300'}`}><CreditCard size={12}/></button>
                        <button onClick={() => onRemoveOrder(order.id)} className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={12}/></button>
                      </div>
                    </div>
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