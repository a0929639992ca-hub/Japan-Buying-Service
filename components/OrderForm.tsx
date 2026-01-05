import React, { useState, useRef } from 'react';
import { Plus, AlertCircle, Loader2, Contact, Image as ImageIcon, X, Sparkles, ShoppingBag } from 'lucide-react';
import { HIDDEN_EXCHANGE_RATE } from '../constants.ts';
import { OrderItem, OrderStatus } from '../types.ts';
import { analyzeProduct } from '../services/geminiService.ts';

interface OrderFormProps {
  onAddOrder: (order: OrderItem) => void;
}

// 圖片壓縮函式 (重複使用邏輯)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
            resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const OrderForm: React.FC<OrderFormProps> = ({ onAddOrder }) => {
  const [buyerName, setBuyerName] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estimatedTotal = price 
    ? Math.ceil(parseFloat(price) * parseFloat(qty) * HIDDEN_EXCHANGE_RATE) 
    : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        setImageUrl(compressed);
      } catch(e) {
        console.error(e);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !buyerName) return;

    onAddOrder({
      id: Date.now().toString(),
      buyerName,
      productName: name,
      imageUrl: imageUrl || undefined,
      originalPriceJpy: parseFloat(price),
      requestedQuantity: parseInt(qty),
      purchasedQuantity: 0,
      calculatedPrice: estimatedTotal,
      status: OrderStatus.PENDING,
      isPaid: false,
      notes: analysisResult,
      createdAt: Date.now(),
    });

    setImageUrl('');
    setName('');
    setPrice('');
    setQty('1');
    setAnalysisResult('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSmartAnalyze = async () => {
    if (!name && !imageUrl) return;
    setIsAnalyzing(true);
    try {
        const result = await analyzeProduct(name, imageUrl);
        setAnalysisResult(result);
    } catch (e) { console.error(e); } finally { setIsAnalyzing(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 animate-slide-in relative">
      {isCompressing && (
        <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-500" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">買家名稱</label>
            <div className="relative group">
              <Contact className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary" size={14} />
              <input
                type="text" required value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="輸入買家姓名或 ID"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">商品資訊</label>
            <div className="flex gap-2">
              <input
                type="text" required value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="商品完整名稱"
                className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium"
              />
              <button
                  type="button" onClick={handleSmartAnalyze}
                  disabled={(!name && !imageUrl) || isAnalyzing}
                  className="px-4 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all disabled:opacity-50"
              >
                  {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">價格 (JPY)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-xs">¥</span>
                <input
                  type="number" required min="1" value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-bold"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">數量</label>
              <input
                type="number" required min="1" value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-bold text-center"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 flex flex-col">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">商品預覽</label>
          <div className="flex-1 min-h-[120px] relative">
            {imageUrl ? (
              <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-100 group relative">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-rose-500 shadow-sm"><X size={14} /></button>
              </div>
            ) : (
              <button
                type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full h-full border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-gray-300 hover:text-primary hover:border-primary/50 transition-all"
              >
                <ImageIcon size={24} strokeWidth={1.5} />
                <span className="text-[9px] font-black uppercase tracking-widest">點擊上傳</span>
              </button>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
          </div>
        </div>
      </div>

      {analysisResult && (
           <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-900 animate-slide-in">
              <div className="font-black text-[9px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-indigo-500"/>
                  AI 分析建議
              </div>
              <p className="whitespace-pre-line leading-relaxed opacity-80 line-clamp-3">{analysisResult}</p>
           </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">預估總額</p>
          <div className="text-xl font-black text-gray-900 tracking-tight">NT$ {estimatedTotal.toLocaleString()}</div>
        </div>
        <button type="submit" disabled={isCompressing} className="bg-primary text-white hover:bg-primary/90 px-8 py-3.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50">
          <Plus size={16} strokeWidth={3} /> 加入名單
        </button>
      </div>
    </form>
  );
};

export default OrderForm;