import React, { useState } from 'react';
import { OrderItem, OrderStatus } from '../types.ts';
import { STATUS_LABELS, STATUS_COLORS, calculateTwd } from '../constants.ts';
import { 
  ShoppingBasket, Trash2, Contact, 
  ShoppingCart, Minus, Plus, 
  Share2, Package, MapPin, Check, Banknote,
  ChevronDown, ChevronUp, CreditCard, Layers
} from 'lucide-react';

interface OrderListProps {
  orders: OrderItem[];
  onRemoveOrder: (id: string) => void;
  onUpdateOrder: (id: string, updates: Partial<OrderItem>) => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onRemoveOrder, onUpdateOrder }) => {
  const [expandedBuyers, setExpandedBuyers] = useState<Set<string>>(new Set());

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

  const toggleBuyer = (name: string) => {
    const newExpanded = new Set(expandedBuyers);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedBuyers(newExpanded);
  };

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

  const copySummary = (e: React.MouseEvent, name: string, items: OrderItem[]) => {
    e.stopPropagation();
    const total = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
    const text = `🌸 Rento 代購團 - ${name}\n` +
      `--------------------------\n` +
      items.map(i => `• ${i.productName} (x${getEffectiveQty(i)}): NT$ ${i.calculatedPrice.toLocaleString()}`).join('\n') +
      `\n--------------------------\n總計: NT$ ${total.toLocaleString()}`;
    navigator.clipboard.writeText(text);
    alert('對帳明細已複製');
  };

  return (
    <div className="space-y-4">
      <div className="px-4 flex items-center justify-between">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Layers size={14} /> 買家清單 ({buyerNames.length})
        </h3>
      </div>
      
      {buyerNames.map((buyerName) => {
        const items = groupedOrders[buyerName];
        const isExpanded = expandedBuyers.has(buyerName);
        const buyerTotalTwd = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
        const buyerTotalJpy = items.reduce((sum, i) => sum + (i.originalPriceJpy * getEffectiveQty(i)), 0);
        const paidItems = items.filter(i => i.isPaid).length;
        const allPaid = paidItems === items.length && items.length > 0;

        return (
          <div key={buyerName} className="animate-slide-up">
            {/* 買家摺疊卡片 Header */}
            <div 
                onClick={() => toggleBuyer(buyerName)}
                className={`bg-white rounded-[2rem] border transition-all cursor-pointer overflow-hidden premium-shadow active-scale ${
                    isExpanded ? 'border-indigo-500 ring-4 ring-indigo-500/5 mb-4' : 'border-slate-200/60'
                }`}
            >
                <div className="p-5 sm:p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            allPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-amber-400'
                        }`}>
                            {allPaid ? <Check size={24} strokeWidth={3} /> : <Contact size={24} />}
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                                {buyerName}
                                {allPaid && <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Done</span>}
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                {items.length} 筆委託 · {paidItems}/{items.length} 已收
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                            <span className="text-[9px] font-black text-slate-300 uppercase block leading-none mb-1">Total JPY ¥{buyerTotalJpy.toLocaleString()}</span>
                            <span className={`text-lg font-black leading-none ${allPaid ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                NT$ {buyerTotalTwd.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={(e) => copySummary(e, buyerName, items)}
                                className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 active-scale"
                            >
                                <Share2 size={16} />
                            </button>
                            <div className="p-3 text-slate-300">
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 簡單的進度條 */}
                <div className="h-1.5 w-full bg-slate-50 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-700 ${allPaid ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${(paidItems / items.length) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* 展開的詳細商品列表 */}
            {isExpanded && (
                <div className="space-y-4 px-4 pb-8 animate-slide-up">
                    {items.map((order) => (
                        <div key={order.id} className="bg-white/60 backdrop-blur-sm rounded-[2rem] border border-slate-200/40 p-5 premium-shadow flex flex-col sm:flex-row gap-5 relative group transition-all hover:bg-white">
                            <div className="flex gap-5 flex-1">
                                <div className="w-16 h-16 shrink-0 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative shadow-inner">
                                    {order.imageUrl ? <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover" /> : <Package size={20} className="m-auto h-full text-slate-200" />}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                                            {order.isPaid && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><Check size={8} strokeWidth={3} /> Paid</span>}
                                        </div>
                                        <h3 className="font-extrabold text-slate-900 text-xs line-clamp-1 leading-tight">{order.productName}</h3>
                                        {order.shopInfo && <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400"><MapPin size={8} /> {order.shopInfo}</div>}
                                    </div>
                                    <div className="flex items-end justify-between mt-2">
                                        <div className="flex flex-col flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">¥</span>
                                                    <input 
                                                        type="number" 
                                                        value={order.originalPriceJpy || ''} 
                                                        onChange={(e) => handlePriceChange(order, e.target.value)}
                                                        placeholder="日幣"
                                                        className="w-20 pl-5 pr-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400">× {getEffectiveQty(order)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg font-black text-indigo-600 leading-none">NT$ {order.calculatedPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex sm:flex-col gap-2 shrink-0 justify-between items-center sm:items-end">
                                <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100 w-fit">
                                    <button onClick={() => adjustPurchasedQty(order, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 active-scale"><Minus size={14}/></button>
                                    <div className="w-6 text-center text-xs font-black text-slate-800">{order.purchasedQuantity}</div>
                                    <button onClick={() => adjustPurchasedQty(order, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 active-scale"><Plus size={14}/></button>
                                </div>
                                <div className="flex gap-1.5">
                                    <button 
                                        onClick={() => onUpdateOrder(order.id, { isPaid: !order.isPaid })}
                                        className={`p-2.5 rounded-xl transition-all active-scale ${order.isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                        <CreditCard size={14} />
                                    </button>
                                    <button 
                                        onClick={() => togglePurchased(order)} 
                                        className={`p-2.5 rounded-xl transition-all active-scale ${order.status === OrderStatus.PURCHASED ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                        <ShoppingCart size={14} />
                                    </button>
                                    <button 
                                        onClick={() => onRemoveOrder(order.id)} 
                                        className="p-2.5 rounded-xl bg-rose-50 text-rose-400 active-scale"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderList;