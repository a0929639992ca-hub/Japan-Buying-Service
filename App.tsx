import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { OrderItem, OrderStatus } from './types.ts';
import Calculator from './components/Calculator.tsx';
import OrderForm from './components/OrderForm.tsx';
import OrderList from './components/OrderList.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import BuyerForm from './components/BuyerForm.tsx';
import { 
  initCloud, 
  subscribeToInbox, 
  encodeConfig, 
  FirebaseConfig, 
  removeOrderFromInbox, 
  updateStoreConfig, 
  subscribeToConfig,
  saveOrderToStore,
  deleteOrderFromStore,
  subscribeToOrders
} from './services/cloudService.ts';
import { COST_EXCHANGE_RATE } from './constants.ts';
import { Search, Calculator as CalcIcon, Share2, Plus, ChevronUp, ChevronDown, Sparkles, Loader2, Banknote, Bell, Inbox, X, Check, Cloud, Sun, Lock, TrendingUp, Settings, Power, Eye, EyeOff, CheckCircle2, Database, Copy, RefreshCw } from 'lucide-react';

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
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [inboxItems, setInboxItems] = useState<OrderItem[]>([]);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'admin' | 'buyer'>('admin');
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [storeId, setStoreId] = useState(() => {
    let sid = localStorage.getItem('rento_store_id');
    if (!sid) { sid = crypto.randomUUID().split('-')[0]; localStorage.setItem('rento_store_id', sid); }
    return sid;
  });

  const [tempStoreId, setTempStoreId] = useState(storeId);
  
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [formConfig, setFormConfig] = useState<{ isFormActive: boolean; deadline: string }>({
    isFormActive: true,
    deadline: '2026.01.29 23:00'
  });

  const inboxRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<any>(null);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') await Notification.requestPermission();
  }, []);

  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      if (!isWakeLockActive) {
        try {
          const wakeLock = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current = wakeLock;
          setIsWakeLockActive(true);
        } catch (err) { alert("無法啟用螢幕恆亮"); }
      } else {
        await wakeLockRef.current?.release();
        wakeLockRef.current = null;
        setIsWakeLockActive(false);
      }
    }
  };

  useEffect(() => {
    const success = initCloud(FIREBASE_CONFIG);
    setIsCloudConnected(success);
    if (success && storeId) {
      setIsSyncing(true);
      const unsubOrders = subscribeToOrders(storeId, (cloudOrders) => {
        setOrders(cloudOrders);
        setIsSyncing(false);
      });

      const unsubInbox = subscribeToInbox(storeId, (newOrder) => {
        setInboxItems(prev => {
          if (prev.some(p => p.id === newOrder.id) || orders.some(o => o.id === newOrder.id)) return prev;
          try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}); } catch(e){}
          return [newOrder, ...prev];
        });
      });

      const unsubConfig = subscribeToConfig(storeId, (config) => setFormConfig(config));

      return () => {
        unsubOrders();
        unsubInbox();
        unsubConfig();
      };
    }
  }, [storeId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'buyer') setViewMode('buyer');
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inboxRef.current && !inboxRef.current.contains(e.target as Node)) setIsInboxOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateStoreId = () => {
    if (!tempStoreId.trim()) return;
    if (confirm(`確認切換到店鋪 ID: ${tempStoreId} 嗎？\n這將讀取該 ID 下的所有雲端資料。`)) {
      localStorage.setItem('rento_store_id', tempStoreId);
      setStoreId(tempStoreId);
      setOrders([]);
      setInboxItems([]);
      setIsSettingsOpen(false);
    }
  };

  const handleUpdateOrder = async (id: string, updates: Partial<OrderItem>) => {
    const updatedOrder = orders.find(o => o.id === id);
    if (updatedOrder) {
      const newOrder = { ...updatedOrder, ...updates };
      setIsSyncing(true);
      await saveOrderToStore(storeId, newOrder);
    }
  };

  const handleAddOrder = async (order: OrderItem) => {
    setIsSyncing(true);
    await saveOrderToStore(storeId, order);
    setIsFormOpen(false);
  };

  const handleAcceptInboxItem = async (item: OrderItem) => {
    setIsSyncing(true);
    await saveOrderToStore(storeId, item);
    await removeOrderFromInbox(storeId, item.id);
    setInboxItems(prev => prev.filter(i => i.id !== item.id));
    if (inboxItems.length <= 1) setIsInboxOpen(false);
  };

  const handleRejectInboxItem = async (id: string) => {
    await removeOrderFromInbox(storeId, id);
    setInboxItems(prev => prev.filter(i => i.id !== id));
    if (inboxItems.length <= 1) setIsInboxOpen(false);
  };

  const handleRemoveOrder = async (id: string) => {
    if (confirm('確定刪除這筆訂單嗎？雲端資料將同步移除。')) {
      setIsSyncing(true);
      await deleteOrderFromStore(storeId, id);
    }
  };

  const handleShareLink = () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    let shareUrl = `${baseUrl}?mode=buyer`;
    if (isCloudConnected) shareUrl += `&connect=${encodeConfig(FIREBASE_CONFIG, storeId)}`;
    navigator.clipboard.writeText(shareUrl);
    alert('已複製買家填單連結！');
  };

  const handleToggleForm = async () => {
    const newStatus = !formConfig.isFormActive;
    await updateStoreConfig(storeId, { ...formConfig, isFormActive: newStatus });
  };

  const handleUpdateDeadline = async (val: string) => {
    await updateStoreConfig(storeId, { ...formConfig, deadline: val });
  };

  const stats = useMemo(() => {
    let jpy = 0, twd = 0, paid = 0, profit = 0;
    orders.forEach(o => {
      jpy += (o.originalPriceJpy * o.requestedQuantity);
      twd += o.calculatedPrice;
      if (o.isPaid) paid += o.calculatedPrice;
      const eqty = o.status === OrderStatus.PENDING ? o.requestedQuantity : o.purchasedQuantity;
      profit += (o.calculatedPrice - Math.ceil(o.originalPriceJpy * eqty * COST_EXCHANGE_RATE));
    });
    return { jpy, twd, paid, profit };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return q ? orders.filter(o => o.buyerName.toLowerCase().includes(q) || o.productName.toLowerCase().includes(q)) : orders;
  }, [orders, searchQuery]);

  if (viewMode === 'buyer') return <BuyerForm />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-40 glass border-b border-slate-200/60 premium-shadow">
        <div className="safe-pt"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <div className="shrink-0 relative bg-slate-900 p-2 sm:p-3 rounded-2xl text-amber-400 ring-1 ring-white/10 shadow-xl active-scale">
              <RentoLogo className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 truncate">
                Rento <span className="text-indigo-600">Smart</span>
                {isSyncing && <Loader2 size={12} className="animate-spin text-indigo-400" />}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                 <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${isCloudConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <Cloud size={10} /> {isCloudConnected ? 'Active' : 'Offline'}
                 </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-2">
            <button onClick={toggleWakeLock} className={`p-2.5 sm:p-3.5 rounded-2xl transition-all shadow-sm active-scale ${isWakeLockActive ? 'bg-amber-400 text-slate-900' : 'bg-white border border-slate-200 text-slate-400'}`}>
                {isWakeLockActive ? <Sun size={18} fill="currentColor" /> : <Lock size={18} />}
            </button>
            <div className="relative" ref={inboxRef}>
                <button onClick={() => { setIsInboxOpen(!isInboxOpen); requestNotificationPermission(); }} className={`p-2.5 sm:p-3.5 rounded-2xl transition-all shadow-sm active-scale relative ${inboxItems.length > 0 ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400'}`}>
                    <Bell size={18} fill={inboxItems.length > 0 ? "currentColor" : "none"} />
                    {inboxItems.length > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white text-[9px] font-black text-white">{inboxItems.length}</span>}
                </button>
                {isInboxOpen && (
                    <div className="fixed top-24 left-4 right-4 w-auto sm:absolute sm:top-full sm:right-0 sm:left-auto sm:w-96 sm:mt-4 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-slide-up origin-top sm:origin-top-right z-50">
                        <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center"><span className="text-sm font-black text-slate-800">雲端收件匣</span></div>
                        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3">
                            {inboxItems.length === 0 ? <div className="py-12 text-center text-slate-400 text-sm font-medium">目前的收件匣是空的</div> : inboxItems.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-50">{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><Inbox size={20}/></div>}</div>
                                        <div className="flex-1 min-w-0"><h4 className="font-bold text-sm text-slate-800 truncate">{item.productName}</h4><p className="text-xs text-slate-500 mt-1">{item.buyerName} <span className="text-indigo-600 font-black">x{item.requestedQuantity}</span></p></div>
                                    </div>
                                    <div className="flex gap-2.5"><button onClick={() => handleRejectInboxItem(item.id)} className="flex-1 py-3 text-xs font-black text-slate-400 bg-slate-50 rounded-2xl active-scale">忽略</button><button onClick={() => handleAcceptInboxItem(item)} className="flex-1 py-3 text-xs font-black text-white bg-indigo-600 rounded-2xl active-scale">接受並存檔</button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-2.5 sm:p-3.5 rounded-2xl transition-all shadow-sm active-scale ${isSettingsOpen ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                <Settings size={18} />
            </button>
            <button onClick={handleShareLink} className="p-2.5 sm:px-6 sm:py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-100 active-scale flex items-center gap-2">
                <Share2 size={18} strokeWidth={2.5} />
                <span className="hidden sm:inline">發布委託單</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        
        {isSettingsOpen && (
          <div className="bg-slate-900 rounded-5xl p-8 text-white shadow-2xl animate-slide-up space-y-8">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-white/10 rounded-2xl text-amber-400"><Database size={24}/></div>
                   <div><h3 className="font-extrabold text-xl">雲端同步設定</h3><p className="text-[10px] text-white/40 font-black uppercase tracking-widest mt-0.5">Management & Restore</p></div>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2.5 bg-white/5 rounded-xl text-white/40"><X size={20}/></button>
             </div>
             
             <div className="bg-white/5 p-8 rounded-4xl border border-white/10 space-y-6">
                <div className="flex justify-between items-center">
                   <label className="text-[11px] font-black text-white/40 uppercase tracking-widest">店鋪識別碼 (Store ID)</label>
                   <button onClick={() => { navigator.clipboard.writeText(storeId); alert('已複製 ID'); }} className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-3 py-1.5 rounded-xl"><Copy size={12}/> 複製</button>
                </div>
                <div className="flex gap-4">
                   <input type="text" value={tempStoreId} onChange={(e) => setTempStoreId(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono text-amber-300 outline-none focus:border-amber-400/50 transition-all" />
                   <button onClick={handleUpdateStoreId} className="px-8 bg-white text-slate-900 rounded-2xl font-black text-sm flex items-center gap-2 active-scale"><RefreshCw size={16}/> 同步</button>
                </div>
                <p className="text-[11px] text-white/30 leading-relaxed max-w-lg">
                   ※ Store ID 是您雲端資料的唯一憑證。若更換設備或重新部署，只需在此輸入原本的 ID 即可找回所有訂單。
                </p>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-4xl border border-slate-200/60 premium-shadow flex flex-col justify-between"><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Banknote size={14} className="text-slate-300" /> 採購預算</p><p className="text-3xl font-black text-slate-900">¥ {stats.jpy.toLocaleString()}</p></div>
          <div className="bg-white p-8 rounded-4xl border border-slate-200/60 premium-shadow flex flex-col justify-between"><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">應收總計</p><p className="text-3xl font-black text-slate-900">NT$ {stats.twd.toLocaleString()}</p></div>
          <div className="bg-indigo-600 p-8 rounded-4xl shadow-xl shadow-indigo-100 flex flex-col justify-between"><p className="text-[11px] font-black text-indigo-100 uppercase tracking-widest mb-4">已收進帳</p><p className="text-3xl font-black text-white">NT$ {stats.paid.toLocaleString()}</p></div>
          <div className="bg-amber-400 p-8 rounded-4xl shadow-xl shadow-amber-400/10 flex flex-col justify-between"><p className="text-[11px] font-black text-amber-900/40 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-amber-900/30"/> 預估淨利</p><p className="text-3xl font-black text-amber-900">NT$ {stats.profit.toLocaleString()}</p></div>
        </div>

        <div className="bg-white p-8 rounded-4xl border border-slate-200/60 premium-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl shadow-inner ${formConfig.isFormActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{formConfig.isFormActive ? <Eye size={24}/> : <EyeOff size={24}/>}</div>
                <div><h3 className="text-base font-black text-slate-800">買家填單表單</h3><p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">{formConfig.isFormActive ? '目前已連線開放' : '目前暫停接單'}</p></div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1.5"><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">截單日</span><input type="text" value={formConfig.deadline} onChange={(e) => handleUpdateDeadline(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-xs font-bold text-slate-700 outline-none w-48 focus:ring-2 focus:ring-indigo-100 transition-all" /></div>
                <button onClick={handleToggleForm} className={`px-8 py-4 rounded-2xl font-black text-xs transition-all active-scale flex items-center gap-2 ${formConfig.isFormActive ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'}`}><Power size={16} />{formConfig.isFormActive ? '停止接單' : '啟動接單'}</button>
            </div>
        </div>

        <button onClick={() => setIsFormOpen(!isFormOpen)} className="w-full bg-white px-10 py-8 rounded-5xl border border-slate-200/60 premium-shadow flex items-center justify-between transition-all hover:border-indigo-200 group active-scale">
          <div className="flex items-center gap-6"><div className={`p-3 rounded-2xl transition-all ${isFormOpen ? 'bg-indigo-100 text-indigo-600 rotate-45' : 'bg-slate-100 text-slate-600'}`}><Plus size={28} strokeWidth={3} /></div><div className="text-left"><span className="font-extrabold text-lg text-slate-800 block">手動建立委託</span><span className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">Add to list manually</span></div></div>
          {isFormOpen ? <ChevronUp size={24} className="text-slate-300"/> : <ChevronDown size={24} className="text-slate-300"/>}
        </button>

        {isFormOpen && <div className="bg-white rounded-5xl border border-slate-200 premium-shadow overflow-hidden animate-slide-up"><OrderForm onAddOrder={handleAddOrder} /></div>}

        <div className="relative group">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={24} />
          <input type="text" placeholder="輸入買家、商品名稱搜尋資料庫..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-20 pr-8 py-6 bg-white border border-slate-200/60 rounded-5xl premium-shadow outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold placeholder:text-slate-300" />
        </div>

        <OrderList orders={filteredOrders} onRemoveOrder={handleRemoveOrder} onUpdateOrder={handleUpdateOrder} />
      </main>

      <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      <AIAssistant />
    </div>
  );
};

export default App;