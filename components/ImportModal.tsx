import React from 'react';
import { OrderItem } from '../types.ts';
import { Package, X, Check, JapaneseYen, User, ShoppingBag } from 'lucide-react';

interface ImportModalProps {
  data: OrderItem;
  onConfirm: (order: OrderItem) => void;
  onCancel: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ data, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-in">
        <div className="p-8 bg-indigo-50 flex justify-between items-center border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-xl text-white">
              <Package size={22} />
            </div>
            <div>
              <h3 className="font-black text-gray-900">偵測到新委託單</h3>
              <p className="text-[10px] text-indigo-400 font-bold uppercase">External Request Found</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex gap-4">
            <div className="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
              {data.imageUrl ? (
                <img src={data.imageUrl} className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag size={24} className="text-gray-200" />
              )}
            </div>
            <div className="space-y-2 py-1">
              <div className="flex items-center gap-2 text-indigo-500">
                <User size={14} />
                <span className="text-sm font-black">{data.buyerName}</span>
              </div>
              <h4 className="font-bold text-gray-800 leading-tight">{data.productName}</h4>
              <div className="flex items-center gap-3 text-xs text-gray-400 font-bold">
                <span className="flex items-center gap-1 text-gray-700">¥ {data.originalPriceJpy.toLocaleString()}</span>
                <span>x {data.requestedQuantity}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">日幣總計</span>
              <span className="font-bold text-gray-700">¥ {(data.originalPriceJpy * data.requestedQuantity).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">預估台幣 (已包含匯率)</span>
              <span className="text-xl font-black text-primary">NT$ {data.calculatedPrice.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={onCancel}
              className="py-4 rounded-2xl text-gray-400 font-black text-sm hover:bg-gray-50 transition-all border border-gray-100"
            >
              忽略
            </button>
            <button
              onClick={() => onConfirm(data)}
              className="py-4 rounded-2xl bg-indigo-500 text-white font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} strokeWidth={3} />
              匯入代購單
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;