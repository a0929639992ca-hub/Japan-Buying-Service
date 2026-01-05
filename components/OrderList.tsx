import React from 'react';
import { OrderItem, OrderStatus } from '../types.ts';
import { STATUS_LABELS, STATUS_COLORS, HIDDEN_EXCHANGE_RATE } from '../constants.ts';
import { 
  ShoppingBasket, Trash2, Contact, ImageIcon, 
  CreditCard, ShoppingCart, Minus, Plus, 
  Share2, Check, Edit3, Banknote, Package, ChevronRight
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
            // Updated to use the imported constant HIDDEN_EXCHANGE_RATE instead of hardcoded value.
            onUpdateOrder(order.id, { 
                originalPriceJpy: p,
                calculatedPrice: Math.ceil(p * order.requestedQuantity * HIDDEN_EXCHANGE_RATE)
            });
        }
    }
  };

  const copySummary = (name: string, items: OrderItem[]) => {
    const total = items.reduce((sum, i) => sum + i.calculatedPrice, 0);
    const text = `🌸 Rento 代購團 - ${name}\n` +
      `--------------------------\n` +
      items.map(i => `• ${i.productName} (x${i.requestedQuantity}): ${i.originalPriceJpy === 0 ? '待報價' : 'NT$ ' + i.calculatedPrice.toLocaleString()}`).join('\n') +
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
            {/* 買家資訊分組標頭 */}
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

            {/* 網格列表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {items.map((order) => (
                <div 
                  key={order.id} 
                  className={`bg-white rounded-[2.5rem] border-2 ${order.isPaid ? 'border-emerald-500/30' : 'border-slate-100'} hover:border-indigo-500/20 transition-all flex flex-col overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 group`}
                >
                  <div className="p-6 flex gap-6">
                    {/* 商品圖片容器 */}
                    <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-[2rem] bg-slate-50 border border-slate-100 overflow-hidden relative shadow-inner group-hover:shadow-md transition-shadow">
                      {order.imageUrl ? (
                        <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={32} strokeWidth={1.5} className="text-slate-200" />
                        </div>
                      )}
                      
                      {/* 付款狀態覆蓋 */}
                      {order.isPaid && (
                        <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px] flex items-center justify-center animate-fade-in">
                          <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg border-2 border-white animate-bounce-short">
                            <Check size={16} strokeWidth={4} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 卡片主體資訊 */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-3 mb-2">
                         <h3 className="font-black text-slate-900 text-base line-clamp-2 leading-tight flex-1">{order.productName}</h3>
                         <span className={`shrink-0 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] shadow-sm whitespace-nowrap ${STATUS_COLORS[order.status]}`}>
                           {STATUS_LABELS[order.status]}
                         </span>
                      </div>
                      
                      <div className="flex-1">
                        {order.notes ? (
                          <div className="bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100/50 mb-3">
                            <p className="text-[11px] text-slate-400 line-clamp-2 italic leading-relaxed">
                              「{order.notes}」
                            </p>
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                      </div>

                      {/* 價格資訊區塊 */}
                      <div className="grid grid-cols-2 gap-4 mt-auto pt-2">
                        <button 
                          onClick={() => handleEditPrice(order)}
                          className="text-left group/price relative"
                        >
                          <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <Banknote size={10} /> JPY Unit
                          </p>
                          <div className="flex items-baseline gap-1">
                             <p className={`text-lg font-black tracking-tight ${order.originalPriceJpy === 0 ? 'text-amber-500 animate-pulse' : 'text-slate-700'}`}>
                               ¥ {order.originalPriceJpy.toLocaleString()}
                             </p>
                             <Edit3 size={12} className="text-slate-300 opacity-0 group-hover/price:opacity-100 transition-opacity mb-0.5" />
                          </div>
                        </button>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mb-1">Estimated TWD</p>
                          <p className="text-lg font-black text-indigo-600 tracking-tight">
                            {order.originalPriceJpy === 0 ? '待報價' : `NT$ ${order.calculatedPrice.toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 底部操作欄位 */}
                  <div className="px-6 pb-6 pt-2 border-t border-slate-50 mt-auto bg-slate-50/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">採購進度</span>
                           <div className="flex items-center gap-2">
                             <span className="text-base font-black text-slate-900 leading-none">{order.purchasedQuantity}</span>
                             <span className="text-xs font-bold text-slate-300">/</span>
                             <span className="text-xs font-bold text-slate-300">{order.requestedQuantity}</span>
                           </div>
                        </div>
                        
                        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-200/60 ml-2">
                          <button 
                            onClick={() => adjustPurchasedQty(order, -1)} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all active:scale-90"
                          >
                            <Minus size={14} strokeWidth={3} />
                          </button>
                          <div className="w-[1px] h-4 bg-slate-100 self-center mx-1"></div>
                          <button 
                            onClick={() => adjustPurchasedQty(order, 1)} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all active:scale-90"
                          >
                            <Plus size={14} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">完成率</span>
                         <span className="text-xs font-black text-slate-900">{Math.round((order.purchasedQuantity / order.requestedQuantity) * 100)}%</span>
                      </div>
                    </div>

                    {/* 進度條 */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-6 ring-4 ring-slate-100/50">
                      <div 
                        className={`h-full transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1) ${order.status === OrderStatus.PURCHASED ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                        style={{ width: `${(order.purchasedQuantity / order.requestedQuantity) * 100}%` }} 
                      />
                    </div>

                    {/* 主要操作按鈕組 */}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => togglePurchased(order)} 
                        className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-[1.5rem] text-[11px] font-black transition-all active:scale-95 shadow-sm ${order.status === OrderStatus.PURCHASED ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                      >
                        <ShoppingCart size={16} strokeWidth={2.5} />
                        {order.status === OrderStatus.PURCHASED ? '採購完成' : '標記已購'}
                      </button>
                      
                      <button 
                        onClick={() => onUpdateOrder(order.id, { isPaid: !order.isPaid })} 
                        className={`px-5 flex items-center justify-center rounded-[1.5rem] transition-all active:scale-95 shadow-sm ${order.isPaid ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                        title={order.isPaid ? "已收帳款" : "標記收帳"}
                      >
                        <CreditCard size={18} strokeWidth={2.5} />
                      </button>
                      
                      <button 
                        onClick={() => onRemoveOrder(order.id)} 
                        className="px-5 flex items-center justify-center bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-[1.5rem] transition-all active:scale-95 border border-rose-100/50 shadow-sm shadow-rose-100"
                        title="刪除委託"
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
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