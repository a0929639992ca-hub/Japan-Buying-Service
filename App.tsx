import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { OrderItem, OrderStatus } from './types.ts';
import Calculator from './components/Calculator.tsx';
import OrderForm from './components/OrderForm.tsx';
import OrderList from './components/OrderList.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import BuyerForm from './components/BuyerForm.tsx';
import { parseOrderFromText } from './services/geminiService.ts';
import { initCloud, subscribeToInbox, encodeConfig, FirebaseConfig, removeOrderFromInbox, updateStoreConfig, subscribeToConfig } from './services/cloudService.ts';
import { COST_EXCHANGE_RATE } from './constants.ts';
import { Search, Calculator as CalcIcon, Share2, Plus, ChevronUp, ChevronDown, ClipboardPaste, Zap, Loader2, Banknote, Bell, Inbox, X, Check, Cloud, Sun, Lock, TrendingUp, Settings, Power, Eye, EyeOff } from 'lucide-react';

// 硬寫入的 Firebase 設定
const FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBwRgn0_jCELNK-RO9x3VRhuj2CZsvjpnY",
  authDomain: "rento-buying-service.firebaseapp.com",
  databaseURL: "https://rento-buying-service-default-rtdb.firebaseio.com",
  projectId: "rento-buying-service",
  storageBucket: "rento-buying-service.firebasestorage.app",
  messagingSenderId: "322880924352",
  appId: "1:322880924352:web:eb6e84cf8940e001405b25"
};

const RentoLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 25V75M30 25H52C67 25 67 50 52 50H30M52 50C52 50 57 75 77 65" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M68 62L78 65L75 75" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const App: React.FC = () => {
  // --- 狀態管理 ---
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('sakura_orders') || '[]'); } catch (e) { return []; }
  });

  const [inboxItems, setInboxItems] = useState<OrderItem[]>([]);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'admin' | 'buyer'>('admin');
  const [isAISensing, setIsAISensing] = useState(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  
  // --- 雲端設定狀態 ---
  const [storeId] = useState(() => {
    let sid = localStorage.getItem('rento_store_id');
    if (!sid) { sid = crypto.randomUUID().split('-')[0]; localStorage.setItem('rento_store_id', sid); }
    return sid;
  });
  
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [formConfig, setFormConfig] = useState<{ isFormActive: boolean; deadline: string }>({
    isFormActive: true,
    deadline: '2026.01.29 23:00'
  });

  const lastClipboardText = useRef<string>('');
  const inboxRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  // --- 初始化與監聽 ---

  // 請求通知權限的函式
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('通知已啟用', { 
            body: '當收到新委託時，Rento 會傳送通知給您。',
            icon: 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png'
          });
        }
      } catch (err) {
        console.error("Notification permission error:", err);
      }
    }
  }, []);

  // 處理螢幕喚醒鎖 (Wake Lock)
  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      if (!isWakeLockActive) {
        try {
          const wakeLock = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current = wakeLock;
          setIsWakeLockActive(true);
          wakeLock.addEventListener('release', () => {
            setIsWakeLockActive(false);
            console.log('Wake Lock released');
          });
          console.log('Wake Lock active');
        } catch (err) {
          console.error(`${err.name}, ${err.message}`);
          alert("無法啟用螢幕恆亮，可能是電量過低或系統限制。");
        }
      } else {
        if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          setIsWakeLockActive(false);
        }
      }
    } else {
      alert("您的瀏覽器不支援螢幕喚醒功能。");
    }
  };

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isWakeLockActive) {
         try {
            const wakeLock = await (navigator as any).wakeLock.request('screen');
            wakeLockRef.current = wakeLock;
         } catch(e) { 
             console.log("Re-acquire wake lock failed", e);
             setIsWakeLockActive(false);
         }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isWakeLockActive]);

  // 1. 初始化雲端連線
  useEffect(() => {
    const success = initCloud(FIREBASE_CONFIG);
    setIsCloudConnected(success);
    if (success) {
      // 訂閱雲端收件匣
      const unsubscribeInbox = subscribeToInbox(storeId, (newOrder) => {
           setInboxItems(prev => {
              if (prev.some(p => p.id === newOrder.id) || orders.some(o => o.id === newOrder.id)) return prev;
              try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}); } catch(e){}
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    new Notification(`收到新委託！`, {
                        body: `${newOrder.buyerName} 想要買：${newOrder.productName}`,
                        icon: newOrder.imageUrl, 
                        tag: newOrder.id,
                        requireInteraction: true
                    });
                } catch(e) {}
              }
              return [newOrder, ...prev];
           });
      });
      // 訂閱配置
      const unsubscribeConfig = subscribeToConfig(storeId, (config) => {
          setFormConfig(config);
      });

      return () => {
          unsubscribeInbox();
          unsubscribeConfig();
      };
    }
  }, [storeId, orders]); 

  // 2. 處理買家模式路由
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'buyer') {
      setViewMode('buyer');
    }
  }, []);

  // 3. 點擊外部關閉收件匣
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inboxRef.current && !inboxRef.current.contains(event.target as Node)) {
        setIsInboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 4. 持久化訂單
  useEffect(() => {
    try {
      localStorage.setItem('sakura_orders', JSON.stringify(orders));
    } catch (e) {
      console.error("Storage Save Error:", e);
    }
  }, [orders]);


  // --- 功能函式 ---

  const handleShareLink = () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    let shareUrl = `${baseUrl}?mode=buyer`;

    if (isCloudConnected) {
       const payload = encodeConfig(FIREBASE_CONFIG, storeId);
       shareUrl += `&connect=${payload}`;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl);
      alert('已複製買家填單連結！');
    }
  };

  const handleToggleForm = async () => {
      const newStatus = !formConfig.isFormActive;
      setFormConfig(prev => ({ ...prev, isFormActive: newStatus }));
      if (isCloudConnected) {
          await updateStoreConfig(storeId, { ...formConfig, isFormActive: newStatus });
      }
  };

  const handleUpdateDeadline = async (val: string) => {
      setFormConfig(prev => ({ ...prev, deadline: val }));
      if (isCloudConnected) {
          await updateStoreConfig(storeId, { ...formConfig, deadline: val });
      }
  };

  const parseImportData = (encodedData: string) => {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(encodedData))));
    } catch (e) { return null; }
  };

  const masterSensor = useCallback(async () => {
    if (isAISensing || !navigator.clipboard?.readText) return;
    try {
      if (document.visibilityState !== 'visible') return;
      const text = await navigator.clipboard.readText();
      if (!text || text === lastClipboardText.current) return;
      
      const match = text.match(/RENTO_DATA::(.*)::END/);
      if (match && match[1]) {
        lastClipboardText.current = text;
        const data = parseImportData(match[1]);
        if (data) {
           const incomingItems = Array.isArray(data) ? data : [data];
           let addedCount = 0;
           setInboxItems(prev => {
              const uniqueItems = incomingItems.filter((newItem: OrderItem) => 
                 !prev.some(p => p.id === newItem.id) && !orders.some(o => o.id === newItem.id)
              );
              if (uniqueItems.length > 0) {
                  addedCount = uniqueItems.length;
                  return [...uniqueItems, ...prev];
              }
              return prev;
           });
           if (addedCount > 0) {
               try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}); } catch(e){}
               setIsInboxOpen(true);
           }
        }
      }
    } catch (e) {}
  }, [isAISensing, orders]);

  useEffect(() => {
      if(viewMode === 'admin') {
          window.addEventListener('focus', masterSensor);
          const interval = setInterval(() => { if (document.visibilityState === 'visible') masterSensor(); }, 2000);
          return () => { window.removeEventListener('focus', masterSensor); clearInterval(interval); };
      }
  }, [masterSensor, viewMode]);


  // --- UI 處理 ---

  const handleUpdateOrder = (id: string, updates: Partial<OrderItem>) => {
    setOrders(prev => prev.map(order => order.id === id ? { ...order, ...updates } : order));
  };

  const handleAcceptInboxItem = (item: OrderItem) => {
    const safeItem: OrderItem = {
        ...item,
        originalPriceJpy: Number(item.originalPriceJpy) || 0,
        requestedQuantity: Number(item.requestedQuantity) || 1,
        purchasedQuantity: Number(item.purchasedQuantity) || 0,
        calculatedPrice: Number(item.calculatedPrice) || 0,
        buyerName: item.buyerName || '未知買家',
        productName: item.productName || '未知商品',
        status: item.status || 'pending',
        isPaid: !!item.isPaid,
        id: item.id || `cloud-${Date.now()}`
    };
    setOrders(prev => [safeItem, ...prev]);
    setInboxItems(prev => prev.filter(i => i.id !== item.id)); 
    if (inboxItems.length <= 1) setIsInboxOpen(false);
    if (isCloudConnected) removeOrderFromInbox(storeId, item.id);
  };

  const handleRejectInboxItem = (id: string) => {
    setInboxItems(prev => prev.filter(i => i.id !== id));
    if (inboxItems.length <= 1) setIsInboxOpen(false);
    if (isCloudConnected) removeOrderFromInbox(storeId, id);
  };

  const stats = useMemo(() => {
    let totalJpy = 0;
    let totalTwd = 0;
    let totalPaid = 0;
    let totalProfit = 0;
    orders.forEach(order => {
        totalJpy += (order.originalPriceJpy * order.requestedQuantity);
        totalTwd += order.calculatedPrice;
        if (order.isPaid) totalPaid += order.calculatedPrice;
        const effectiveQty = order.status === OrderStatus.PENDING ? order.requestedQuantity : order.purchasedQuantity;
        const costTwd = Math.ceil(order.originalPriceJpy * effectiveQty * COST_EXCHANGE_RATE);
        totalProfit += (order.calculatedPrice - costTwd);
    });
    return { jpy: totalJpy, twd: totalTwd, paid: totalPaid, profit: totalProfit };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return orders;
    return orders.filter(order => 
      order.buyerName.toLowerCase().includes(query) ||
      order.productName.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  if (viewMode === 'buyer') return <BuyerForm />;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 pb-12 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-2xl border-b border-slate-200 shadow-sm">
        <div className="safe-pt"></div>
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center relative">
          <div className="flex items-center gap-4">
            <div className="relative">
                <div className={`absolute inset-0 bg-indigo-500 rounded-2xl blur-md opacity-20 ${isAISensing ? 'animate-pulse scale-150' : ''}`}></div>
                <div className="relative bg-slate-900 p-2.5 rounded-2xl text-amber-400 ring-1 ring-slate-800 shadow-xl">
                  <RentoLogo className="w-5 h-5" />
                </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter text-slate-900">Rento <span className="text-indigo-600">Smart</span></h1>
              <div className="flex items-center gap-1.5 mt-1">
                 {isCloudConnected ? (
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cloud Sync Active</span>
                 ) : (
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Local Mode</span>
                 )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={toggleWakeLock}
                className={`p-3 rounded-2xl transition-all shadow-sm active:scale-90 ${isWakeLockActive ? 'bg-amber-400 text-slate-900' : 'bg-white border border-slate-200 text-slate-400'}`}
            >
                {isWakeLockActive ? <Sun size={18} fill="currentColor" /> : <Lock size={18} />}
            </button>

            <div className="relative" ref={inboxRef}>
                <button 
                    onClick={() => { setIsInboxOpen(!isInboxOpen); requestNotificationPermission(); }}
                    className={`p-3 rounded-2xl transition-all shadow-sm active:scale-90 relative ${inboxItems.length > 0 ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400'}`}
                >
                    <Bell size={18} fill={inboxItems.length > 0 ? "currentColor" : "none"} />
                    {inboxItems.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white text-[9px] font-bold text-white">
                            {inboxItems.length}
                        </span>
                    )}
                </button>
                {isInboxOpen && (
                    <div className="fixed top-24 left-4 right-4 w-auto sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-96 sm:mt-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-slide-in origin-top sm:origin-top-right z-50">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <span className="text-sm font-black text-slate-800">新委託收件匣</span>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2">
                            {inboxItems.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs">目前沒有新委託</div>
                            ) : (
                                inboxItems.map(item => (
                                    <div key={item.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                        <div className="flex gap-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shrink-0">
                                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><Inbox size={16}/></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-slate-800 truncate">{item.productName}</h4>
                                                <p className="text-xs text-slate-500">{item.buyerName} <span className="text-indigo-500 font-bold">x{item.requestedQuantity}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRejectInboxItem(item.id)} className="flex-1 py-2 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl">忽略</button>
                                            <button onClick={() => handleAcceptInboxItem(item)} className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl">接收</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <button onClick={() => setIsCalculatorOpen(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 active:scale-90 shadow-sm">
              <CalcIcon size={18} />
            </button>
            <button onClick={handleShareLink} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-200 active:scale-95 flex items-center gap-2">
              <Share2 size={14} strokeWidth={3} />
              <span className="hidden sm:inline">連結</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-8">
        {/* 表單控制區 */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${formConfig.isFormActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {formConfig.isFormActive ? <Eye size={20}/> : <EyeOff size={20}/>}
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-800">買家委託表單狀態</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        {formConfig.isFormActive ? '開放中 - 買家可填單' : '已關閉 - 買家無法填單'}
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">截單時間設定</span>
                    <input 
                        type="text" 
                        value={formConfig.deadline} 
                        onChange={(e) => handleUpdateDeadline(e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 w-44"
                    />
                </div>
                <button 
                    onClick={handleToggleForm}
                    className={`px-6 py-3 rounded-2xl font-black text-xs transition-all shadow-sm active:scale-95 flex items-center gap-2 ${formConfig.isFormActive ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-emerald-500 text-white shadow-emerald-200'}`}
                >
                    <Power size={14} />
                    {formConfig.isFormActive ? '關閉表單' : '重啟表單'}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Banknote size={12} /> 採購預算</p>
            <p className="text-2xl font-black text-slate-900">¥ {stats.jpy.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">應收總計</p>
            <p className="text-2xl font-black text-slate-900">NT$ {stats.twd.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-500 p-6 rounded-[2rem] shadow-xl shadow-emerald-500/10">
            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-2">實收進帳</p>
            <p className="text-2xl font-black text-white">NT$ {stats.paid.toLocaleString()}</p>
          </div>
          <div className="bg-amber-400 p-6 rounded-[2rem] shadow-xl shadow-amber-400/20">
            <p className="text-[10px] font-black text-amber-900/60 uppercase tracking-widest mb-2 flex items-center gap-1.5"><TrendingUp size={12}/> 預估淨賺</p>
            <p className="text-2xl font-black text-amber-900">NT$ {stats.profit.toLocaleString()}</p>
          </div>
        </div>

        <button onClick={() => setIsFormOpen(!isFormOpen)} className="w-full bg-white px-8 py-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between transition-all hover:border-indigo-200 group">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl transition-all ${isFormOpen ? 'bg-indigo-100 text-indigo-600 rotate-45' : 'bg-slate-100 text-slate-600'}`}>
              <Plus size={22} strokeWidth={3} />
            </div>
            <div className="text-left">
              <span className="font-black text-base text-slate-800 block">手動建立委託</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manual Entry</span>
            </div>
          </div>
          {isFormOpen ? <ChevronUp size={20} className="text-slate-300"/> : <ChevronDown size={20} className="text-slate-300"/>}
        </button>

        {isFormOpen && (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-slide-in">
            <OrderForm onAddOrder={(o) => { setOrders(p => [o, ...p]); setIsFormOpen(false); }} />
          </div>
        )}

        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input 
            type="text"
            placeholder="搜尋買家、商品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold"
          />
        </div>

        <OrderList orders={filteredOrders} onRemoveOrder={(id) => { if(confirm('刪除?')) setOrders(p => p.filter(o => o.id !== id)); }} onUpdateOrder={handleUpdateOrder} />
      </main>

      <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      <AIAssistant />
    </div>
  );
};

export default App;