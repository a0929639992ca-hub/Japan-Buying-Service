import React from 'react';
import { OrderItem, OrderStatus } from '../types.ts';
import { STATUS_LABELS, STATUS_COLORS, calculateTwd } from '../constants.ts';
import { 
  ShoppingBasket, Trash2, Contact, 
  ShoppingCart, Minus, Plus, 
  Share2, Package, MapPin, Check, Banknote
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

  const handlePriceChange = (order: OrderItem, newPriceStr: string) => {
    const newPrice = parseFloat(newPriceStr) || 0;
    const effectiveQty = getEffectiveQty(order);
    onUpdateOrder(order.id, { 
      originalPriceJpy: newPrice,
      calculatedPrice: calculateTwd(newPrice * effectiveQty)
    });
  };

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
    <div className="space-y-12">
      {buyerNames.map((buyerName) => {
        const items = groupedOrders[buyerName];
        const buyerTotalTwd = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
        const paidItems = items.filter(i => i.isPaid).length;

        return (
          <div key={buyerName} className="animate-slide-up">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center shadow-lg">
                        <Contact size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900">{buyerName}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {items.length} 筆委託 · {paidItems}/{items.length} 已付款
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => copySummary(buyerName, items)}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 active-scale shadow-sm"
                    >
                        <Share2 size={16} />
                    </button>
                    <div className="bg-indigo-600 px-4 py-2 rounded-xl text-white shadow-lg shadow-indigo-100">
                        <span className="text-[10px] font-black uppercase opacity-70 block leading-none mb-1">Total</span>
                        <span className="text-sm font-black leading-none">NT$ {buyerTotalTwd.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {items.map((order) => (
                    <div key={order.id} className="bg-white rounded-[2rem] border border-slate-200/60 p-5 premium-shadow group transition-all hover:border-indigo-100 flex flex-col sm:flex-row gap-5">
                        <div className="flex gap-5 flex-1">
                            <div className="w-20 h-20 shrink-0 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden relative shadow-inner">
                                {order.imageUrl ? <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover" /> : <Package size={28} className="m-auto h-full text-slate-200" />}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                                        {order.isPaid && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Check size={10} strokeWidth={3} /> Paid</span>}
                                    </div>
                                    <h3 className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-tight">{order.productName}</h3>
                                    {order.shopInfo && <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400"><MapPin size={10} /> {order.shopInfo}</div>}
                                </div>
                                <div className="flex items-end justify-between mt-2">
                                    <div className="flex flex-col flex-1">
                                        <div className="flex items-center gap-1 text-[9px] text-slate-300 font-black uppercase tracking-tighter mb-1">
                                          <Banknote size={10} /> 單價 (JPY)
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <input 
                                            type="number" 
                                            value={order.originalPriceJpy || ''} 
                                            onChange={(e) => handlePriceChange(order, e.target.value)}
                                            placeholder="填入日幣"
                                            className="w-24 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                          />
                                          <span className="text-[10px] font-black text-slate-400">× {getEffectiveQty(order)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] text-slate-300 font-black uppercase block tracking-widest">應收台幣</span>
                                        <span className="text-xl font-black text-indigo-600 leading-none">NT$ {order.calculatedPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex sm:flex-col gap-3 shrink-0 justify-between items-center sm:items-end">
                            <div className="flex items-center bg-slate-50 rounded-2xl p-1 shadow-inner border border-slate-100 w-fit">
                                <button onClick={() => adjustPurchasedQty(order, -1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all active-scale"><Minus size={16}/></button>
                                <div className="w-8 text-center text-sm font-black text-slate-800">{order.purchasedQuantity}</div>
                                <button onClick={() => adjustPurchasedQty(order, 1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all active-scale"><Plus size={16}/></button>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onUpdateOrder(order.id, { isPaid: !order.isPaid })}
                                    className={`p-3 rounded-2xl transition-all active-scale ${order.isPaid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}
                                    title="標記為已付款"
                                >
                                    <Check size={18} strokeWidth={3} />
                                </button>
                                <button 
                                    onClick={() => togglePurchased(order)} 
                                    className={`p-3 rounded-2xl transition-all active-scale ${order.status === OrderStatus.PURCHASED ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}
                                    title="切換購買狀態"
                                >
                                    <ShoppingCart size={18} />
                                </button>
                                <button 
                                    onClick={() => onRemoveOrder(order.id)} 
                                    className="p-3 rounded-2xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all active-scale"
                                    title="刪除訂單"
                                >
                                    <Trash2 size={18} />
                                </button>
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