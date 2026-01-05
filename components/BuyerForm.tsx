import React, { useState, useRef } from 'react';
import { Send, Flower2, ShoppingBag, User, Image as ImageIcon, CheckCircle2, MessageSquareText, Share } from 'lucide-react';
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
    setSubmitted(true);
    
    // 雖然不同裝置 localStorage 不通，但保留此邏輯供同裝置測試
    const orderData: OrderItem = {
      id: `EXT-${Date.now()}`,
      buyerName,
      productName,
      imageUrl: imageUrl || undefined,
      originalPriceJpy: 0,
      requestedQuantity: parseInt(qty),
      purchasedQuantity: 0,
      calculatedPrice: 0,
      status: OrderStatus.PENDING,
      isPaid: false,
      notes: notes,
      createdAt: Date.now(),
    };
    const currentQueue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
    localStorage.setItem('rento_external_queue', JSON.stringify([...currentQueue, orderData]));
  };

  const handleShare = async () => {
    const shareText = `🌸 Rento 代購委託單\n------------------\n👤 買家：${buyerName}\n📦 商品：${productName}\n🔢 數量：${qty}\n📝 備註：${notes || '無'}\n------------------\n團長請確認報價！`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rento 代購委託',
          text: shareText,
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      // 不支援 Web Share API 時的備案（例如電腦版），直接開 Line 連結
      window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-8 animate-slide-in">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto relative">
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">委託單已就緒！</h2>
            <p className="text-sm text-gray-500 font-medium px-4">
              請點擊下方按鈕將資訊 <span className="text-primary font-bold">傳送給團長</span> 即可完成委託。
            </p>
          </div>
          
          <div className="space-y-3 px-4">
            <button 
              onClick={handleShare}
              className="w-full bg-[#06C755] text-white py-5 rounded-2xl font-black shadow-xl shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <Share size={20} />
              傳送給團長 (Line/分享)
            </button>
            <button 
              onClick={() => setSubmitted(false)}
              className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold text-sm"
            >
              返回修改內容
            </button>
          </div>
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Thank you for choosing Rento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-8 font-sans">
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-xl text-white">
              <Flower2 size={16} />
            </div>
            <h1 className="text-sm font-black text-gray-800 uppercase tracking-tighter">Rento 買家委託</h1>
          </div>
      </header>

      <main className="max-w-xl mx-auto p-5">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">您的稱呼 / Line ID</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="text" required value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="方便團長辨識您"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">想要代購的商品</label>
                <div className="relative">
                    <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                        type="text" required value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="請輸入商品名稱"
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">數量</label>
                    <input
                        type="number" required min="1" value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary/10 outline-none transition-all font-black text-center text-sm"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">商品照 (選填)</label>
                    <button
                        type="button" onClick={() => fileInputRef.current?.click()}
                        className={`w-full py-3.5 rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-2 ${imageUrl ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-300'}`}
                    >
                        <ImageIcon size={16} />
                        <span className="text-[10px] font-black">{imageUrl ? '已就緒' : '上傳照片'}</span>
                    </button>
                    <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">規格說明 (顏色/尺寸)</label>
                <div className="relative">
                  <MessageSquareText className="absolute left-4 top-4 text-gray-300" size={16} />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="例如：藍色 L 號，網址..."
                    rows={3}
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-5 rounded-2xl font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <Send size={18} />
              完成填單
            </button>
          </form>
        </div>
        
        <p className="text-center text-[9px] text-gray-300 mt-8 font-bold uppercase tracking-widest">Rento - Premium Japan Service</p>
      </main>
    </div>
  );
};

export default BuyerForm;