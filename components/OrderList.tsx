// Fix: Correct malformed import statement
import React, { useState, useEffect } from 'react';
import { OrderItem, OrderStatus } from '../types.ts';
import { STATUS_LABELS, STATUS_COLORS, calculateTwd } from '../constants.ts';
import { 
  ShoppingBasket, Trash2, Contact, 
  ShoppingCart, Minus, Plus, 
  Share2, Package, MapPin, Check,
  ChevronDown, ChevronUp, CreditCard, Layers, X, ZoomIn, FileText, Edit2, Save
} from 'lucide-react';

interface OrderListProps {
  orders: OrderItem[];
  onRemoveOrder: (id: string) => void;
  onUpdateOrder: (id: string, updates: Partial<OrderItem>) => void;
}

const PriceInput = ({ value, onChange }: { value: number, onChange: (val: string) => void }) => {
  const [localVal, setLocalVal] = useState(value?.toString() || '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(value?.toString() || '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (localVal !== value?.toString()) {
      onChange(localVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input 
      type="number" 
      value={localVal} 
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-16 pl-5 pr-1 py-0.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
};

const EditOrderModal = ({ order, onClose, onSave }: { order: OrderItem, onClose: () => void, onSave: (updates: Partial<OrderItem>) => void }) => {
  const [formData, setFormData] = useState({
    productName: order.productName,
    shopInfo: order.shopInfo || '',
    notes: order.notes || '',
    requestedQuantity: order.requestedQuantity
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 確保數量至少為 1
    const qty = formData.requestedQuantity > 0 ? formData.requestedQuantity : 1;
    
    const updates: Partial<OrderItem> = { 
        ...formData,
        requestedQuantity: qty
    };
    
    // 如果數量變更，自動重新計算台幣價格
    if (qty !== order.requestedQuantity) {
       updates.calculatedPrice = calculateTwd(order.originalPriceJpy * qty);
    }
    
    onSave(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Edit2 size={18} className="text-indigo-600"/> 編輯商品資訊
          </h3>
          <button type="button" onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100"><X size={16}/></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">商品名稱</label>
            <input 
              type="text" 
              required
              value={formData.productName} 
              onChange={(e) => setFormData({...formData, productName: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-bold text-slate-700 border border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 transition-all"
            />
          </div>

          <div className="flex gap-4">
             <div className="space-y-1.5 flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">購買地點</label>
                <input 
                  type="text" 
                  value={formData.shopInfo} 
                  onChange={(e) => setFormData({...formData, shopInfo: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-medium text-slate-700 border border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 transition-all"
                />
             </div>
             <div className="space-y-1.5 w-24">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">數量</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={formData.requestedQuantity || ''} 
                  onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData({...formData, requestedQuantity: isNaN(val) ? 0 : val});
                  }}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-sm font-bold text-center text-slate-700 border border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 transition-all"
                />
             </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">詳細備註 (含規格)</label>
            <textarea 
              rows={4}
              value={formData.notes} 
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none text-xs font-medium text-slate-600 border border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 transition-all resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">取消</button>
          <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2">
            <Save size={16} /> 儲存變更
          </button>
        </div>
      </form>
    </div>
  );
};

const OrderList: React.FC<OrderListProps> = ({ orders, onRemoveOrder, onUpdateOrder }) => {
  const [expandedBuyers, setExpandedBuyers] = useState<Set<string>>(new Set());
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 animate-slide-up">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <ShoppingBasket className="text-slate-200" size={32} />
        </div>
        <h3 className="text-slate-400 text-lg font-bold">目前尚無資料</h3>
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
    const text = `🌸 れんと代購 - ${name}\n` +
      `--------------------------\n` +
      items.map(i => `• ${i.productName} (x${getEffectiveQty(i)}): NT$ ${i.calculatedPrice.toLocaleString()}`).join('\n') +
      `\n--------------------------\n總計: NT$ ${total.toLocaleString()}`;
    navigator.clipboard.writeText(text);
    alert('對帳明細已複製');
  };

  const openImage = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    setEnlargedImage(url);
  };

  return (
    <div className="space-y-3">
      <div className="px-2 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
            <div 
                onClick={() => toggleBuyer(buyerName)}
                className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden premium-shadow active-scale ${
                    isExpanded ? 'border-indigo-500 ring-2 ring-indigo-500/10 mb-2' : 'border-slate-200/60'
                }`}
            >
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                            allPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-amber-400'
                        }`}>
                            {allPaid ? <Check size={20} strokeWidth={3} /> : <Contact size={20} />}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 truncate">
                                {buyerName}
                                {allPaid && <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded uppercase tracking-tighter">Done</span>}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 uppercase mt-0.5">
                                {items.length} 筆 · {paidItems}/{items.length} 已收
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-300 uppercase block leading-none mb-1">¥{buyerTotalJpy.toLocaleString()}</span>
                            <span className={`text-xl font-extrabold leading-none ${allPaid ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                NT$ {buyerTotalTwd.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex gap-1 border-l border-slate-100 pl-3">
                            <button 
                                onClick={(e) => copySummary(e, buyerName, items)}
                                className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 active-scale"
                            >
                                <Share2 size={16} />
                            </button>
                            <div className="p-2 text-slate-300">
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-1 w-full bg-slate-50 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-700 ${allPaid ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${(paidItems / items.length) * 100}%` }}
                    ></div>
                </div>
            </div>

            {isExpanded && (
                <div className="space-y-2 px-1 pb-4 animate-slide-up">
                    {items.map((order) => {
                        const isSpecNote = order.notes?.includes('貨源碼');
                        return (
                        <div key={order.id} className="bg-white rounded-2xl border border-slate-200/60 p-3 premium-shadow flex flex-col sm:flex-row gap-3 relative transition-all hover:bg-slate-50/50">
                            <div className="flex gap-3 flex-1">
                                <div 
                                  onClick={(e) => order.imageUrl && openImage(e, order.imageUrl)}
                                  className={`w-14 h-14 shrink-0 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group/img transition-all ${order.imageUrl ? 'cursor-zoom-in active:scale-95' : ''}`}
                                >
                                    {order.imageUrl ? (
                                      <>
                                        <img src={order.imageUrl} alt={order.productName} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                          <ZoomIn size={14} className="text-white" />
                                        </div>
                                      </>
                                    ) : (
                                      <Package size={20} className="m-auto h-full text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                                            {order.isPaid && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5"><Check size={8} strokeWidth={3} /> 已付</span>}
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-sm line-clamp-1 leading-tight">{order.productName}</h3>
                                        {order.shopInfo && <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 truncate"><MapPin size={8} /> {order.shopInfo}</div>}
                                        
                                        {order.notes && (
                                            <div className={`mt-1.5 rounded-lg p-2 border ${isSpecNote ? 'bg-indigo-50/50 border-indigo-100/50' : 'bg-slate-50 border-slate-100'}`}>
                                                <div className="flex items-start gap-1.5">
                                                    <FileText size={10} className={`${isSpecNote ? 'text-indigo-400' : 'text-slate-400'} mt-0.5 shrink-0`} />
                                                    <p className={`text-[10px] font-medium leading-relaxed whitespace-pre-wrap break-all ${isSpecNote ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                        {order.notes}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-end justify-between mt-1">
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">¥</span>
                                                <PriceInput 
                                                    value={order.originalPriceJpy}
                                                    onChange={(val) => handlePriceChange(order, val)}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">× {getEffectiveQty(order)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-base font-extrabold text-indigo-600 leading-none">NT$ {order.calculatedPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex sm:flex-col gap-2 shrink-0 justify-between items-center sm:items-end border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-3">
                                <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                                    <button onClick={() => adjustPurchasedQty(order, -1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 active-scale"><Minus size={12}/></button>
                                    <div className="w-5 text-center text-xs font-bold text-slate-800">{order.purchasedQuantity}</div>
                                    <button onClick={() => adjustPurchasedQty(order, 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 active-scale"><Plus size={12}/></button>
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setEditingOrder(order)} 
                                        className="p-2 rounded-lg bg-indigo-50 text-indigo-500 border border-indigo-100 active-scale"
                                        title="編輯資訊"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => onUpdateOrder(order.id, { isPaid: !order.isPaid })}
                                        className={`p-2 rounded-lg transition-all active-scale ${order.isPaid ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
                                        title="標記已付款"
                                    >
                                        <CreditCard size={14} />
                                    </button>
                                    <button 
                                        onClick={() => togglePurchased(order)} 
                                        className={`p-2 rounded-lg transition-all active-scale ${order.status === OrderStatus.PURCHASED ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}
                                        title="標記已購入"
                                    >
                                        <ShoppingCart size={14} />
                                    </button>
                                    <button 
                                        onClick={() => onRemoveOrder(order.id)} 
                                        className="p-2 rounded-lg bg-rose-50 text-rose-400 border border-rose-100 active-scale"
                                        title="刪除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            )}
          </div>
        );
      })}

      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-10 animate-fade-in"
          onClick={() => setEnlargedImage(null)}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }}
            className="absolute top-6 right-6 z-[120] p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all active-scale shadow-lg"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            <img 
              src={enlargedImage} 
              alt="Enlarged" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-zoom-in pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {editingOrder && (
        <EditOrderModal 
          order={editingOrder} 
          onClose={() => setEditingOrder(null)} 
          onSave={(updates) => {
            onUpdateOrder(editingOrder.id, updates);
            setEditingOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default OrderList;