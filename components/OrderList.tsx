import React from 'react';
import { OrderItem, OrderStatus } from '../types.ts';
import { STATUS_LABELS, STATUS_COLORS, HIDDEN_EXCHANGE_RATE } from '../constants.ts';
import { 
  ShoppingBasket, Trash2, Contact, 
  CreditCard, ShoppingCart, Minus, Plus, 
  Share2, Check, Edit3, Banknote, Package, Calculator, ArrowRight, LayoutList
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
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
          <ShoppingBasket className="text-slate-200" size={36} />
        </div>
        <h3 className="text-slate-400 text-lg font-black">清單目前空空如也</h3>
        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-2">Waiting for new requests from buyers</p>
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

  // --- 核心邏輯：計算有效數量與金額 ---
  const getEffectiveQty = (order: OrderItem) => {
    return order.status === OrderStatus.PENDING ? order.requestedQuantity : order.purchasedQuantity;
  };

  const calculateTwd = (jpyPrice: number, qty: number) => {
    return Math.ceil(jpyPrice * qty * HIDDEN_EXCHANGE_RATE);
  };

  // --- 操作處理 ---

  const togglePurchased = (order: OrderItem) => {
    const isCurrentlyPurchased = order.status === OrderStatus.PURCHASED;
    const newStatus = isCurrentlyPurchased ? OrderStatus.PENDING : OrderStatus.PURCHASED;
    const newPurchasedQty = isCurrentlyPurchased ? 0 : order.requestedQuantity;
    const effectiveQty = newStatus === OrderStatus.PENDING ? order.requestedQuantity : newPurchasedQty;

    onUpdateOrder(order.id, { 
      status: newStatus, 
      purchasedQuantity: newPurchasedQty,
      calculatedPrice: calculateTwd(order.originalPriceJpy, effectiveQty)
    });
  };

  const adjustPurchasedQty = (order: OrderItem, delta: number) => {
    const newQty = Math.max(0, Math.min(order.requestedQuantity, order.purchasedQuantity + delta));
    const newStatus = order.status === OrderStatus.PENDING && newQty > 0 ? OrderStatus.PURCHASED : order.status;
    const effectiveQtyForPrice = newStatus === OrderStatus.PENDING ? order.requestedQuantity : newQty;

    onUpdateOrder(order.id, { 
      purchasedQuantity: newQty,
      status: newStatus,
      calculatedPrice: calculateTwd(order.originalPriceJpy, effectiveQtyForPrice)
    });
  };

  const handleEditPrice = (order: OrderItem) => {
    const newPrice = prompt(`請輸入 ${order.productName} 的日幣單價:`, order.originalPriceJpy.toString());
    if (newPrice !== null) {
        const p = parseFloat(newPrice);
        if (!isNaN(p)) {
            const qty = getEffectiveQty(order);
            onUpdateOrder(order.id, { 
                originalPriceJpy: p,
                calculatedPrice: calculateTwd(p, qty)
            });
        }
    }
  };

  const copySummary = (name: string, items: OrderItem[]) => {
    const total = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
    const text = `🌸 Rento 代購團 - ${name}\n` +
      `--------------------------\n` +
      items.map(i => {
         const qty = getEffectiveQty(i);
         return `• ${i.productName} (x${qty}): ${i.originalPriceJpy === 0 ? '待報價' : 'NT$ ' + i.calculatedPrice.toLocaleString()}`;
      }).join('\n') +
      `\n--------------------------\n總計: NT$ ${total.toLocaleString()}`;
    navigator.clipboard.writeText(text);
    alert('對帳明細已複製到剪貼簿！');
  };

  return (
    <div className="space-y-4">
       {/* 提示標題 (如果有多個買家) */}
       {buyerNames.length > 1 && (
         <div className="flex items-center gap-2 px-2 text-slate-400">
            <LayoutList size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {buyerNames.length} Buyers Active (Swipe to view)
            </span>
         </div>
       )}

       {/* 橫向捲動容器 (Snap Carousel) */}
       <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-5 px-5 scroll-smooth hide-scrollbar items-start">
          {buyerNames.map((buyerName) => {
            const items = groupedOrders[buyerName];
            const buyerTotalTwd = items.reduce((sum, i) => sum + i.calculatedPrice, 0);

            return (
              <div key={buyerName} className="snap-center shrink-0 w-[92vw] sm:w-[28rem] flex flex-col gap-4 animate-slide-in">
                
                {/* 買家大卡片容器 */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-2 shadow-xl shadow-slate-200/60 border border-white flex flex-col gap-2">
                    
                    {/* 買家 Header */}
                    <div className="bg-slate-50 rounded-[2rem] p-5 border border-slate-100 relative overflow-hidden group">
                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/10 shrink-0">
                                    <Contact size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">{buyerName}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/50">
                                            Total: NT$ {buyerTotalTwd.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => copySummary(buyerName, items)}
                                className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm active:scale-95"
                            >
                                <Share2 size={18} />
                            </button>
                        </div>
                        {/* 裝飾背景 */}
                        <div className="absolute -bottom-6 -right-6 text-slate-100/50 rotate-12 pointer-events-none">
                            <ShoppingBasket size={120} />
                        </div>
                    </div>

                    {/* 訂單列表 (垂直捲動區) */}
                    <div className="flex flex-col gap-3 px-1 max-h-[60vh] overflow-y-auto custom-scrollbar pb-2">
                        {items.map((order) => {
                            const effectiveQty = getEffectiveQty(order);
                            const totalJpy = order.originalPriceJpy * effectiveQty;
                            const isPending = order.status === OrderStatus.PENDING;

                            return (
                            <div 
                                key={order.id} 
                                className={`bg-white rounded-[2rem] border ${order.isPaid ? 'border-emerald-500/30' : 'border-slate-100'} p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:border-indigo-200 transition-colors`}
                            >
                                <div className="flex gap-4">
                                    {/* 小型圖片 */}
                                    <div className="w-16 h-16 shrink-0 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative">
                                        {order.imageUrl ? (
                                        <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover" />
                                        ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package size={20} className="text-slate-200" />
                                        </div>
                                        )}
                                        {order.isPaid && (
                                            <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px] flex items-center justify-center">
                                                <div className="bg-emerald-500 text-white p-1 rounded-full"><Check size={10} strokeWidth={4} /></div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-1">
                                            <h3 className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight">{order.productName}</h3>
                                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                                                {STATUS_LABELS[order.status]}
                                            </span>
                                        </div>
                                        {order.notes && <p className="text-[9px] text-slate-400 line-clamp-1 mt-1">{order.notes}</p>}
                                        
                                        {/* 精簡版價格區 */}
                                        <div className="mt-2 flex items-end justify-between">
                                            <div className="flex flex-col">
                                                 <button onClick={() => handleEditPrice(order)} className="text-[10px] text-slate-400 font-bold flex items-center gap-1 hover:text-indigo-600">
                                                     ¥{order.originalPriceJpy.toLocaleString()} <span className="text-[8px] bg-slate-100 px-1 rounded">EDIT</span>
                                                 </button>
                                            </div>
                                            <div className="text-right">
                                                 <div className="text-[9px] text-slate-400 font-bold mb-0.5">{isPending ? '預計' : '實購'} x{effectiveQty}</div>
                                                 <div className={`text-sm font-black ${order.calculatedPrice === 0 ? 'text-amber-500' : 'text-indigo-600'}`}>NT$ {order.calculatedPrice.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 操作按鈕列 */}
                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-50">
                                     <div className="col-span-2 flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100">
                                         <button onClick={() => adjustPurchasedQty(order, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Minus size={12}/></button>
                                         <div className="flex-1 text-center text-xs font-black text-slate-700">{order.purchasedQuantity}</div>
                                         <button onClick={() => adjustPurchasedQty(order, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-white hover:shadow-sm rounded-lg transition-all"><Plus size={12}/></button>
                                     </div>
                                     <button 
                                        onClick={() => togglePurchased(order)} 
                                        className={`rounded-xl flex items-center justify-center ${order.status === OrderStatus.PURCHASED ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}
                                     >
                                         <ShoppingCart size={14} />
                                     </button>
                                     <button 
                                        onClick={() => onRemoveOrder(order.id)} 
                                        className="rounded-xl flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100"
                                     >
                                         <Trash2 size={14} />
                                     </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
              </div>
            );
          })}
          
          {/* 最後一個隱形 Spacer 讓滑動體驗更好 */}
          <div className="shrink-0 w-2"></div>
       </div>

       <style>{`
         .hide-scrollbar::-webkit-scrollbar { display: none; }
         .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
         .custom-scrollbar::-webkit-scrollbar { width: 4px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
       `}</style>
    </div>
  );
};

export default OrderList;