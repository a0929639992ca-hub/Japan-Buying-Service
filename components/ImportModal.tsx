import React from 'react';
import { OrderItem } from '../types.ts';
import { Zap, X, Check, JapaneseYen, User, ShoppingBag, Info, Sparkles } from 'lucide-react';

interface ImportModalProps {
  data: OrderItem;
  onConfirm: (order: OrderItem) => void;
  onCancel: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ data, onConfirm, onCancel }) => {
  const isAI = data.id.startsWith('AI-');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-in border border-white/20">
        <div className={`p-8 flex justify-between items-center text-white ${isAI ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
              {isAI ? <Sparkles size={22} className="animate-pulse" /> : <Zap size={22} fill="currentColor" />}
            </div>
            <div>
              <h3 className="font-black text-lg">{isAI ? 'AI 智慧解析成功' : '偵測到新委託'}</h3>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">{isAI ? 'AI Semantic Recognition' : 'Real-time Auto Sync'}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex gap-6">
            <div className="w-28 h-28 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
              {data.imageUrl ? (
                <img src={data.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                    <ShoppingBag size={32} className="text-slate-200" />
                    <span className="text-[8px] font-black text-slate-300 uppercase">No Image</span>
                </div>
              )}
            </div>
            <div className="space-y-3 py-1 flex-1">
              <div className="flex items-center gap-2 text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full w-fit">
                <User size={12} strokeWidth={3} />
                <span className="text-[11px] font-black tracking-tight">{data.buyerName}</span>
              </div>
              <h4 className="font-black text-slate-800 leading-tight text-lg line-clamp-2">{data.productName}</h4>
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase">數量</span>
                    <span className="text-sm font-black text-slate-700">x{data.requestedQuantity}</span>
                </div>
                {data.originalPriceJpy > 0 && (
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase">預估總額</span>
                    <span className="text-sm font-black text-indigo-600">NT$ {data.calculatedPrice.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {data.notes && (
            <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 flex gap-3 relative">
                <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 font-bold leading-relaxed italic">「 {data.notes} 」</p>
                <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[8px] font-black px-2 py-1 rounded-full">NOTE</div>
            </div>
          )}

          <div className="bg-indigo-50/30 p-5 rounded-[2rem] border border-indigo-100/50">
            <p className="text-[10px] font-bold text-indigo-400 text-center leading-relaxed px-4">
              {isAI ? '這是透過 AI 從文字中自動提取的資訊，' : '這是由買家填單自動回傳的資訊，'}<br/>
              匯入後您可以隨時修改細節。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={onCancel}
              className="py-5 rounded-3xl text-slate-400 font-black text-xs hover:bg-slate-50 transition-all active:scale-95"
            >
              忽略此單
            </button>
            <button
              onClick={() => onConfirm(data)}
              className="py-5 rounded-3xl bg-indigo-600 text-white font-black text-xs shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Check size={18} strokeWidth={3} />
              確認收單
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
