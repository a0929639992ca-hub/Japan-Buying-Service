import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { OrderItem } from './types.ts';
import Calculator from './components/Calculator.tsx';
import OrderForm from './components/OrderForm.tsx';
import OrderList from './components/OrderList.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import BuyerForm from './components/BuyerForm.tsx';
import { parseOrderFromText } from './services/geminiService.ts';
import { initCloud, subscribeToInbox, encodeConfig, FirebaseConfig } from './services/cloudService.ts';
import { Search, Calculator as CalcIcon, Share2, Plus, ChevronUp, ChevronDown, ClipboardPaste, Zap, Loader2, Banknote, Bell, Inbox, X, Check, Cloud, Settings, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  // --- 狀態管理 ---
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('sakura_orders') || '[]'); } catch (e) { return []; }
  });

  const [inboxItems, setInboxItems] = useState<OrderItem[]>([]);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'admin' | 'buyer'>('admin');
  const [isAISensing, setIsAISensing] = useState(false);
  
  // --- 雲端設定狀態 ---
  const [storeId] = useState(() => {
    let sid = localStorage.getItem('rento_store_id');
    if (!sid) { sid = crypto.randomUUID().split('-')[0]; localStorage.setItem('rento_store_id', sid); }
    return sid;
  });
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig | null>(() => {
    try { return JSON.parse(localStorage.getItem('rento_firebase_config') || 'null'); } catch { return null; }
  });
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configInput, setConfigInput] = useState('');

  const lastClipboardText = useRef<string>('');
  const inboxRef = useRef<HTMLDivElement>(null);

  // --- 初始化與監聽 ---

  // 1. 初始化雲端連線
  useEffect(() => {
    if (firebaseConfig) {
      const success = initCloud(firebaseConfig);
      setIsCloudConnected(success);
      if (success) {
        // 訂閱雲端收件匣
        const unsubscribe = subscribeToInbox(storeId, (newOrder) => {
             // 檢查是否已存在 (避免重複)
             setInboxItems(prev => {
                if (prev.some(p => p.id === newOrder.id) || orders.some(o => o.id === newOrder.id)) return prev;
                // 播放音效
                try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}); } catch(e){}
                return [newOrder, ...prev];
             });
        });
        return () => unsubscribe(); // Cleanup
      }
    }
  }, [firebaseConfig, storeId, orders]); // Add orders to dependency to check duplication accurately

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
    localStorage.setItem('sakura_orders', JSON.stringify(orders));
  }, [orders]);


  // --- 功能函式 ---

  const handleSaveConfig = () => {
    try {
      // 嘗試解析輸入的 JSON
      const config = JSON.parse(configInput);
      if (!config.databaseURL) throw new Error("Invalid Config");
      
      localStorage.setItem('rento_firebase_config', JSON.stringify(config));
      setFirebaseConfig(config);
      setShowConfigModal(false);
      alert("設定已儲存！雲端同步功能啟動中...");
      window.location.reload(); // 重新整理以確保連線乾淨
    } catch (e) {
      alert("格式錯誤，請輸入完整的 Firebase JSON 設定。");
    }
  };

  const handleShareLink = () => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    let shareUrl = `${baseUrl}?mode=buyer`;

    if (isCloudConnected && firebaseConfig) {
       // 如果有雲端設定，將加密後的設定與 StoreID 附帶在 URL 中
       const payload = encodeConfig(firebaseConfig, storeId);
       shareUrl += `&connect=${payload}`;
       // 警告：URL 會變得很長，但在 Line/Messenger 中通常沒問題
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl);
      alert(isCloudConnected ? '已複製「雲端直連」連結！買家填單後您會直接收到。' : '已複製連結 (尚未設定雲端，買家需手動回傳代碼)。');
    }
  };

  const parseImportData = (encodedData: string) => {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(encodedData))));
    } catch (e) { return null; }
  };

  // 剪貼簿監聽 (保留作為備用方案)
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
           setInboxItems(prev => {
              if (prev.some(item => item.id === data.id) || orders.some(o => o.id === data.id)) return prev;
              return [data, ...prev];
           });
           setIsInboxOpen(true);
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

  // Fix: Added missing handleUpdateOrder function to handle order updates from OrderList component
  const handleUpdateOrder = (id: string, updates: Partial<OrderItem>) => {
    setOrders(prev => prev.map(order => 
      order.id === id ? { ...order, ...updates } : order
    ));
  };

  const handleAcceptInboxItem = (item: OrderItem) => {
    setOrders(prev => [item, ...prev]);
    setInboxItems(prev => prev.filter(i => i.id !== item.id)); // 記憶體中移除
    if (inboxItems.length === 1) setIsInboxOpen(false);
    // TODO: 若是雲端資料，理論上應該也要從 Firebase 刪除，但為保留紀錄暫不執行
  };

  const handleRejectInboxItem = (id: string) => {
    setInboxItems(prev => prev.filter(i => i.id !== id));
    if (inboxItems.length === 1) setIsInboxOpen(false);
  };

  const stats = useMemo(() => ({
    jpy: orders.reduce((s, o) => s + (o.originalPriceJpy * o.requestedQuantity), 0),
    twd: orders.reduce((s, o) => s + o.calculatedPrice, 0),
    paid: orders.filter(o => o.isPaid).reduce((s, o) => s + o.calculatedPrice, 0)
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return orders;
    return orders.filter(order => 
      order.buyerName.toLowerCase().includes(query) ||
      order.productName.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  // --- Render ---

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
                  {isAISensing ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
                </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter text-slate-900">Rento <span className="text-indigo-600">Smart</span></h1>
              <div className="flex items-center gap-1.5 mt-1">
                 {isCloudConnected ? (
                    <>
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cloud Sync</span>
                    </>
                 ) : (
                    <>
                        <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Local Mode</span>
                    </>
                 )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Cloud Config Button */}
            <button 
                onClick={() => setShowConfigModal(true)}
                className={`p-3 rounded-2xl transition-all shadow-sm active:scale-90 ${isCloudConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-white border border-slate-200 text-slate-400'}`}
            >
                <Cloud size={18} strokeWidth={isCloudConnected ? 2.5 : 2} />
            </button>

            {/* Inbox */}
            <div className="relative" ref={inboxRef}>
                <button 
                    onClick={() => setIsInboxOpen(!isInboxOpen)}
                    className={`p-3 rounded-2xl transition-all shadow-sm active:scale-90 relative ${inboxItems.length > 0 ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600'}`}
                >
                    <Bell size={18} fill={inboxItems.length > 0 ? "currentColor" : "none"} />
                    {inboxItems.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white text-[9px] font-bold text-white">
                            {inboxItems.length}
                        </span>
                    )}
                </button>
                {/* Inbox Dropdown (UI Code Same as before, omitted for brevity but logic is preserved by React state) */}
                {isInboxOpen && (
                    <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-slide-in origin-top-right z-50">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-800">
                                <Inbox size={16} />
                                <span className="text-sm font-black">收件匣</span>
                            </div>
                            <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">{inboxItems.length}</span>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-2">
                            {inboxItems.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    <p className="text-xs">目前沒有新委託</p>
                                </div>
                            ) : (
                                inboxItems.map(item => (
                                    <div key={item.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                        <div className="flex gap-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl shrink-0 overflow-hidden">
                                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Inbox size={16}/></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-slate-800 truncate">{item.productName}</h4>
                                                <p className="text-xs text-slate-500">{item.buyerName} <span className="text-indigo-500 font-bold">x{item.requestedQuantity}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRejectInboxItem(item.id)} className="flex-1 py-2 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl">忽略</button>
                                            <button onClick={() => handleAcceptInboxItem(item)} className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl shadow-sm shadow-indigo-200">接收</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <button onClick={() => setIsCalculatorOpen(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm active:scale-90">
              <CalcIcon size={18} />
            </button>
            <button onClick={handleShareLink} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-200 flex items-center gap-2 active:scale-95">
              <Share2 size={14} strokeWidth={3} />
              <span className="hidden sm:inline">發送連結</span>
            </button>
          </div>
        </div>
      </header>

      {/* Cloud Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><Cloud size={20} className="text-indigo-600"/> 雲端同步設定</h3>
                    <button onClick={() => setShowConfigModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-xs leading-relaxed border border-amber-100">
                        <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={12}/> 注意</p>
                        要啟用「買家按送出 &rarr; 您的手機直接收到」功能，需要設定 Firebase Realtime Database。
                        請去 Firebase Console 建立專案，並將 Config JSON 貼在下方。
                    </div>
                    <textarea 
                        className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder='{"apiKey": "AIza...", "authDomain": "...", "databaseURL": "..."}'
                        value={configInput}
                        onChange={(e) => setConfigInput(e.target.value)}
                    />
                    <div className="flex gap-3">
                         <button onClick={() => { localStorage.removeItem('rento_firebase_config'); window.location.reload(); }} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-50">清除設定</button>
                         <button onClick={handleSaveConfig} className="flex-1 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700">儲存並連線</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Banknote size={12} strokeWidth={3} /> 採購預算
            </p>
            <p className="text-2xl font-black text-slate-900">¥ {stats.jpy.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">應收總計</p>
            <p className="text-2xl font-black text-slate-900">NT$ {stats.twd.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-500 p-6 rounded-[2rem] border border-emerald-400 shadow-xl shadow-emerald-500/10">
            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-2">實收進帳</p>
            <p className="text-2xl font-black text-white">NT$ {stats.paid.toLocaleString()}</p>
          </div>
        </div>

        <button onClick={() => setIsFormOpen(!isFormOpen)} className="w-full bg-white px-8 py-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:border-indigo-200">
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
        
        {!isCloudConnected && (
            <div className="py-12 text-center space-y-4">
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto"></div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">手動同步模式</p>
                <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed px-6">
                    目前尚未設定雲端資料庫。買家填單後需手動複製代碼傳送給您。<br/>
                    建議點擊上方雲朵圖示啟用自動同步。
                </p>
                <button onClick={masterSensor} className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-500 hover:text-indigo-600 transition-all active:scale-95 shadow-sm">
                    <ClipboardPaste size={16} /> 強制掃描剪貼簿
                </button>
            </div>
        )}
      </main>

      <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      <AIAssistant />
    </div>
  );
};

export default App;