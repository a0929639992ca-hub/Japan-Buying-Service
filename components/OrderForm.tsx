import React, { useState, useRef } from 'react';
import { Plus, ShoppingBag, AlertCircle, Loader2, User, Image as ImageIcon, X, Sparkles } from 'lucide-react';
import { HIDDEN_EXCHANGE_RATE } from '../constants.ts';
import { OrderItem, OrderStatus } from '../types.ts';
import { analyzeProduct } from '../services/geminiService.ts';

interface OrderFormProps {
  onAddOrder: (order: OrderItem) => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ onAddOrder }) => {
  const [buyerName, setBuyerName] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estimatedTotal = price 
    ? Math.ceil(parseFloat(price) * parseFloat(qty) * HIDDEN_EXCHANGE_RATE) 
    : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
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
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ShoppingBag className="text-primary" size={24} strokeWidth={2.5} />
            快速委託
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-bold tracking-tight uppercase">New Purchase Order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Buyer Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text" required value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="買家姓名"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Product Details</label>
              <div className="flex gap-2">
                <input
                  type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="商品名稱"
                  className="flex-1 px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                />
                <button
                    type="button" onClick={handleSmartAnalyze}
                    disabled={(!name && !imageUrl) || isAnalyzing}
                    className="px-5 py-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl transition-all disabled:opacity-50"
                >
                    {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Price (JPY)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                  <input
                    type="number" required min="1" value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
                <input
                  type="number" required min="1" value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-bold text-center"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="space-y-2 h-full flex flex-col">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Product Photo</label>
              <div className="flex-1 min-h-[160px] relative">
                {imageUrl ? (
                  <div className="w-full h-full rounded-3xl overflow-hidden border border-gray-100 group relative">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setImageUrl('')}
                      className="absolute top-3 right-3 bg-white/80 backdrop-blur p-1.5 rounded-full text-rose-500 hover:bg-white transition-all shadow-sm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-300 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <ImageIcon size={40} strokeWidth={1.5} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Click to upload</span>
                  </button>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
              </div>
            </div>
          </div>
        </div>

        {analysisResult && (
             <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 text-sm text-indigo-900 animate-slide-in">
                <div className="font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertCircle size={14} className="text-indigo-500"/>
                    AI Analysis Result
                </div>
                <p className="whitespace-pre-line leading-relaxed">{analysisResult}</p>
             </div>
        )}

        <div className="bg-gray-900 text-white rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-gray-200">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Estimated Total Amount</p>
            <div className="text-3xl font-black tracking-tight">
               NT$ {estimatedTotal.toLocaleString()}
            </div>
          </div>
          <button
            type="submit"
            className="w-full md:w-auto bg-white text-gray-900 hover:bg-primary hover:text-white px-10 py-4 rounded-2xl font-black text-sm transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-white/5"
          >
            <Plus size={18} strokeWidth={3} />
            加入採購名單
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;