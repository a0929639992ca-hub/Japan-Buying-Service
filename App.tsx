import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { OrderItem } from './types.ts';
import Calculator from './components/Calculator.tsx';
import OrderForm from './components/OrderForm.tsx';
import OrderList from './components/OrderList.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import BuyerForm from './components/BuyerForm.tsx';
import ImportModal from './components/ImportModal.tsx';
import { parseOrderFromText } from './services/geminiService.ts';
import { Search, Calculator as CalcIcon, Share2, Plus, ChevronUp, ChevronDown, ClipboardPaste, Globe, Zap, Loader2, Banknote } from 'lucide-react';

const App: React.FC = () => {
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('sakura_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("LocalStorage Parse Error", e);
      return [];
    }
  });
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importData, setImportData] = useState<OrderItem | null>(null);
  const [viewMode, setViewMode] = useState<'admin' | 'buyer'>('admin');
  const [isAISensing, setIsAISensing] = useState(false);
  
  const lastClipboardText = useRef<string>('');

  const parseImportData = (encodedData: string) => {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(encodedData))));
    } catch (e) { return null; }
  };

  const masterSensor = useCallback(async () => {
    // 檢查瀏覽器是否支援剪貼簿且目前沒有正在顯示的匯入視窗
    if (importData || isAISensing || !navigator.clipboard?.readText) return;

    try {
      // 僅在視窗獲得焦點時嘗試讀取，避免觸發瀏覽器安全警報
      if (document.visibilityState !== 'visible') return;
      
      const text = await navigator.clipboard.readText();
      if (!text || text === lastClipboardText.current) return;
      lastClipboardText.current = text;

      // 1. 優先檢查是否為 Rento 魔術連結
      const match = text.match(/importData=([^&\s]+)/);
      if (match && match[1]) {
        const data = parseImportData(match[1]);
        if (data && !orders.some(o => o.id === data.id)) {
          setImportData(data);
          return;
        }
      }

      // 2. AI 語意感應：檢查是否含有相關關鍵字
      const aiKeywords = ['日幣', '日元', 'JPY', '數量', '個', '件', '幫我買', '代購'];
      if (aiKeywords.some(key => text.includes(key))) {
        setIsAISensing(true);
        const aiParsedOrder = await parseOrderFromText(text);
        if (aiParsedOrder) {
          setImportData(aiParsedOrder);
        }
        setIsAISensing(false);
      }
    } catch (e) {
      // 靜默處理：通常是使用者未授權剪貼簿權限
    }
  }, [importData, orders, isAISensing]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'buyer') {
      setViewMode('buyer');
      return;
    }

    const cloudPoll = () => {
      try {
        const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
        if (queue.length > 0 && !importData) {
          const next = queue[0];
          if (!orders.some(o => o.id === next.id)) setImportData(next);
        }
      } catch (e) {}
    };

    window.addEventListener('focus', masterSensor);
    const interval = setInterval(() => {
        cloudPoll();
    }, 3000);

    return () => {
      window.removeEventListener('focus', masterSensor);
      clearInterval(interval);
    };
  }, [masterSensor, importData, orders]);

  useEffect(() => {
    localStorage.setItem('sakura_orders', JSON.stringify(orders));
  }, [orders]);

  const handleAddOrder = (order: OrderItem) => {
    setOrders((prev) => [order, ...prev]);
    setIsFormOpen(false);
  };

  const handleRemoveOrder = (id: string) => {
    if (confirm('確定刪除？')) setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const handleUpdateOrder = (id: string, updates: Partial<OrderItem>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const handleConfirmImport = (order: OrderItem) => {
    handleAddOrder(order);
    setImportData(null);
    try {
      const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
      localStorage.setItem('rento_external_queue', JSON.stringify(queue.filter((q: any) => q.id !== order.id)));
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText('');
    } catch (e) {}
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

  if (viewMode === 'buyer') return <BuyerForm />;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 pb-12 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-2xl border-b border-slate-200 shadow-sm">
        <div className="safe-pt"></div>
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
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
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">AI Sensing Active</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setIsCalculatorOpen(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm active:scale-90">
              <CalcIcon size={18} />
            </button>
            <button onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?mode=buyer`;
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(url);
                alert('買家專屬填單連結已複製！');
              }
            }} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-200 flex items-center gap-2 active:scale-95">
              <Share2 size={14} strokeWidth={3} />
              <span className="hidden sm:inline">發送收單連結</span>
            </button>
          </div>
        </div>
      </header>

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
            <OrderForm onAddOrder={handleAddOrder} />
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

        <OrderList orders={filteredOrders} onRemoveOrder={handleRemoveOrder} onUpdateOrder={handleUpdateOrder} />
        
        <div className="py-12 text-center space-y-4">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto"></div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">AI 智慧感應已啟動</p>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed px-6">
                您可以直接複製聊天訊息，<br/>App 會自動解析資訊並詢問收單。
            </p>
            <button onClick={masterSensor} className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-500 hover:text-indigo-600 transition-all active:scale-95 shadow-sm">
                <ClipboardPaste size={16} /> 強制同步感應
            </button>
        </div>
      </main>

      <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      {importData && <ImportModal data={importData} onConfirm={handleConfirmImport} onCancel={() => setImportData(null)} />}
      <AIAssistant />
    </div>
  );
};

export default App;