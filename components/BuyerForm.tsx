import React, { useState, useRef } from 'react';
import { Send, Flower2, PackagePlus, User, Image as ImageIcon, X, CheckCircle2, Copy } from 'lucide-react';
import { HIDDEN_EXCHANGE_RATE } from '../constants.ts';
import { OrderItem, OrderStatus } from '../types.ts';

const BuyerForm: React.FC = () => {
  const [buyerName, setBuyerName] = useState('');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [magicLink, setMagicLink] = useState('');
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
      id: Date.now().toString(),
      buyerName,
      productName,
      imageUrl: imageUrl || undefined,
      originalPriceJpy: parseFloat(price),
      requestedQuantity: parseInt(qty),
      purchasedQuantity: 0,
      calculatedPrice: Math.ceil(parseFloat(price) * parseInt(qty) * HIDDEN_EXCHANGE_RATE),
      status: OrderStatus.PENDING,
      isPaid: false,
      createdAt: Date.now(),
    };

    // 生成 Base64 加密連結
    const encoded = btoa(JSON.stringify(orderData));
    const url = `${window.location.origin}${window.location.pathname}?importData=${encoded}`;
    setMagicLink(url);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center space-y-6 border border-rose-100 animate-slide-in">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">委託單已產生！</h2>
            <p className="text-gray-400 mt-2 font-medium">請點擊下方按鈕複製連結，並將其傳送給 Rento 代購團長即可完成委託。</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-[10px] break-all text-gray-400 font-mono line-clamp-2">
            {magicLink}
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(magicLink);
              alert('魔法連結已複製！快去傳給團長吧！');
            }}
            className="w-full bg-primary text-white py-5 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Copy size={20} />
            複製連結並傳送
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="text-sm text-gray-400 font-bold hover:text-primary transition-colors"
          >
            再填一筆委託單
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50/50 pb-12 font-sans">
      <header className="bg-white border-b border-rose-100 p-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-xl text-white">
            <Flower2 size={20} />
          </div>
          <h1 className="text-lg font-black text-gray-800">Rento 買家填單助手</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 mt-4">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-rose-100 overflow-hidden">
          <div className="p-8 bg-gradient-to-br from-rose-50 to-white border-b border-rose-50">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <PackagePlus size={24} className="text-primary" />
              填寫委託商品
            </h2>
            <p className="text-xs text-gray-400 font-bold mt-1">請填寫詳細資訊，以便代購快速為您處理。</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">您的稱呼</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-200" size={18} />
                <input
                  type="text" required value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="請輸入您的姓名或暱稱"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">商品名稱</label>
              <input
                type="text" required value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="例如：日本限定 櫻花保溫瓶"
                className="w-full px-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">日幣價格 (JPY)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold">¥</span>
                  <input
                    type="number" required min="1" value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">委託數量</label>
                <input
                  type="number" required min="1" value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold text-center text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">上傳商品照片 (可選)</label>
              <div className="relative h-40">
                {imageUrl ? (
                  <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-100 group">
                    <img src={imageUrl} className="w-full h-full object-cover" />
                    <button onClick={() => setImageUrl('')} className="absolute top-3 right-3 bg-white/80 p-1.5 rounded-full text-rose-500 shadow-sm"><X size={16}/></button>
                  </div>
                ) : (
                  <button
                    type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full border-2 border-dashed border-rose-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-rose-200 hover:text-primary hover:border-primary/50 transition-all"
                  >
                    <ImageIcon size={32} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold">點擊上傳商品照片</span>
                  </button>
                )}
                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:bg-primary/90 transition-all transform active:scale-[0.98]"
            >
              <Send size={20} />
              產生委託連結
            </button>
          </form>
        </div>
        
        <p className="text-center text-[10px] text-gray-300 mt-8 font-bold uppercase tracking-widest">Powered by Rento Buy Team</p>
      </main>
    </div>
  );
};

export default BuyerForm;