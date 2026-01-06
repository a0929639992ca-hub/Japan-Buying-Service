import React, { useState, useEffect, useRef } from 'react';
import { Send, ShoppingBag, User, Image as ImageIcon, CheckCircle2, MessageSquareText, Copy, Plus, Loader2, Info, CloudLightning, X, Trash2, Layers, Star, Store, Ban, ChevronRight, Lock, MapPin, AlertCircle } from 'lucide-react';
import { OrderStatus, OrderItem } from '../types.ts';
import { decodeConfig, initCloud, sendOrderToCloud, subscribeToConfig } from '../services/cloudService.ts';

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

const CATEGORIES = [
  { 
    name: 'UNIQLO', 
    logo: 'https://api.faviconkit.com/uniqlo.com/144', 
    type: 'uniqlo' 
  },
  { 
    name: 'GU', 
    logo: 'https://api.faviconkit.com/gu-global.com/144', 
    type: 'uniqlo' 
  },
  { 
    name: 'MUJI', 
    logo: 'https://api.faviconkit.com/muji.com/144', 
    type: 'shipping_alert' 
  },
  { 
    name: 'Donki唐吉訶德', 
    logo: 'https://api.faviconkit.com/donki.com/144', 
    type: 'law_alert' 
  },
  { 
    name: '3Coins', 
    logo: 'https://api.faviconkit.com/3coins.jp/144', 
    type: 'shipping_alert' 
  },
  { 
    name: 'Bic Camera', 
    logo: 'https://api.faviconkit.com/biccamera.com/144', 
    type: 'shipping_alert' 
  },
  { 
    name: '藥妝', 
    logo: 'https://api.faviconkit.com/matsukiyococokara-online.com/144', 
    type: 'law_alert' 
  },
  { 
    name: '伴手禮', 
    logo: 'https://cdn-icons-png.flaticon.com/512/3013/3013444.png', 
    type: 'normal' 
  },
];

