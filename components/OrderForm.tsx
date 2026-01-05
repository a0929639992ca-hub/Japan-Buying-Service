import React, { useState, useRef } from 'react';
import { Plus, AlertCircle, Loader2, Contact, Image as ImageIcon, X, Sparkles, ShoppingBag, Wand2 } from 'lucide-react';
import { calculateTwd } from '../constants.ts';
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
  const [aiWarning, setAiWarning] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estimatedTotal = price 
    ? calculateTwd(parseFloat(price) * parseFloat(qty))
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
      notes: aiWarning,
      createdAt: Date.now(),
    });

    setImageUrl('');
    setName('');
    setPrice('');
    setQty('1');
    setAiWarning('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSmartAnalyze = async () => {
    if (!name && !imageUrl) return;
    setIsAnalyzing(true);
    setAiWarning('');
    try {
        const result = await analyzeProduct(name, imageUrl);
        if (result) {
            // 自動填入邏輯
            if (result.suggestedName) setName(result.suggestedName);
            // 只有當價格未填寫，或原本價格為 0 時才覆蓋
            if (result.estimatedPriceJpy > 0 && (!price || price === '0')) {
                setPrice(result.estimatedPriceJpy.toString());
            }
            if (result.warnings) {
                setAiWarning(`⚠️ 注意：${result.warnings}`);
            }
        }
    } catch (e) { 
        console.error(e); 
        alert("分析失敗，請檢查網路連線");
    } finally { 
        setIsAnalyzing(false); 
    }
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
            <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">商品資訊</label>
                <button
                  type="button" onClick={handleSmartAnalyze}
                  disabled={(!name && !imageUrl) || isAnalyzing}
                  className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                  {isAnalyzing ? "AI 分析中..." : "AI 自動填寫"}
                </button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text" required value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="輸入關鍵字 (如: 吹風機) 後點 AI 按鈕"
                className="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-xs font-medium"
              />
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
                  placeholder="AI 可估價"
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

      {aiWarning && (
           <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-xs text-amber-800 animate-slide-in flex gap-2 items-start">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5"/>
              <p className="leading-relaxed opacity-90">{aiWarning}</p>
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