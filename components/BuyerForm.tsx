import React, { useState, useEffect, useRef } from 'react';
import { Send, ShoppingBag, User, Image as ImageIcon, CheckCircle2, MessageSquareText, Copy, Plus, Loader2, Info, CloudLightning, Link2, X } from 'lucide-react';
import { OrderStatus } from '../types.ts';
import { decodeConfig, initCloud, sendOrderToCloud } from '../services/cloudService.ts';

// 圖片壓縮函式
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
        
        // 限制最大寬高為 800px，大幅減少體積
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
            // 輸出為 JPEG，品質 0.6 (60%)
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
            resolve(event.target?.result as string); // Fallback
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const BuyerForm: React.FC = () => {
  const [buyerName, setBuyerName] = useState('');
  const [productName, setProductName] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressedDataUrl = await compressImage(file);
        setImageUrl(compressedDataUrl);
      } catch (err) {
        console.error("Image compression failed", err);
        alert("圖片處理失敗，請試著換一張圖");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || parseInt(qty) <= 0) {
        alert("請輸入正確的購買數量");
        return;
    }
    setIsSending(true);

    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // 組合備註與商品名稱，如果有網址習慣放在備註或名稱中
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

  const resetForm = () => {
      setProductName('');
      setQty(''); // 重置為空
      setNotes('');
      setImageUrl('');
      setSubmitted(false);
      // buyerName 通常保留，方便填下一單
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
                  onClick={resetForm}
                  className="w-full bg-gray-50 text-gray-600 hover:bg-gray-100 py-4 rounded-[2rem] font-bold text-xs border border-transparent transition-colors"
                >
                  再填一筆
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-8 font-sans">
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40 shadow-sm">
          <div className="safe-pt"></div>
          <div className="p-4 flex items-center justify-center relative">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-xl text-white shadow-sm shadow-indigo-200">
                  <ShoppingBag size={16} strokeWidth={3} />
                </div>
                <h1 className="text-sm font-black text-gray-800 uppercase tracking-widest leading-none">Rento 代購委託單</h1>
            </div>
            {submitMode === 'cloud' && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <CloudLightning size={10} fill="currentColor" />
                    <span className="text-[9px] font-black uppercase">Online</span>
                </div>
            )}
          </div>
      </header>

      <main className="max-w-xl mx-auto p-5">
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white overflow-hidden relative">
          {(isSending || isCompressing) && (
            <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <Loader2 size={48} className="text-indigo-600 animate-spin relative" />
              </div>
              <p className="text-sm font-black text-indigo-900 animate-pulse tracking-tight">
                  {isCompressing ? '正在處理圖片...' : (submitMode === 'cloud' ? '正在傳送至雲端...' : '正在建立委託單...')}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            
            {/* Section 1: Buyer Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                 <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">您的資料</h3>
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input
                  type="text" required value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="請輸入您的暱稱 (方便團長辨認)"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-bold text-sm text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
                />
              </div>
            </div>

            {/* Section 2: Product Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                 <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">商品詳情</h3>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                    <Link2 className="absolute left-4 top-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <textarea
                        required value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="請輸入商品名稱，或是直接貼上網址..."
                        rows={2}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-bold text-sm text-slate-800 placeholder:text-slate-400 placeholder:font-medium resize-none leading-relaxed"
                    />
                </div>

                <div className="flex gap-4">
                   {/* 圖片上傳區 */}
                   <div className="flex-1 relative">
                        {imageUrl ? (
                           <div className="w-full h-32 rounded-2xl overflow-hidden border-2 border-indigo-100 relative group">
                               <img src={imageUrl} className="w-full h-full object-cover" />
                               <button 
                                 type="button" 
                                 onClick={() => { setImageUrl(''); if(fileInputRef.current) fileInputRef.current.value=''; }}
                                 className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm hover:bg-rose-500 transition-colors"
                               >
                                 <X size={14} />
                               </button>
                           </div>
                        ) : (
                           <button
                             type="button" onClick={() => fileInputRef.current?.click()}
                             className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-500 text-slate-400 transition-all flex flex-col items-center justify-center gap-2 group"
                           >
                               <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                                  <ImageIcon size={20} />
                               </div>
                               <span className="text-[10px] font-black uppercase tracking-wide">上傳照片</span>
                           </button>
                        )}
                        <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                   </div>

                   {/* 數量輸入 */}
                   <div className="w-28 flex flex-col gap-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">購買數量</label>
                       <input
                           type="number" required min="1" value={qty}
                           onChange={(e) => setQty(e.target.value)}
                           placeholder="0"
                           className="w-full h-full px-2 py-2 bg-slate-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-black text-2xl text-center text-indigo-600 placeholder:text-slate-200"
                       />
                   </div>
                </div>

                <div className="relative group">
                  <MessageSquareText className="absolute left-4 top-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`規格備註 (選填)\n例如：顏色 白色、尺寸 M 號...`}
                    rows={3}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all font-medium text-sm text-slate-700 placeholder:text-slate-400 resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending || isCompressing}
              className={`w-full text-white py-5 rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 hover:shadow-2xl hover:-translate-y-1 ${submitMode === 'cloud' ? 'bg-indigo-600 shadow-indigo-200 hover:shadow-indigo-300' : 'bg-slate-800 shadow-slate-300 hover:shadow-slate-400'}`}
            >
              {submitMode === 'cloud' ? <CloudLightning size={20} className={isSending ? "animate-pulse" : ""} /> : <Send size={20} />}
              {submitMode === 'cloud' ? '確認送出 (雲端連線)' : '產生委託單'}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-60">
            Powered by Rento Smart
        </p>
      </main>
    </div>
  );
};

export default BuyerForm;