import React, { useState, useRef } from 'react';
import { Send, ShoppingBag, User, Image as ImageIcon, CheckCircle2, MessageSquareText, Share, Plus, Loader2, Copy, Check } from 'lucide-react';
import { OrderStatus } from '../types.ts';

const BuyerForm: React.FC = () => {
  const [buyerName, setBuyerName] = useState('');
  const [productName, setProductName] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastMagicLink, setLastMagicLink] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generateMagicLink = (data: any) => {
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    return `${window.location.origin}${window.location.pathname}?importData=${encodedData}`;
  };

  const handleCopyCode = () => {
    if (!lastMagicLink) return;
    try {
      const textArea = document.createElement("textarea");
      textArea.value = lastMagicLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('複製失敗，請手動選取連結。');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderData = {
      id: `EXT-${Date.now()}-${randomSuffix}`,
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

    const magicLink = generateMagicLink(orderData);
    setLastMagicLink(magicLink);

    setTimeout(() => {
      // 1. 同步至 LocalStorage
      const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
      localStorage.setItem('rento_external_queue', JSON.stringify([...queue, orderData]));
      
      // 2. 嘗試自動複製 (雖然 iOS 之後可能會攔截，但第一次通常會成功)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = magicLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {}
      
      setIsSending(false);
      setSubmitted(true);
    }, 1200);
  };

  const handleManualShare = async () => {
    const shareText = `🌸 Rento 代購委託單\n👤 買家：${buyerName}\n📦 商品：${productName}\n🔢 數量：${qty}\n🔗 匯入連結：\n${lastMagicLink}`;
    
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
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center animate-bounce shadow-lg">
                <Plus size={16} strokeWidth={4} />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900">委託單已就緒</h2>
            <div className="bg-indigo-50/50 p-5 rounded-[2rem] border border-indigo-100 flex flex-col items-center gap-3">
                <p className="text-sm text-indigo-700 font-bold leading-relaxed px-4">
                    請點擊下方按鈕複製代碼，並切換回團長 App，系統將會立即感應收單。
                </p>
                <button 
                  onClick={handleCopyCode}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all ${copied ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-100'}`}
                >
                  {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
                  {copied ? '代碼已複製' : '點此複製代碼'}
                </button>
            </div>
          </div>
          
          <div className="space-y-3 px-4 pt-4">
            <button 
              onClick={handleManualShare}
              className="w-full bg-[#06C755] text-white py-5 rounded-[2rem] font-black shadow-xl shadow-green-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <Share size={20} />
              傳送給團長 (Line)
            </button>
            <button 
              onClick={() => setSubmitted(false)}
              className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold text-xs"
            >
              再填一筆委託
            </button>
          </div>
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest pt-8">Powered by Rento Clipboard Sync</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-8 font-sans">
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
          <div className="safe-pt"></div>
          <div className="p-4 flex items-center justify-center">
            <div className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded-xl text-accent shadow-sm">
                <Plus size={16} strokeWidth={3} className="rotate-45" />
                </div>
                <h1 className="text-sm font-black text-gray-800 uppercase tracking-widest leading-none">Rento 買家填單</h1>
            </div>
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
              <p className="text-sm font-black text-primary animate-pulse tracking-tight">正在準備同步代碼...</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-8 space-y-7">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">您的稱呼</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    type="text" required value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="方便團長辨認"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">代購商品</label>
                <div className="relative">
                    <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                        type="text" required value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="請輸入商品名稱"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-sm"
                    />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center block">數量</label>
                    <input
                        type="number" required min="1" value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-primary/5 outline-none transition-all font-black text-center text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center block">商品照 (選填)</label>
                    <button
                        type="button" onClick={() => fileInputRef.current?.click()}
                        className={`w-full py-4 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-2 ${imageUrl ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-300'}`}
                    >
                        <ImageIcon size={20} />
                        <span className="text-[10px] font-black uppercase">{imageUrl ? '已就緒' : '點擊上傳'}</span>
                    </button>
                    <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">規格說明 (顏色/尺寸)</label>
                <div className="relative">
                  <MessageSquareText className="absolute left-4 top-4 text-gray-300" size={18} />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="例如：米白色 M 號，網址..."
                    rows={3}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full bg-primary text-white py-5 rounded-[2rem] font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send size={20} />
              確認委託並自動同步
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BuyerForm;