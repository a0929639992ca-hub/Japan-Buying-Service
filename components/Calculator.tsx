import React, { useState, useEffect } from 'react';
import { HIDDEN_EXCHANGE_RATE } from '../constants';
import { Calculator as CalcIcon, RefreshCw, X } from 'lucide-react';

interface CalculatorProps {
  onClose?: () => void;
  isOpen?: boolean;
}

const Calculator: React.FC<CalculatorProps> = ({ onClose, isOpen }) => {
  const [jpyAmount, setJpyAmount] = useState<string>('');
  const [twdResult, setTwdResult] = useState<number | null>(null);

  useEffect(() => {
    const val = parseFloat(jpyAmount);
    if (!isNaN(val) && val >= 0) {
      // Logic using the hidden rate
      setTwdResult(Math.ceil(val * HIDDEN_EXCHANGE_RATE));
    } else {
      setTwdResult(null);
    }
  }, [jpyAmount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="bg-primary/10 p-4 flex justify-between items-center border-b border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <CalcIcon size={20} />
            <h3 className="font-bold text-lg">快速試算</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 block">輸入日幣金額 (JPY)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
              <input
                type="number"
                value={jpyAmount}
                onChange={(e) => setJpyAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-xl font-medium transition-all"
                placeholder="0"
                autoFocus
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-5 border border-primary/10 flex flex-col items-center justify-center gap-1">
            <span className="text-sm text-gray-500">預估代購台幣價格</span>
            <div className="text-4xl font-bold text-gray-800 tracking-tight flex items-baseline gap-1">
              <span className="text-lg text-gray-400 font-medium">NT$</span>
              {twdResult !== null ? twdResult.toLocaleString() : '0'}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              此價格已包含基礎匯率轉換<br/>運費與其他手續費另計
            </p>
          </div>

          <button 
            onClick={() => setJpyAmount('')}
            className="w-full py-2.5 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            清除重算
          </button>
        </div>
      </div>
    </div>
  );
};

export default Calculator;