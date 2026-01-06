import React from 'react';
import { OrderItem, OrderStatus } from '../types.ts';
import { STATUS_LABELS, STATUS_COLORS, calculateTwd, COST_EXCHANGE_RATE } from '../constants.ts';
import { 
  ShoppingBasket, Trash2, Contact, 
  CreditCard, ShoppingCart, Minus, Plus, 
  Share2, Check, Edit3, Banknote, Package, Calculator, ArrowRight, LayoutList, MapPin
} from 'lucide-react';

interface OrderListProps {
  orders: OrderItem[];
  onRemoveOrder: (id: string) => void;
  onUpdateOrder: (id: string, updates: Partial<OrderItem>) => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onRemoveOrder, onUpdateOrder }) => {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 animate-fade-in">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBasket className="text-slate-200" size={36} />
        </div>
        <h3 className="text-slate-400 text-lg font-black">清單目前空空如也</h3>
      </div>
    );
  }

  const groupedOrders = orders.reduce((groups, order) => {
    const name = order.buyerName || '未知買家';
    if (!groups[name]) groups[name] = [];
    groups[name].push(order);
    return groups;
  }, {} as Record<string, OrderItem[]>);

  const buyerNames = Object.keys(groupedOrders);
  const getEffectiveQty = (order: OrderItem) => order.status === OrderStatus.PENDING ? order.requestedQuantity : order.purchasedQuantity;
  const calculateTwdPrice = (jpyPrice: number, qty: number) => calculateTwd(jpyPrice * qty);

  const togglePurchased = (order: OrderItem) => {
    const isCurrentlyPurchased = order.status === OrderStatus.PURCHASED;
    const newStatus = isCurrentlyPurchased ? OrderStatus.PENDING : OrderStatus.PURCHASED;
    const newPurchasedQty = isCurrentlyPurchased ? 0 : order.requestedQuantity;
    onUpdateOrder(order.id, { 
      status: newStatus, 
      purchasedQuantity: newPurchasedQty,
      calculatedPrice: calculateTwdPrice(order.originalPriceJpy, isCurrentlyPurchased ? order.requestedQuantity : newPurchasedQty)
    });
  };

  const adjustPurchasedQty = (order: OrderItem, delta: number) => {
    const newQty = Math.max(0, Math.min(order.requestedQuantity, order.purchasedQuantity + delta));
    onUpdateOrder(order.id, { 
      purchasedQuantity: newQty,
      status: newQty > 0 ? OrderStatus.PURCHASED : OrderStatus.PENDING,
      calculatedPrice: calculateTwdPrice(order.originalPriceJpy, newQty > 0 ? newQty : order.requestedQuantity)
    });
  };

  const copySummary = (name: string, items: OrderItem[]) => {
    const total = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
    const text = `🌸 Rento 代購團 - ${name}\n` +
      `--------------------------\n` +
      items.map(i => `• ${i.productName} (x${getEffectiveQty(i)}): NT$ ${i.calculatedPrice.toLocaleString()}`).join('\n') +
      `\n--------------------------\n總計: NT$ ${total.toLocaleString()}`;
    navigator.clipboard.writeText(text);
    alert('已複製對帳明細');
  };

  return (
    <div className="space-y-4">
       <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-5 px-5 scroll-smooth no-scrollbar items-start">
          {buyerNames.map((buyerName) => {
            const items = groupedOrders[buyerName];
            const buyerTotalTwd = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
            return (
              <div key={buyerName} className="snap-center shrink-0 w-[92vw] sm:w-[28rem] flex flex-col gap-4">
                <div className="bg-white rounded-[2.5rem] p-2 shadow-xl border border-white flex flex-col gap-2">
                    <div className="bg-slate-50 rounded-[2rem] p-5 border border-slate-100 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center">
                                <Contact size={28} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 leading-none">{buyerName}</h2>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg mt-2 inline-block">Total: NT$ {buyerTotalTwd.toLocaleString()}</span>
                            </div>
                        </div>
                        <button onClick={() => copySummary(buyerName, items)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm"><Share2 size={18} /></button>
                    </div>

                    <div className="flex flex-col gap-3 px-1 max-h-[60vh] overflow-y-auto no-scrollbar pb-2">
                        {items.map((order) => (
                            <div key={order.id} className="bg-white rounded-[2rem] border border-slate-100 p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 shrink-0 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative">
                                        {order.imageUrl ? <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover" /> : <Package size={20} className="m-auto h-full text-slate-200" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight">{order.productName}</h3>
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                                        </div>
                                        {order.shopInfo && (
                                          <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-amber-600">
                                            <MapPin size={10} /> <span>{order.shopInfo}</span>
                                          </div>
                                        )}
                                        <div className="mt-2 flex items-end justify-between">
                                            <div className="text-[10px] text-slate-400 font-bold">¥{order.originalPriceJpy.toLocaleString()}</div>
                                            <div className="text-right">
                                                 <div className="text-[9px] text-slate-400 font-bold mb-0.5">Qty: x{getEffectiveQty(order)}</div>
                                                 <div className="text-sm font-black text-indigo-600">NT$ {order.calculatedPrice.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-50">
                                     <div className="col-span-2 flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100">
                                         <button onClick={() => adjustPurchasedQty(order, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-white rounded-lg"><Minus size={12}/></button>
                                         <div className="flex-1 text-center text-xs font-black text-slate-700">{order.purchasedQuantity}</div>
                                         <button onClick={() => adjustPurchasedQty(order, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-white rounded-lg"><Plus size={12}/></button>
                                     </div>
                                     <button onClick={() => togglePurchased(order)} className={`rounded-xl flex items-center justify-center ${order.status === OrderStatus.PURCHASED ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-400'}`}><ShoppingCart size={14} /></button>
                                     <button onClick={() => onRemoveOrder(order.id)} className="rounded-xl flex items-center justify-center bg-white border border-slate-100 text-slate-300"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            );
          })}
       </div>
       <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default OrderList;