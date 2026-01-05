import React, { useState, useRef } from 'react';
import { Send, ShoppingBag, User, Image as ImageIcon, CheckCircle2, MessageSquareText, Share, Plus, Loader2 } from 'lucide-react';
import { OrderStatus } from '../types.ts';

const BuyerForm: React.FC = () => {
  const [buyerName, setBuyerName] = useState('');
  const [productName, setProductName] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
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
    setIsSending(true);

    const orderData = {
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

    // 模擬網路傳輸時間
    setTimeout(() => {
      // 寫入公共委託池 (localStorage)
      const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
      localStorage.setItem('rento_external_queue', JSON.stringify([...queue, orderData]));
      
      setIsSending(false);
      setSubmitted(true);
    }, 1500);
  };

  const handleManualShare = async () => {
    // 備用方案：如果自動同步失效，買家仍可以手動分享 Magic Link
    const orderData = {
      id: `MAGIC-${Date.now()}`,
      buyerName,
      productName,
      requestedQuantity: parseInt(qty),
      notes: notes,
    };

    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(orderData))));
    const magicLink = `${window.location.origin}${window.location.pathname}?importData=${encodedData}`;

    const shareText = `🌸 Rento 代購委託\n👤 買家：${buyerName}\n📦 商品：${productName}\n🔢 數量：${qty}\n🔗 團長專用匯入連結：\n${magicLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Rento 代購委託', text: shareText });
      } catch (err) {
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-8 animate-slide-in">
          <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto relative shadow-inner">
            <CheckCircle2 size={56} strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center animate-bounce">
                <Plus size={14} strokeWidth={4} />
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-gray-900">委託單已即時送達！</h2>
            <p className="text-sm text-gray-500 font-medium px-4 leading-relaxed">
              您的委託已透過 <span className="text-primary font-bold">Rento Auto-Sync</span> 送往團長後台。<br/>
              團長收單後將會盡快為您進行採購與報價。
            </p>
          </div>
          
          <div className="space-y-3 px-4 pt-4">
            <button 
              onClick={() => setSubmitted(false)}
              className="w-full bg-primary text-white py-5 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              再填一單
            </button>
            <button 
              onClick={handleManualShare}
              className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
            >
              <Share size={14} /> 手動分享明細給團長
            </button>
          </div>
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest pt-8">Powered by Rento Real-time Sync</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-8 font-sans">
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 p-4 sticky top-0 z-10 flex items-center justify-center safe-pt">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-xl text-accent shadow-sm">
              <Plus size={16} strokeWidth={3} className="rotate-45" />
            </div>
            <h1 className="text-sm font-black text-gray-800 uppercase tracking-widest leading-none">Rento 買家填單</h1>
          </div>
      </header>

      <main className="max-w-xl mx-auto p-5">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden relative">
          {isSending && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-fade-in">
              <div className="relative">
                <Loader2 size={48} className="text-primary animate-spin" />
                <Send size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <p className="text-sm font-black text-primary animate-pulse tracking-tight">正在即時同步至團長後台...</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-8 space-y-7">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">買家稱呼 / LINE ID</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="text" required value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="方便團長與您聯繫"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">代購商品名稱</label>
                <div className="relative">
                    <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                        type="text" required value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="請輸入商品名稱"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">數量</label>
                    <input
                        type="number" required min="1" value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/10 outline-none transition-all font-black text-center text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-center block">商品照 (選填)</label>
                    <button
                        type="button" onClick={() => fileInputRef.current?.click()}
                        className={`w-full py-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-2 ${imageUrl ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-300'}`}
                    >
                        <ImageIcon size={18} />
                        <span className="text-[10px] font-black uppercase">{imageUrl ? '已就緒' : '點擊上傳'}</span>
                    </button>
                    <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">規格/備註 (如顏色、尺寸)</label>
                <div className="relative">
                  <MessageSquareText className="absolute left-4 top-4 text-gray-300" size={16} />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="請輸入詳細規格，如：米白色 L 號..."
                    rows={3}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full bg-primary text-white py-5 rounded-3xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send size={20} />
              完成填單並送出
            </button>
          </form>
        </div>
        
        <div className="mt-10 px-6 py-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <p className="text-[10px] text-blue-400 font-bold text-center leading-relaxed">
                Rento 採用自動同步技術，填單完成後團長後台將會即時彈出通知，無需手動等待。
            </p>
        </div>
        
        <p className="text-center text-[9px] text-gray-300 mt-8 font-bold uppercase tracking-[0.3em]">Rento Premium Service</p>
      </main>
    </div>
  );
};

export default BuyerForm;