const BuyerForm: React.FC = () => {
  const [buyerName, setBuyerName] = useState('');
  const [productName, setProductName] = useState('');
  const [shopInfo, setShopInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [itemCode, setItemCode] = useState('');
  const [itemSize, setItemSize] = useState('');
  const [itemColor, setItemColor] = useState('');
  const [itemGender, setItemGender] = useState('WOMEN');

  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [submitMode, setSubmitMode] = useState<'cloud' | 'manual'>('manual');
  const [cloudStoreId, setCloudStoreId] = useState<string>('');
  const [formConfig, setFormConfig] = useState<{ isFormActive: boolean; deadline: string }>({
    isFormActive: true,
    deadline: '2026.01.29 23:00'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectStr = params.get('connect');
    if (connectStr) {
      const decoded = decodeConfig(connectStr);
      if (decoded) {
        const success = initCloud(decoded.config);
        if (success) {
          setSubmitMode('cloud');
          setCloudStoreId(decoded.storeId);
          const unsubscribe = subscribeToConfig(decoded.storeId, (config) => setFormConfig(config));
          return () => unsubscribe();
        }
      }
    }
  }, []);

  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    setShopInfo(cat.name);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const addToCart = () => {
    if (!productName || !productName.trim()) {
        alert("請輸入商品名稱");
        return;
    }
    if (!qty || parseInt(qty) <= 0) {
        alert("請輸入數量");
        return;
    }

    let finalNotes = notes;
    if (shopInfo === 'UNIQLO' || shopInfo === 'GU') {
        if (!itemCode || itemCode.length !== 6) {
            alert("請輸入正確的 6 碼貨源碼");
            return;
        }
        finalNotes = `[${itemGender}] 貨源碼:${itemCode} / 尺寸:${itemSize || '未填'} / 顏色:${itemColor || '未填'} \n${notes}`;
    }
    
    const newItem: OrderItem = {
      id: `EXT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      buyerName: buyerName || '未知買家',
      productName,
      shopInfo: shopInfo || '',
      imageUrl: imageUrl || '',
      originalPriceJpy: 0,
      requestedQuantity: parseInt(qty),
      purchasedQuantity: 0,
      calculatedPrice: 0,
      status: OrderStatus.PENDING,
      isPaid: false,
      notes: finalNotes || '',
      createdAt: Date.now(),
    };

    setCart(prev => [...prev, newItem]);
    setProductName('');
    setShopInfo('');
    setQty('');
    setNotes('');
    setImageUrl('');
    setItemCode('');
    setItemSize('');
    setItemColor('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const handleBatchSubmit = async () => {
    if (!buyerName) { alert("請填寫您的暱稱"); return; }
    if (productName && !qty) { alert("請輸入數量"); return; }
    if (cart.length === 0 && !productName) { alert("請先加入至少一項商品"); return; }

    setIsSending(true);
    let finalCart = [...cart];
    
    if (productName && qty && parseInt(qty) > 0) {
         let currentFinalNotes = notes;
         if (shopInfo === 'UNIQLO' || shopInfo === 'GU') {
            currentFinalNotes = `[${itemGender}] 貨源碼:${itemCode} / 尺寸:${itemSize || '未填'} / 顏色:${itemColor || '未填'} \n${notes}`;
         }
         finalCart.push({
            id: `EXT-${Date.now()}`,
            buyerName,
            productName,
            shopInfo: shopInfo || '',
            imageUrl: imageUrl || '',
            originalPriceJpy: 0,
            requestedQuantity: parseInt(qty),
            purchasedQuantity: 0,
            calculatedPrice: 0,
            status: OrderStatus.PENDING,
            isPaid: false,
            notes: currentFinalNotes || '',
            createdAt: Date.now(),
         });
    }
    
    try {
        if (submitMode === 'cloud') {
            await Promise.all(finalCart.map(order => sendOrderToCloud(cloudStoreId, order)));
        } else {
            const secureData = btoa(unescape(encodeURIComponent(JSON.stringify(finalCart))));
            let itemsText = finalCart.map((item, idx) => `${idx + 1}. ${item.productName} (x${item.requestedQuantity})`).join('\n');
            const message = `🌸 Rento 代購委託單 (${finalCart.length}筆)\n------------------\n👤 買家：${buyerName}\n\n${itemsText}\n------------------\n📋 系統識別碼：\nRENTO_DATA::${secureData}::END\n------------------`;
            setGeneratedMessage(message);
        }
        
        setTimeout(() => { 
            setIsSending(false); 
            setSubmitted(true); 
            setCart([]); 
            setProductName('');
            setImageUrl('');
            setShopInfo('');
            setQty('');
        }, 800);
    } catch (err) {
        console.error("Submit error:", err);
        alert("傳送失敗，請檢查網路連線或聯絡團長");
        setIsSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8 font-sans text-center">
        <div className="max-w-md w-full space-y-8 animate-slide-in">
          <CheckCircle2 size={56} className="text-indigo-500 mx-auto" />
          <h2 className="text-2xl font-bold text-slate-900">{submitMode === 'cloud' ? '委託單已送達！' : '委託單已生成'}</h2>
          
          {submitMode === 'manual' && generatedMessage && (
            <div className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">請複製以下文字傳送給團長：</p>
              <pre className="text-[10px] whitespace-pre-wrap break-all bg-white p-3 rounded-xl border border-slate-200 text-slate-600 font-mono mb-3">
                {generatedMessage}
              </pre>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedMessage);
                  alert("已複製到剪貼簿！");
                }}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95"
              >
                <Copy size={14} /> 點擊複製
              </button>
            </div>
          )}

          <button onClick={() => { setSubmitted(false); setGeneratedMessage(''); }} className="w-full bg-slate-100 py-4 rounded-2xl font-bold text-sm text-slate-600">再填一筆委託</button>
        </div>
      </div>
    );
  }

  if (!formConfig.isFormActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-center">
         <div className="max-w-md w-full space-y-6 animate-slide-in">
            <Lock size={48} className="text-slate-300 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-800">代購表單目前關閉中</h2>
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
               <span className="text-xs font-bold text-slate-400 uppercase block mb-1">原定截單時間</span>
               <span className="text-lg font-bold text-slate-900">{formConfig.deadline}</span>
            </div>
         </div>
      </div>
    );
  }

  const isUniqloOrGu = shopInfo === 'UNIQLO' || shopInfo === 'GU';
  const showLawAlert = shopInfo === 'Donki唐吉訶德' || shopInfo === '藥妝';
  const showShippingAlert = shopInfo === 'Bic Camera' || shopInfo === '3Coins' || shopInfo === 'MUJI';

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
          <div className="safe-pt"></div>
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
                  <ShoppingBag size={18} strokeWidth={2.5} />
                </div>
                <h1 className="text-base font-bold text-slate-800">Rento 代購委託單</h1>
            </div>
          </div>
      </header>

      <main className="max-w-xl mx-auto p-5 space-y-6">
        
        <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-200 overflow-hidden relative">
             <div className="relative z-10 space-y-6">
                 <div>
                     <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">🇯🇵 佛系代購 <span className="text-amber-400">✨</span></h2>
                     <p className="text-sm text-slate-400 mt-2 font-medium">115.01.27 - 01.29 🇯🇵 希望能補貼一點旅費 ❤️</p>
                     <p className="text-[10px] text-indigo-400 font-bold mt-2 tracking-widest uppercase">截單時間：{formConfig.deadline}</p>
                 </div>

                 <div className="bg-slate-50 p-5 rounded-3xl space-y-4">
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Star size={14} className="text-amber-400 fill-amber-400"/> 代購匯率說明</h3>
                     <div className="grid grid-cols-1 gap-3">
                         <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                             <div className="text-sm font-medium text-slate-600">總額滿 <span className="font-bold text-slate-900">¥5500</span></div>
                             <div className="text-base font-bold text-indigo-600">× 0.23</div>
                         </div>
                         <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                             <div className="text-sm font-medium text-slate-600">總額未滿 ¥5500</div>
                             <div className="text-base font-bold text-indigo-600">× 0.24</div>
                         </div>
                     </div>
                 </div>
             </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">常用通路快速點選</label>
          <div className="grid grid-cols-4 gap-3">
              {CATEGORIES.map(cat => (
                  <button 
                    key={cat.name} 
                    onClick={() => handleCategorySelect(cat)}
                    className={`group flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active:scale-95 h-28 ${shopInfo === cat.name ? 'bg-indigo-50 border-indigo-600 shadow-md ring-2 ring-indigo-600/10' : 'bg-white border-slate-100'}`}
                  >
                      <div className="w-14 h-14 mb-2 flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm border border-slate-50 group-active:scale-90 p-2.5">
                        <img 
                          src={cat.logo} 
                          alt={cat.name} 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${cat.name}&background=f1f5f9&color=6366f1&bold=true`;
                          }}
                        />
                      </div>
                      <span className={`text-[9px] font-black text-center leading-tight tracking-tighter ${shopInfo === cat.name ? 'text-indigo-600' : 'text-slate-500'}`}>{cat.name}</span>
                  </button>
              ))}
          </div>
        </div>
        
        <div className="bg-white rounded-[2rem] p-7 shadow-sm border border-slate-200">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">您的聯絡資料</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text" value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="請輸入您的暱稱 (方便團長對帳)"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-semibold text-sm text-slate-800"
              />
            </div>
        </div>

        <div ref={formRef} className="bg-white rounded-[2.5rem] shadow-lg border border-slate-200 p-7 sm:p-9 space-y-7 relative">
          {(isSending || isCompressing) && (
              <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                <Loader2 size={32} className="text-indigo-600 animate-spin" />
                <p className="text-sm font-bold text-slate-600">{isCompressing ? '處理圖片中...' : '處理中...'}</p>
              </div>
          )}
          
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">委託商品資訊</label>

          <div className="space-y-5">
              <div className="relative">
                  <ShoppingBag className="absolute left-4 top-4 text-slate-300" size={18} />
                  <textarea
                      id="product-name-input"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="請輸入商品名稱"
                      rows={2}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-semibold text-sm text-slate-800 resize-none leading-relaxed"
                  />
              </div>

              <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                      type="text"
                      value={shopInfo}
                      onChange={(e) => setShopInfo(e.target.value)}
                      placeholder="購買地點 (選填)"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-semibold text-sm text-slate-800"
                  />
              </div>

              {showLawAlert && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 animate-slide-in">
                      <AlertCircle className="text-amber-500 shrink-0" size={18} />
                      <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                          因應日本法規，感冒藥及止痛藥或其他人氣商品一人限定購買一個。
                      </p>
                  </div>
              )}

              {showShippingAlert && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 animate-slide-in">
                      <Info className="text-blue-500 shrink-0" size={18} />
                      <p className="text-[11px] font-bold text-blue-800 leading-relaxed">
                          大型商品家電或佔重佔空間商品以及液體商品價格另計。
                      </p>
                  </div>
              )}

              {isUniqloOrGu && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-[2rem] p-6 space-y-4 animate-slide-in">
                      <div className="flex items-center gap-2 mb-2">
                        <Star size={14} className="text-indigo-500 fill-indigo-500" />
                        <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">服飾細節規格</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1">貨源碼 (6碼)</label>
                              <input 
                                type="text" maxLength={6} value={itemCode} onChange={e => setItemCode(e.target.value)} 
                                placeholder="例如: 456789"
                                className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold text-sm text-slate-800 border border-indigo-100 focus:border-indigo-400"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1">尺寸</label>
                              <input 
                                type="text" value={itemSize} onChange={e => setItemSize(e.target.value)} 
                                placeholder="如: M, XL, 24"
                                className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold text-sm text-slate-800 border border-indigo-100 focus:border-indigo-400"
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1">顏色</label>
                              <input 
                                type="text" value={itemColor} onChange={e => setItemColor(e.target.value)} 
                                placeholder="如: 09 BLACK"
                                className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold text-sm text-slate-800 border border-indigo-100 focus:border-indigo-400"
                              />
                          </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1">系列</label>
                        <select 
                            value={itemGender} onChange={e => setItemGender(e.target.value)}
                            className="w-full px-4 py-3 bg-white rounded-xl outline-none font-bold text-sm text-slate-800 border border-indigo-100 focus:border-indigo-400 appearance-none"
                        >
                            <option value="WOMEN">WOMEN</option>
                            <option value="MEN">MEN</option>
                            <option value="KIDS・TEEN">KIDS・TEEN</option>
                        </select>
                      </div>
                  </div>
              )}

              <div className="flex gap-4">
                  <div className="flex-1">
                      {imageUrl ? (
                        <div className="w-full h-36 rounded-2xl overflow-hidden border border-slate-100 relative group">
                            <img src={imageUrl} className="w-full h-full object-cover" />
                            <button onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-md"><X size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 flex flex-col items-center justify-center gap-2 group hover:bg-slate-100 transition-all">
                            <ImageIcon size={24} />
                            <span className="text-xs font-bold">上傳商品照</span>
                        </button>
                      )}
                      <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                  </div>
                  <div className="w-32 flex flex-col items-center justify-center gap-2 bg-slate-50 rounded-2xl p-4 border border-transparent focus-within:border-indigo-100">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">數量</label>
                      <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full bg-transparent outline-none font-bold text-3xl text-center text-indigo-600" placeholder="1" />
                  </div>
              </div>

              <div className="relative">
                  <MessageSquareText className="absolute left-4 top-4 text-slate-300" size={18} />
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="額外備註 (選填)..." rows={2} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-medium text-sm text-slate-700 resize-none" />
              </div>

              <button onClick={addToCart} className="w-full py-4 rounded-2xl font-bold text-sm border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2 transition-all active:scale-95">
                  <Plus size={18} strokeWidth={2.5} /> 新增下一項商品
              </button>
          </div>
        </div>
          
        {cart.length > 0 && (
           <div className="space-y-4 animate-slide-in">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2"><Layers size={14} /> 待傳送商品 ({cart.length})</h3>
              <div className="space-y-3">
                  {cart.map((item) => (
                      <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex gap-4 relative group">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                              {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><ShoppingBag size={20}/></div>}
                          </div>
                          <div className="flex-1 min-w-0 pr-10">
                              <h4 className="font-bold text-slate-800 text-sm truncate">{item.productName}</h4>
                              <p className="text-[10px] text-slate-400 truncate font-medium">{item.shopInfo || '不限通路'}</p>
                              <div className="mt-1"><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">x{item.requestedQuantity}</span></div>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 p-2 transition-colors"><Trash2 size={18} /></button>
                      </div>
                  ))}
              </div>
           </div>
        )}

        <div className="fixed bottom-6 left-5 right-5 z-40 max-w-xl mx-auto">
           <button onClick={handleBatchSubmit} disabled={isSending || isCompressing || (cart.length === 0 && !productName)} className={`w-full py-5 rounded-[2rem] font-bold text-sm shadow-2xl flex items-center justify-center gap-3 transition-all text-white active:scale-95 disabled:opacity-50 ${submitMode === 'cloud' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-slate-800 shadow-slate-300'}`}>
              {submitMode === 'cloud' ? <CloudLightning size={20} /> : <Send size={20} />}
              {cart.length > 0 ? `確認送出 ${cart.length + (productName ? 1 : 0)} 筆委託` : '確認並送出'}
              <ChevronRight size={18} />
            </button>
        </div>
        
        <p className="text-center mt-10 text-[11px] text-slate-400 font-bold uppercase tracking-widest opacity-40">
            Powered by Rento Smart Agent
        </p>
      </main>
    </div>
  );
};

export default BuyerForm;