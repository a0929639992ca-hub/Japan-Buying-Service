import React, { useState, useEffect, useRef } from 'react';
import { Send, ShoppingBag, User, Image as ImageIcon, CheckCircle2, MessageSquareText, Copy, Plus, Loader2, Info, CloudLightning } from 'lucide-react';
import { OrderStatus } from '../types.ts';
import { decodeConfig, initCloud, sendOrderToCloud } from '../services/cloudService.ts';

const BuyerForm: React.FC = () => {
  const [buyerName, setBuyerName] = useState('');
  const [productName, setProductName] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // 模式：cloud (直連) 或 manual (複製代碼)
  const [submitMode, setSubmitMode] = useState<'cloud' | 'manual'>('manual');
  const [cloudStoreId, setCloudStoreId] = useState<string>('');
  const [generatedMessage, setGeneratedMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 檢查 URL 是否包含雲端連線字串
    const params = new URLSearchParams(window.location.search);
    const connectStr = params.get('connect');
    if (connectStr) {
      const decoded = decodeConfig(connectStr);
      if (decoded) {
        // 初始化雲端
        const success = initCloud(decoded.config);
        if (success) {
          setSubmitMode('cloud');
          setCloudStoreId(decoded.storeId);
        }
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    // 如果是 Cloud 模式，ID 格式可以更簡單，但保持一致
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

    try {
        if (submitMode === 'cloud') {
            // 雲端直送模式
            await sendOrderToCloud(cloudStoreId, orderData);
            // 成功後只需顯示簡單確認
        } else {
            // 降級模式：產生代碼
            const secureData = btoa(unescape(encodeURIComponent(JSON.stringify(orderData))));
            const message = `🌸 Rento 代購委託單\n------------------\n👤 買家：${buyerName}\n📦 商品：${productName}\n🔢 數量：x${qty}\n📝 備註：${notes || '無'}\n------------------\n📋 系統識別碼 (請勿刪除)：\nRENTO_DATA::${secureData}::END\n------------------`;
            setGeneratedMessage(message);
        }
        
        setTimeout(() => {
            setIsSending(false);
            setSubmitted(true);
        }, 800);
        
    } catch (err) {
        console.error(err);
        alert("傳送失敗，請重試");
        setIsSending(false);
    }
  };

  const handleCopyAndOpenLine = () => {
     if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(generatedMessage).then(() => {
            window.location.href = 'line://msg/text/';
        }).catch(() => {});
     }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-8 animate-slide-in">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto relative shadow-inner">
            <CheckCircle2 size={56} strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center animate-bounce shadow-lg">
                <Plus size={16} strokeWidth={4} />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900">
                {submitMode === 'cloud' ? '委託單已送達！' : '委託單已生成'}
            </h2>
            
            {submitMode === 'cloud' ? (
                 <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100 flex flex-col items-center gap-3">
                    <CloudLightning size={24} className="text-emerald-500" />
                    <p className="text-sm text-emerald-800 font-bold leading-relaxed px-4">
                        雲端傳送成功！<br/>
                        團長的手機已經收到通知了。
                    </p>
                 </div>
            ) : (
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 text-left">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Message Preview</p>
                    <div className="text-xs text-slate-600 font-medium leading-relaxed font-mono whitespace-pre-wrap break-all bg-white p-3 rounded-xl border border-slate-100 h-32 overflow-y-auto">
                        {generatedMessage}
                    </div>
                    <div className="mt-4 flex justify-center">
                         <button onClick={handleCopyAndOpenLine} className="bg-[#06C755] text-white py-3 px-6 rounded-xl font-black text-xs shadow-lg shadow-green-100 flex items-center gap-2">
                            <Copy size={14}/> 複製傳給團長
                         </button>
                    </div>
                </div>
            )}
          </div>
          
          <div className="space-y-3 px-4 pt-2">
            <button 
                  onClick={() => setSubmitted(false)}
                  className="w-full bg-gray-50 text-gray-600 hover:bg-gray-100 py-4 rounded-[2rem] font-bold text-xs border border-transparent"
                >
                  再填一筆
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-8 font-sans">
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
          <div className="safe-pt"></div>
          <div className="p-4 flex items-center justify-center relative">
            <div className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded-xl text-accent shadow-sm">
                <Plus size={16} strokeWidth={3} className="rotate-45" />
                </div>
                <h1 className="text-sm font-black text-gray-800 uppercase tracking-widest leading-none">Rento 買家填單</h1>
            </div>
            {submitMode === 'cloud' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                    <CloudLightning size={12} fill="currentColor" />
                    <span className="text-[9px] font-black uppercase">Live</span>
                </div>
            )}
          </div>
      </header>

      <main className="max-w-xl mx-auto p-5">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden relative">
          {isSending && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-fade-in">
              <div className="relative">
                <Loader2 size={48} className="text-primary animate-spin" />
              </div>
              <p className="text-sm font-black text-primary animate-pulse tracking-tight">
                  {submitMode === 'cloud' ? '正在雲端傳送中...' : '正在產生委託單...'}
              </p>
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
              className={`w-full text-white py-5 rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 ${submitMode === 'cloud' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-primary shadow-primary/20'}`}
            >
              {submitMode === 'cloud' ? <CloudLightning size={20}/> : <Send size={20} />}
              {submitMode === 'cloud' ? '送出訂單 (雲端直達)' : '產生委託單 (傳給團長)'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BuyerForm;