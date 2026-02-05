import React, { useState, useEffect, useRef } from 'react';
import { Send, ShoppingBag, User, Image as ImageIcon, CheckCircle2, MessageSquareText, Plus, Loader2, Star, Lock, MapPin, ChevronRight, CloudLightning, X, Trash2, Layers, AlertCircle } from 'lucide-react';
import { OrderStatus, OrderItem } from '../types.ts';
import { decodeConfig, initCloud, sendOrderToCloud, subscribeToConfig } from '../services/cloudService.ts';
import { CATEGORIES } from '../constants.ts';

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
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
            resolve(event.target?.result as string);
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
  const [shopInfo, setShopInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState('1'); // 預設數量設為 1
  const [imageUrl, setImageUrl] = useState('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [itemCode, setItemCode] = useState('');
  const [itemSize, setItemSize] = useState('');
  const [itemColor, setItemColor] = useState('');
  const [itemGender, setItemGender] = useState('WOMEN');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [submitMode, setSubmitMode] = useState<'cloud' | 'manual'>('manual');
  const [cloudStoreId, setCloudStoreId] = useState<string>('');
  const [formConfig, setFormConfig] = useState<{ isFormActive: boolean; deadline: string }>({
    isFormActive: true,
    deadline: '2026.01.29 23:00'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const buyerNameSectionRef = useRef<HTMLDivElement>(null);
  const imageQtySectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectStr = params.get('connect');
    if (connectStr) {
      const decoded = decodeConfig(connectStr);
      if (decoded) {
        if (initCloud(decoded.config)) {
          setSubmitMode('cloud');
          setCloudStoreId(decoded.storeId);
          subscribeToConfig(decoded.storeId, (config) => setFormConfig(config));
        }
      }
    }
  }, []);

  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    setShopInfo(cat.name);
    // 延遲一下讓 React 渲染新欄位 (如 Uniqlo)，然後捲動到下一個邏輯區塊
    setTimeout(() => {
      if (cat.name === 'UNIQLO' || cat.name === 'GU') {
        const itemCodeInput = document.querySelector('input[placeholder*="6 位數字"]') as HTMLInputElement;
        if (itemCodeInput) {
            itemCodeInput.focus();
            itemCodeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        if (imageQtySectionRef.current) {
            imageQtySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressedDataUrl = await compressImage(file);
        setImageUrl(compressedDataUrl);
      } catch (err) { alert("圖片處理失敗"); } finally { setIsCompressing(false); }
    }
  };

  const createOrderItem = (): OrderItem | null => {
    if (!productName.trim()) { alert("請輸入商品名稱"); return null; }
    if (!qty || parseInt(qty) <= 0) { alert("請輸入數量"); return null; }
    
    let spec: OrderItem['spec'] = undefined;
    
    // 如果是 UNIQLO 或 GU，檢查並建立 spec 物件
    if (shopInfo === 'UNIQLO' || shopInfo === 'GU') {
        if (!itemCode || itemCode.length !== 6) { alert("請輸入 6 碼貨源碼"); return null; }
        spec = {
            gender: itemGender,
            code: itemCode,
            size: itemSize || '未填',
            color: itemColor || '未填'
        };
    }

    return {
      id: `EXT-${Date.now()}`,
      buyerName: buyerName || '新買家',
      productName,
      shopInfo: shopInfo || '',
      imageUrl,
      originalPriceJpy: 0,
      requestedQuantity: parseInt(qty),
      purchasedQuantity: 0,
      calculatedPrice: 0,
      status: OrderStatus.PENDING,
      isPaid: false,
      notes: notes,
      spec: spec, // 存入規格
      createdAt: Date.now(),
    };
  };

  const addToCart = () => {
    const newItem = createOrderItem();
    if (!newItem) return;

    setCart(prev => [...prev, newItem]);
    setProductName(''); setShopInfo(''); setQty('1'); setNotes(''); setImageUrl(''); setItemCode(''); setItemSize(''); setItemColor('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (navigator.vibrate) navigator.vibrate(40);
  };

  const handleBatchSubmit = async () => {
    if (!buyerName.trim()) { alert("請填寫您的暱稱"); return; }
    setIsSending(true);
    let finalCart = [...cart];
    
    // 如果表單上還有未加入購物車的資料，嘗試加入
    if (productName && qty) {
      const currentItem = createOrderItem();
      if (currentItem) {
          finalCart.push(currentItem);
      } else {
          setIsSending(false);
          return;
      }
    }

    if (finalCart.length === 0) { alert("請先填寫商品"); setIsSending(false); return; }

    try {
        if (submitMode === 'cloud') {
            await Promise.all(finalCart.map(o => sendOrderToCloud(cloudStoreId, o)));
        } else {
            const secureData = btoa(unescape(encodeURIComponent(JSON.stringify(finalCart))));
            const itemsSummary = finalCart.map((it, idx) => `${idx+1}. ${it.productName} (x${it.requestedQuantity})`).join('\n');
            const message = `🌸 れんと代購委託單\n👤 買家：${buyerName}\n\n${itemsSummary}\n\n📋 識別碼：\nRENTO_DATA::${secureData}::END`;
            navigator.clipboard.writeText(message);
        }
        setSubmitted(true);
    } catch (err) { alert("傳送失敗"); } finally { setIsSending(false); }
  };

  const getShopWarningMessage = () => {
    if (shopInfo === 'Donki' || shopInfo === '藥妝店') {
      return "因應日本法規，感冒藥及止痛藥或其他人氣商品一人限定購買一個";
    }
    if (shopInfo === 'Bic Camera' || shopInfo === '3Coins' || shopInfo === 'MUJI') {
      return "大型商品家電或佔重佔空間商品以及液體商品價格另計";
    }
    return null;
  };

  const warningMessage = getShopWarningMessage();

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center animate-slide-up">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-8"><CheckCircle2 size={40} className="text-indigo-600" /></div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">委託單已送出！</h2>
        <p className="text-slate-500 text-sm mb-12 font-medium">團長已經收到您的需求，請靜候對帳訊息。</p>
        <button onClick={() => window.location.reload()} className="w-full max-w-xs py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm active-scale shadow-xl shadow-indigo-100">再填一筆新訂單</button>
      </div>
    );
  }

  if (!formConfig.isFormActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10 text-center">
         <div className="max-w-md w-full space-y-8 animate-slide-up">
            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto"><Lock size={32} className="text-slate-400" /></div>
            <h2 className="text-2xl font-black text-slate-800">表單目前已暫停收件</h2>
            <div className="bg-white p-8 rounded-4xl border border-slate-200 premium-shadow">
               <span className="text-[10px] font-black text-slate-300 uppercase block mb-2 tracking-widest">截止時間已過</span>
               <span className="text-lg font-black text-slate-900">{formConfig.deadline}</span>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans selection:bg-indigo-100">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40">
          <div className="safe-pt"></div>
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-100"><ShoppingBag size={20} strokeWidth={2.5} /></div>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">れんと代購委託填單</h1>
            </div>
          </div>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-8">
        <div className="bg-white rounded-5xl p-8 premium-shadow border border-slate-200/50 overflow-hidden relative animate-slide-up">
             <div className="relative z-10 space-y-8">
                 <div>
                     <h2 className="text-3xl font-black text-slate-900 leading-tight">🇯🇵 日本佛系代購</h2>
                     <p className="text-sm text-slate-400 mt-3 font-semibold leading-relaxed">我們正在日本連線中，若有需求請盡快填單。感謝您的支持 ✨</p>
                     <div className="mt-5 inline-flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-xl"><span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span><span className="text-[10px] text-rose-600 font-black tracking-widest uppercase">截單時間：{formConfig.deadline}</span></div>
                 </div>
                 
                 <div className="bg-slate-50 p-6 rounded-4xl space-y-5 border border-slate-100 shadow-inner">
                     <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Star size={14} className="text-amber-400 fill-amber-400"/> 匯率說明</h3>
                     <div className="space-y-3">
                         <div className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-slate-50"><div className="text-sm font-bold text-slate-600">總金額滿 <span className="text-slate-900">¥5500</span></div><div className="text-base font-black text-indigo-600">優惠匯率 0.23</div></div>
                         <div className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-slate-50"><div className="text-sm font-bold text-slate-600">總金額未滿 ¥5500</div><div className="text-base font-black text-indigo-600">基本匯率 0.24</div></div>
                     </div>
                 </div>
             </div>
        </div>

        <div ref={buyerNameSectionRef} className="bg-white rounded-4xl p-8 premium-shadow border border-slate-200/50 transition-all focus-within:ring-4 focus-within:ring-indigo-50 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 block">聯絡資料</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input id="buyer-name-input" type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="您的暱稱 (方便對帳用)" className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-2xl outline-none font-bold text-base text-slate-800 focus:bg-white transition-all border border-transparent focus:border-slate-100" />
            </div>
        </div>

        <div className="bg-white rounded-5xl shadow-2xl border border-slate-200/50 p-8 sm:p-10 space-y-8 relative animate-slide-up" style={{ animationDelay: '0.3s' }}>
          {(isSending || isCompressing) && <div className="absolute inset-0 z-50 glass flex flex-col items-center justify-center space-y-4 rounded-5xl"><Loader2 size={36} className="text-indigo-600 animate-spin" /><p className="text-sm font-black text-slate-600">{isCompressing ? '正在最佳化圖片...' : '訂單傳送中...'}</p></div>}
          
          <div className="space-y-6">
              <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">委託商品名稱</label>
                  <div className="relative">
                      <ShoppingBag className="absolute left-5 top-5 text-slate-300" size={20} />
                      <textarea id="product-name-input" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="請貼上商品名稱或描述" rows={2} className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-3xl outline-none font-bold text-base text-slate-800 resize-none focus:bg-white transition-all border border-transparent focus:border-slate-100" />
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">購買通路 (選填)</label>
                      <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                          <input type="text" value={shopInfo} onChange={(e) => setShopInfo(e.target.value)} placeholder="例如：Uniqlo, 松本清..." className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-2xl outline-none font-bold text-base text-slate-800 focus:bg-white transition-all border border-transparent focus:border-slate-100" />
                      </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                      {CATEGORIES.map(cat => (
                          <button key={cat.name} onClick={() => handleCategorySelect(cat)} className={`group flex flex-col items-center justify-center p-2 rounded-2xl border transition-all active-scale h-24 ${shopInfo === cat.name ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-500/10' : 'bg-white border-slate-100 hover:border-indigo-100'}`} type="button">
                              <div className="w-10 h-10 mb-1.5 flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm border border-slate-50 relative">
                                {!brokenImages[cat.name] ? (
                                  <img src={cat.logo} alt={cat.name} className="max-w-full max-h-full object-contain p-1.5" onError={() => setBrokenImages(p => ({...p, [cat.name]: true}))} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: cat.color }}>{cat.initial}</div>
                                )}
                              </div>
                              <span className={`text-[9px] font-black text-center leading-tight tracking-tight truncate w-full ${shopInfo === cat.name ? 'text-indigo-600' : 'text-slate-400'}`}>{cat.name}</span>
                          </button>
                      ))}
                  </div>

                  {warningMessage && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
                      <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-amber-800 leading-relaxed">{warningMessage}</p>
                    </div>
                  )}
              </div>

              {(shopInfo.toUpperCase().includes('UNIQLO') || shopInfo.toUpperCase().includes('GU')) && (
                  <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-4xl p-7 space-y-6 animate-slide-up">
                      <div className="flex items-center gap-2.5"><Star size={16} className="text-indigo-500 fill-indigo-500" /><span className="text-[11px] font-black text-indigo-800 uppercase tracking-wider">服飾細節規格</span></div>
                      
                      <div className="flex gap-4">
                        <button type="button" onClick={() => setItemGender('WOMEN')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${itemGender === 'WOMEN' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100' : 'bg-white/50 text-slate-400'}`}>WOMEN</button>
                        <button type="button" onClick={() => setItemGender('MEN')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${itemGender === 'MEN' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100' : 'bg-white/50 text-slate-400'}`}>MEN</button>
                        <button type="button" onClick={() => setItemGender('KIDS')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${itemGender === 'KIDS' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100' : 'bg-white/50 text-slate-400'}`}>KIDS</button>
                        <button type="button" onClick={() => setItemGender('BABY')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${itemGender === 'BABY' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100' : 'bg-white/50 text-slate-400'}`}>BABY</button>
                      </div>

                      <div className="grid grid-cols-1 gap-5">
                          <div className="space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">6 碼貨源碼</label><input type="text" maxLength={6} value={itemCode} onChange={e => setItemCode(e.target.value)} placeholder="商品標籤上的 6 位數字" className="w-full px-5 py-4 bg-white rounded-2xl border border-indigo-100 font-bold focus:ring-4 focus:ring-indigo-100 outline-none" /></div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">尺寸</label><input type="text" value={itemSize} onChange={e => setItemSize(e.target.value)} placeholder="M, XL, 25cm" className="w-full px-5 py-4 bg-white rounded-2xl border border-indigo-100 font-bold" /></div>
                              <div className="space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">顏色</label><input type="text" value={itemColor} onChange={e => setItemColor(e.target.value)} placeholder="如: 09 Black" className="w-full px-5 py-4 bg-white rounded-2xl border border-indigo-100 font-bold" /></div>
                          </div>
                      </div>
                  </div>
              )}

              <div className="flex gap-5 h-44" ref={imageQtySectionRef}>
                  <div className="flex-1">
                      {imageUrl ? (
                        <div className="w-full h-full rounded-3xl overflow-hidden border border-slate-100 relative group"><img src={imageUrl} className="w-full h-full object-cover" /><button onClick={() => setImageUrl('')} className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full backdrop-blur-md active-scale"><X size={16} /></button></div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="w-full h-full rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 flex flex-col items-center justify-center gap-3 hover:bg-slate-100 transition-all active-scale"><ImageIcon size={28} /><span className="text-xs font-black">上傳商品參考圖</span></button>
                      )}
                      <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                  </div>
                  <div className="w-36 flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-3xl border border-slate-100">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">數量</label>
                    <input type="number" step="1" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full bg-transparent outline-none font-black text-4xl text-center text-indigo-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="1" />
                    <div className="flex gap-4">
                      <button onClick={() => setQty(prev => Math.max(1, parseInt(prev || '1') - 1).toString())} className="p-1 text-slate-300 hover:text-indigo-600 active:scale-90 transition-all"><X size={16} className="rotate-45" style={{ transform: 'rotate(0deg)' }} /></button>
                      <button onClick={() => setQty(prev => (parseInt(prev || '0') + 1).toString())} className="p-1 text-slate-300 hover:text-indigo-600 active:scale-90 transition-all"><Plus size={16} /></button>
                    </div>
                  </div>
              </div>

              <div className="relative">
                <MessageSquareText className="absolute left-5 top-5 text-slate-300" size={20} />
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="額外備註 (顏色、規格、急用與否...)" rows={2} className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-3xl outline-none font-bold text-sm text-slate-700 resize-none focus:bg-white transition-all border border-transparent focus:border-slate-100" />
              </div>

              <button onClick={addToCart} className="w-full py-5 rounded-2xl font-black text-sm border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-3 transition-all active-scale"><Plus size={20} strokeWidth={3} /> 加入下一項委託</button>
          </div>
        </div>
          
        {cart.length > 0 && (
           <div className="space-y-5 animate-slide-up">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2"><Layers size={14} /> 待傳送清單 ({cart.length})</h3>
              <div className="space-y-4">
                  {cart.map((item) => (
                      <div key={item.id} className="bg-white p-5 rounded-4xl border border-slate-200 premium-shadow flex gap-5 relative animate-slide-up">
                          <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-50">{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><ShoppingBag size={24}/></div>}</div>
                          <div className="flex-1 min-w-0 pr-12">
                            <h4 className="font-bold text-slate-800 text-base truncate">{item.productName}</h4>
                            <p className="text-xs text-slate-400 mt-1 font-medium">{item.shopInfo || '隨機通路'}</p>
                            <div className="mt-3"><span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">數量 x{item.requestedQuantity}</span></div>
                          </div>
                          <button onClick={() => setCart(c => c.filter(i => i.id !== item.id))} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 p-3 transition-colors active-scale"><Trash2 size={20} /></button>
                      </div>
                  ))}
              </div>
           </div>
        )}

        <div className="fixed bottom-8 left-6 right-6 z-40 max-w-xl mx-auto">
            <button onClick={handleBatchSubmit} disabled={isSending || isCompressing || (cart.length === 0 && !productName)} className={`w-full py-6 rounded-3xl font-black text-sm shadow-2xl flex items-center justify-center gap-3 transition-all text-white active-scale disabled:opacity-50 ${submitMode === 'cloud' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-slate-900 shadow-slate-200'}`}>
                {submitMode === 'cloud' ? <CloudLightning size={22} /> : <Send size={22} />}
                {cart.length > 0 ? `確認送出 ${cart.length + (productName ? 1 : 0)} 筆委託單` : '確認並傳送'}
                <ChevronRight size={20} />
            </button>
        </div>
        
        <p className="text-center mt-12 mb-8 text-[11px] text-slate-300 font-black uppercase tracking-widest opacity-60">
            Powered by れんと代購 Smart Engine
        </p>
      </main>
    </div>
  );
};

export default BuyerForm;