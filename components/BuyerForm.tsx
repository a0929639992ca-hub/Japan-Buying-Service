import React, { useState, useRef } from 'react';
import { Send, Flower2, ShoppingBag, User, Image as ImageIcon, X, CheckCircle2, MessageSquareText } from 'lucide-react';
import { OrderItem, OrderStatus } from '../types.ts';

const BuyerForm: React.FC = () => {
  const [buyerName, setBuyerName] = useState('');
  const [productName, setProductName] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const orderData: OrderItem = {
      id: `EXT-${Date.now()}`,
      buyerName,
      productName,
      imageUrl: imageUrl || undefined,
      originalPriceJpy: 0, // 價格留給代購主填寫
      requestedQuantity: parseInt(qty),
      purchasedQuantity: 0,
      calculatedPrice: 0,
      status: OrderStatus.PENDING,
      isPaid: false,
      notes: notes,
      createdAt: Date.now(),
    };

    // 模擬自動回傳：寫入公共暫存區
    const currentQueue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
    localStorage.setItem('rento_external_queue', JSON.stringify([...currentQueue, orderData]));
    
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl text-center space-y-8 border border-rose-100 animate-slide-in">
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner relative">
            <CheckCircle2 size={56} strokeWidth={2.5} />
            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">委託成功！</h2>
            <p className="text-gray-500 mt-3 font-medium leading-relaxed">
              您的代購請求已自動傳送給 <span className="text-primary font-bold">Rento 團長</span>。<br/>
              團長確認商品與價格後會再與您聯繫。
            </p>
          </div>
          
          <div className="pt-4">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black hover:bg-gray-800 transition-all shadow-xl"
            >
              填寫另一件商品
            </button>
          </div>
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Thank you for choosing Rento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50/50 pb-12 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-rose-100 p-6 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-2xl text-white shadow-lg shadow-primary/20">
              <Flower2 size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-800 leading-none">Rento 買家委託</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Direct Purchase Request</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 mt-4">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-rose-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">您的稱呼 / Line ID</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-200 group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text" required value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="方便團長辨識您的身份"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">商品名稱</label>
                <div className="relative group">
                    <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-200 group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text" required value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="請輸入商品完整名稱"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-sm"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">委託數量</label>
                    <input
                        type="number" required min="1" value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="w-full px-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-black text-center text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">商品照片 (選填)</label>
                    <button
                        type="button" onClick={() => fileInputRef.current?.click()}
                        className={`w-full py-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-2 ${imageUrl ? 'border-primary bg-primary/5 text-primary' : 'border-rose-100 text-rose-200 hover:border-primary/50'}`}
                    >
                        {imageUrl ? <ImageIcon size={18} /> : <ImageIcon size={18} />}
                        <span className="text-xs font-black">{imageUrl ? '照片已就緒' : '點擊上傳'}</span>
                    </button>
                    <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">備註 / 規格說明</label>
                <div className="relative group">
                  <MessageSquareText className="absolute left-4 top-4 text-rose-200 group-focus-within:text-primary transition-colors" size={18} />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="請輸入顏色、尺寸、網址或其他要求..."
                    rows={3}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-3xl border border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-6 rounded-[2rem] font-black shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Send size={22} />
              送出委託請求
            </button>
          </form>
        </div>
        
        <p className="text-center text-[10px] text-gray-300 mt-8 font-bold uppercase tracking-widest">Rento Buy Team - 讓日本代購變簡單</p>
      </main>
    </div>
  );
};

export default BuyerForm;