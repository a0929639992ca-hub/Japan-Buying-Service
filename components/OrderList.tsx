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
      <div className="flex flex-col items-center justify-center py-40 bg-white rounded-5xl border-2 border-dashed border-slate-100 animate-slide-up">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
          <ShoppingBasket className="text-slate-200" size={48} />
        </div>
        <h3 className="text-slate-400 text-xl font-black">目前的資料庫是空的</h3>
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

  const togglePurchased = (order: OrderItem) => {
    const isCurrentlyPurchased = order.status === OrderStatus.PURCHASED;
    const newStatus = isCurrentlyPurchased ? OrderStatus.PENDING : OrderStatus.PURCHASED;
    const newPurchasedQty = isCurrentlyPurchased ? 0 : order.requestedQuantity;
    onUpdateOrder(order.id, { 
      status: newStatus, 
      purchasedQuantity: newPurchasedQty,
      calculatedPrice: calculateTwd(order.originalPriceJpy * (isCurrentlyPurchased ? order.requestedQuantity : newPurchasedQty))
    });
  };

  const adjustPurchasedQty = (order: OrderItem, delta: number) => {
    const newQty = Math.max(0, Math.min(order.requestedQuantity, order.purchasedQuantity + delta));
    onUpdateOrder(order.id, { 
      purchasedQuantity: newQty,
      status: newQty > 0 ? OrderStatus.PURCHASED : OrderStatus.PENDING,
      calculatedPrice: calculateTwd(order.originalPriceJpy * (newQty > 0 ? newQty : order.requestedQuantity))
    });
  };

  const copySummary = (name: string, items: OrderItem[]) => {
    const total = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
    const text = `🌸 Rento 代購團 - ${name}\n` +
      `--------------------------\n` +
      items.map(i => `• ${i.productName} (x${getEffectiveQty(i)}): NT$ ${i.calculatedPrice.toLocaleString()}`).join('\n') +
      `\n--------------------------\n總計: NT$ ${total.toLocaleString()}`;
    navigator.clipboard.writeText(text);
    alert('對帳明細已複製');
  };

  return (
    <div className="space-y-6">
       <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 -mx-6 px-6 no-scrollbar items-start">
          {buyerNames.map((buyerName) => {
            const items = groupedOrders[buyerName];
            const buyerTotalTwd = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
            return (
              <div key={buyerName} className="snap-center shrink-0 w-[90vw] sm:w-[32rem] flex flex-col gap-6">
                <div className="bg-white rounded-5xl p-2 premium-shadow border border-white flex flex-col gap-2">
                    <div className="bg-slate-900 rounded-4xl p-6 flex justify-between items-center">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-white/10 text-amber-400 rounded-2xl flex items-center justify-center shadow-inner">
                                <Contact size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white leading-none">{buyerName}</h2>
                                <span className="text-[11px] font-black text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-xl mt-3 inline-block uppercase tracking-wider">Total NT$ {buyerTotalTwd.toLocaleString()}</span>
                            </div>
                        </div>
                        <button onClick={() => copySummary(buyerName, items)} className="p-4 bg-white/10 rounded-2xl text-white/40 hover:text-white active-scale transition-colors"><Share2 size={20} /></button>
                    </div>

                    <div className="flex flex-col gap-4 px-2 max-h-[65vh] overflow-y-auto no-scrollbar pb-3 mt-2">
                        {items.map((order) => (
                            <div key={order.id} className="bg-white rounded-4xl border border-slate-100 p-5 shadow-sm flex flex-col gap-5 relative group transition-all hover:border-indigo-100">
                                <div className="flex gap-5">
                                    <div className="w-20 h-20 shrink-0 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden relative shadow-inner">
                                        {order.imageUrl ? <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover" /> : <Package size={28} className="m-auto h-full text-slate-200" />}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div className="flex justify-between items-start gap-2">
                                            <h3 className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-tight flex-1">{order.productName}</h3>
                                            <span className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                                        </div>
                                        <div className="flex items-end justify-between mt-3">
                                            <div className="space-y-1">
                                                <div className="text-[10px] text-slate-400 font-black tracking-tight uppercase">JPY {order.originalPriceJpy.toLocaleString()}</div>
                                                <div className="text-xl font-black text-indigo-600">NT$ {order.calculatedPrice.toLocaleString()}</div>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                {order.shopInfo && <div className="flex items-center gap-1 mb-2 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg"><MapPin size={10} /> {order.shopInfo}</div>}
                                                <div className="text-[11px] text-slate-900 font-black">Qty: x{getEffectiveQty(order)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-50">
                                     <div className="col-span-2 flex items-center bg-slate-50 rounded-2xl p-1 shadow-inner border border-slate-100">
                                         <button onClick={() => adjustPurchasedQty(order, -1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 bg-white/0 hover:bg-white rounded-xl transition-all active-scale"><Minus size={16}/></button>
                                         <div className="flex-1 text-center text-sm font-black text-slate-800">{order.purchasedQuantity}</div>
                                         <button onClick={() => adjustPurchasedQty(order, 1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 bg-white/0 hover:bg-white rounded-xl transition-all active-scale"><Plus size={16}/></button>
                                     </div>
                                     <button onClick={() => togglePurchased(order)} className={`rounded-2xl flex items-center justify-center transition-all active-scale ${order.status === OrderStatus.PURCHASED ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}><ShoppingCart size={18} /></button>
                                     <button onClick={() => onRemoveOrder(order.id)} className="rounded-2xl flex items-center justify-center bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active-scale"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            );
          })}
       </div>
    </div>
  );
};

export default OrderList;