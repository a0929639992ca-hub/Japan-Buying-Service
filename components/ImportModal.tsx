import React from 'react';
import { OrderItem } from '../types.ts';
import { Bell, X, Check, JapaneseYen, User, ShoppingBag, Info } from 'lucide-react';

interface ImportModalProps {
  data: OrderItem;
  onConfirm: (order: OrderItem) => void;
  onCancel: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ data, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-in ring-1 ring-white/20">
        <div className="p-8 bg-gradient-to-r from-indigo-500 to-indigo-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Bell size={22} className="animate-bounce" />
            </div>
            <div>
              <h3 className="font-black text-lg">新委託即時回傳</h3>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">New Auto-Sync Request</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex gap-5">
            <div className="w-28 h-28 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {data.imageUrl ? (
                <img src={data.imageUrl} className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag size={32} className="text-gray-200" />
              )}
            </div>
            <div className="space-y-2 py-1 flex-1">
              <div className="flex items-center gap-2 text-indigo-500">
                <User size={14} strokeWidth={3} />
                <span className="text-sm font-black tracking-tight">{data.buyerName}</span>
              </div>
              <h4 className="font-bold text-gray-800 leading-tight text-lg line-clamp-2">{data.productName}</h4>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                <span className="bg-gray-100 px-2 py-1 rounded-lg">數量: {data.requestedQuantity}</span>
              </div>
            </div>
          </div>

          {data.notes && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 font-medium leading-relaxed italic">「 {data.notes} 」</p>
            </div>
          )}

          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <p className="text-xs font-bold text-gray-400 text-center leading-relaxed">
              此為買家直接填單回傳，<br/>
              匯入後請記得到訂單明細中 <span className="text-indigo-600">填寫日幣價格</span>。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={onCancel}
              className="py-5 rounded-2xl text-gray-400 font-black text-sm hover:bg-gray-50 transition-all"
            >
              忽略此單
            </button>
            <button
              onClick={() => onConfirm(data)}
              className="py-5 rounded-2xl bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} strokeWidth={3} />
              立即收單
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;