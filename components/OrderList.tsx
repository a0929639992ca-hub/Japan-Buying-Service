import React from 'react';
import { OrderItem, OrderStatus } from '../types.ts';
import { STATUS_LABELS, STATUS_COLORS, HIDDEN_EXCHANGE_RATE } from '../constants.ts';
import { 
  ShoppingBasket, Trash2, Contact, 
  CreditCard, ShoppingCart, Minus, Plus, 
  Share2, Check, Edit3, Banknote, Package, Calculator, ArrowRight
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

  // --- 核心邏輯：計算有效數量與金額 ---
  // 若狀態為 Pending，視為預估，使用「需求數量」。
  // 若狀態已進入購買流程 (Purchased/Shipped/Arrived)，視為定案，使用「實際購買數量」。
  const getEffectiveQty = (order: OrderItem) => {
    return order.status === OrderStatus.PENDING ? order.requestedQuantity : order.purchasedQuantity;
  };

  const calculateTwd = (jpyPrice: number, qty: number) => {
    return Math.ceil(jpyPrice * qty * HIDDEN_EXCHANGE_RATE);
  };

  // --- 操作處理 ---

  const togglePurchased = (order: OrderItem) => {
    const isCurrentlyPurchased = order.status === OrderStatus.PURCHASED;
    
    // 如果切換成已購買，預設買到的數量等於需求數量
    const newStatus = isCurrentlyPurchased ? OrderStatus.PENDING : OrderStatus.PURCHASED;
    const newPurchasedQty = isCurrentlyPurchased ? 0 : order.requestedQuantity;
    
    // 根據新狀態決定計價數量
    const effectiveQty = newStatus === OrderStatus.PENDING ? order.requestedQuantity : newPurchasedQty;

    onUpdateOrder(order.id, { 
      status: newStatus, 
      purchasedQuantity: newPurchasedQty,
      calculatedPrice: calculateTwd(order.originalPriceJpy, effectiveQty)
    });
  };

  const adjustPurchasedQty = (order: OrderItem, delta: number) => {
    const newQty = Math.max(0, Math.min(order.requestedQuantity, order.purchasedQuantity + delta));
    
    // 如果數量變動，狀態可能也需要連動 (例如買到 0 個可能要變回 pending 或維持 purchased 但數量為 0)
    // 這裡邏輯簡化：只要有動數量，就假設進入購買流程，除非全歸零且手動改回 pending
    const newStatus = order.status === OrderStatus.PENDING && newQty > 0 ? OrderStatus.PURCHASED : order.status;
    
    // 計算金額時，因為已經開始動「已購數量」，所以直接用新的已購數量計價
    // 但如果狀態還是 Pending (例如按到 - 變成 0)，且原本就沒買，則金額邏輯會在下一次 render 用 requestedQty 顯示預估
    // 為了即時性，我們這裡強制更新金額邏輯
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
    <div className="space-y-16">
      {(Object.entries(groupedOrders) as [string, OrderItem[]][]).map(([buyerName, items]) => {
        const buyerTotalTwd = items.reduce((sum, i) => sum + i.calculatedPrice, 0);

        return (
          <div key={buyerName} className="space-y-6 animate-slide-in">
            {/* 買家標頭 */}
            <div className="flex items-center justify-between bg-slate-100/50 p-3 pl-5 rounded-2xl border border-slate-200/40">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/10 shrink-0">
                  <Contact size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">{buyerName}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                      Total NT$ {buyerTotalTwd.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{items.length} Items</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => copySummary(buyerName, items)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm active:scale-95 group"
              >
                <Share2 size={14} className="group-hover:rotate-12 transition-transform" />
                對帳明細
              </button>
            </div>

            {/* 卡片列表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {items.map((order) => {
                const effectiveQty = getEffectiveQty(order);
                const totalJpy = order.originalPriceJpy * effectiveQty;
                const isPending = order.status === OrderStatus.PENDING;

                return (
                  <div 
                    key={order.id} 
                    className={`bg-white rounded-[2.5rem] border-2 ${order.isPaid ? 'border-emerald-500/30' : 'border-slate-100'} hover:border-indigo-500/20 transition-all flex flex-col overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 group`}
                  >
                    <div className="p-6 flex gap-5">
                      {/* 圖片 */}
                      <div className="w-24 h-24 shrink-0 rounded-[1.5rem] bg-slate-50 border border-slate-100 overflow-hidden relative shadow-inner group-hover:shadow-md transition-shadow">
                        {order.imageUrl ? (
                          <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={28} strokeWidth={1.5} className="text-slate-200" />
                          </div>
                        )}
                        {order.isPaid && (
                          <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px] flex items-center justify-center animate-fade-in">
                            <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white animate-bounce-short">
                              <Check size={14} strokeWidth={4} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 資訊與帳單區 */}
                      <div className="flex-1 min-w-0 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                           <h3 className="font-black text-slate-900 text-sm line-clamp-2 leading-tight flex-1 pt-1">{order.productName}</h3>
                           <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] shadow-sm whitespace-nowrap ${STATUS_COLORS[order.status]}`}>
                             {STATUS_LABELS[order.status]}
                           </span>
                        </div>
                        
                        {order.notes && (
                            <p className="text-[10px] text-slate-400 line-clamp-1 italic bg-slate-50 px-2 py-1 rounded-md w-fit">
                              {order.notes}
                            </p>
                        )}

                        {/* 價格明細區 (Receipt Style) */}
                        <div className="mt-auto bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-2">
                            {/* 第一行：單價與數量 */}
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-300 mb-0.5">日幣單價</span>
                                    <button onClick={() => handleEditPrice(order)} className="font-bold flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                        ¥ {order.originalPriceJpy.toLocaleString()} <Edit3 size={10} className="opacity-50"/>
                                    </button>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-300 mb-0.5">
                                        {isPending ? '預計數量' : '實購數量'}
                                    </span>
                                    <span className={`font-bold ${isPending ? 'text-slate-500' : 'text-indigo-600'}`}>
                                        x{effectiveQty}
                                    </span>
                                </div>
                            </div>
                            
                            {/* 分隔線 */}
                            <div className="border-b border-dashed border-slate-200"></div>

                            {/* 第二行：總價 */}
                            <div className="flex items-end justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-300 mb-0.5">日幣總計</span>
                                    <span className="text-xs font-bold text-slate-700">¥ {totalJpy.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-300 mb-0.5">台幣總金額</span>
                                    <span className={`text-base font-black tracking-tight ${order.calculatedPrice === 0 ? 'text-amber-500' : 'text-indigo-600'}`}>
                                        NT$ {order.calculatedPrice.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                      </div>
                    </div>

                    {/* 底部操作區 */}
                    <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-4">
                        {/* 數量調整器 */}
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Calculator size={10} /> 採購執行
                            </span>
                            <div className="flex items-center gap-3">
                                <div className="flex bg-white rounded-xl p-0.5 shadow-sm border border-slate-200">
                                  <button 
                                    onClick={() => adjustPurchasedQty(order, -1)} 
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all active:scale-90"
                                  >
                                    <Minus size={14} strokeWidth={3} />
                                  </button>
                                  <div className="flex flex-col items-center justify-center px-3 min-w-[3rem]">
                                      <span className="text-xs font-black text-slate-900 leading-none">{order.purchasedQuantity}</span>
                                      <span className="text-[8px] font-bold text-slate-300 mt-0.5">OF {order.requestedQuantity}</span>
                                  </div>
                                  <button 
                                    onClick={() => adjustPurchasedQty(order, 1)} 
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all active:scale-90"
                                  >
                                    <Plus size={14} strokeWidth={3} />
                                  </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* 進度條 */}
                        <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                             <div 
                                className={`h-full transition-all duration-500 ${order.status === OrderStatus.PURCHASED ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(100, (order.purchasedQuantity / order.requestedQuantity) * 100)}%` }}
                             ></div>
                        </div>

                        {/* 主要按鈕 */}
                        <div className="flex gap-2.5">
                            <button 
                                onClick={() => togglePurchased(order)} 
                                className={`flex-1 py-3 rounded-2xl text-[10px] font-black shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${order.status === OrderStatus.PURCHASED ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600'}`}
                            >
                                <ShoppingCart size={14} />
                                {order.status === OrderStatus.PURCHASED ? '已完成採購' : '標記已購'}
                            </button>
                            <button 
                                onClick={() => onUpdateOrder(order.id, { isPaid: !order.isPaid })} 
                                className={`w-12 flex items-center justify-center rounded-2xl border transition-all active:scale-95 ${order.isPaid ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-300 hover:text-emerald-500 hover:border-emerald-200'}`}
                            >
                                <CreditCard size={16} />
                            </button>
                            <button 
                                onClick={() => onRemoveOrder(order.id)} 
                                className="w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-300 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all active:scale-95"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderList;