import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { OrderItem } from './types.ts';
import Calculator from './components/Calculator.tsx';
import OrderForm from './components/OrderForm.tsx';
import OrderList from './components/OrderList.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import BuyerForm from './components/BuyerForm.tsx';
import ImportModal from './components/ImportModal.tsx';
import { Search, Calculator as CalcIcon, Share2, Plus, ChevronUp, ChevronDown, ClipboardPaste, Globe, RefreshCcw } from 'lucide-react';

const App: React.FC = () => {
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('sakura_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importData, setImportData] = useState<OrderItem | null>(null);
  const [viewMode, setViewMode] = useState<'admin' | 'buyer'>('admin');
  
  // 記錄本階段已處理的 ID
  const processedIds = useRef<Set<string>>(new Set());

  const parseImportData = (encodedData: string) => {
    try {
      const decodedString = decodeURIComponent(escape(atob(encodedData)));
      return JSON.parse(decodedString);
    } catch (e) {
      return null;
    }
  };

  const checkClipboard = useCallback(async (isManual = false) => {
    // 如果已經在顯示彈窗，就不重複檢查
    if (importData) return;

    try {
      const text = await navigator.clipboard.readText();
      const match = text.match(/importData=([^&\s]+)/);
      if (match && match[1]) {
        const data = parseImportData(match[1]);
        if (data && data.id && !processedIds.current.has(data.id)) {
          if (!orders.some(o => o.id === data.id)) {
            setImportData(data);
          } else if (isManual) {
            alert('此委託單已在清單中');
          }
        } else if (isManual && data) {
          alert('此委託單剛才已嘗試處理過');
        }
      } else if (isManual) {
        alert('剪貼簿中沒有偵測到新的委託代碼');
      }
    } catch (e) {
      if (isManual) alert('無法存取剪貼簿，請確保已授權。您也可以直接在螢幕上長按貼上。');
    }
  }, [importData, orders]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'buyer') {
      setViewMode('buyer');
      return;
    }

    // 全局貼上監聽 (iOS 穩定收單關鍵)
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      if (text && text.includes('importData=')) {
        const match = text.match(/importData=([^&\s]+)/);
        if (match && match[1]) {
          const data = parseImportData(match[1]);
          if (data) setImportData(data);
        }
      }
    };

    // 定期輪詢 LocalStorage (同裝置同網頁同步)
    const checkQueue = () => {
      const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
      if (queue.length > 0 && !importData) {
        const nextItem = queue[0];
        if (!processedIds.current.has(nextItem.id) && !orders.some(o => o.id === nextItem.id)) {
          setImportData(nextItem);
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkClipboard(); });
    const timer = setInterval(checkQueue, 1500);

    return () => {
      clearInterval(timer);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [importData, checkClipboard, orders]);

  useEffect(() => {
    localStorage.setItem('sakura_orders', JSON.stringify(orders));
  }, [orders]);

  const handleAddOrder = (order: OrderItem) => {
    setOrders((prev) => [order, ...prev]);
    setIsFormOpen(false);
  };

  const handleRemoveOrder = (id: string) => {
    if (confirm('確定要刪除嗎？')) {
      setOrders((prev) => prev.filter((o) => o.id !== id));
    }
  };

  const handleUpdateOrder = (id: string, updates: Partial<OrderItem>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const handleConfirmImport = (order: OrderItem) => {
    handleAddOrder(order);
    processedIds.current.add(order.id);
    setImportData(null);
    const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
    localStorage.setItem('rento_external_queue', JSON.stringify(queue.filter((q: any) => q.id !== order.id)));
    try { navigator.clipboard.writeText(''); } catch(e) {}
  };

  const handleCancelImport = () => {
    if (importData) processedIds.current.add(importData.id);
    setImportData(null);
    try { navigator.clipboard.writeText(''); } catch(e) {}
  };

  const handleCopyRequestLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?mode=buyer`;
    navigator.clipboard.writeText(url);
    alert('買家填單連結已複製！');
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => 
      o.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.productName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  const stats = useMemo(() => {
    const totalJpy = orders.reduce((sum, o) => sum + (o.originalPriceJpy * o.requestedQuantity), 0);
    const totalTwd = orders.reduce((sum, o) => sum + o.calculatedPrice, 0);
    const paidTwd = orders.filter(o => o.isPaid).reduce((sum, o) => sum + o.calculatedPrice, 0);
    return { totalJpy, totalTwd, paidTwd };
  }, [orders]);

  if (viewMode === 'buyer') {
    return <BuyerForm />;
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-gray-900 pb-12 font-sans">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="safe-pt"></div>
        <div className="max-w-4xl mx-auto px-5 py-4 flex justify-between items-center">
          <button 
            onClick={() => checkClipboard(true)}
            className="flex items-center gap-3 active:scale-95 transition-all text-left group"
          >
            <div className="bg-primary p-2 rounded-xl text-accent shadow-lg shadow-primary/20 group-active:rotate-12 transition-transform">
              <Globe size={18} strokeWidth={2.5} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-gray-900 leading-none">Rento 管理</h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">即時感應中</span>
              </div>
            </div>
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCalculatorOpen(true)}
              className="p-2.5 bg-gray-50 text-gray-400 rounded-xl border border-gray-100 shadow-sm"
              title="計算機"
            >
              <CalcIcon size={18} />
            </button>
            <button 
              onClick={handleCopyRequestLink} 
              className="px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl transition-all border border-indigo-100 flex items-center gap-2 text-xs font-bold shadow-sm active:scale-95"
            >
              <Share2 size={14} />
              <span className="hidden xs:inline">發送連結</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white px-4 py-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
            <p className="text-[9px] font-black text-gray-400 uppercase mb-1 tracking-wider">採購 JPY</p>
            <p className="text-base font-black truncate">¥ {stats.totalJpy.toLocaleString()}</p>
          </div>
          <div className="bg-white px-4 py-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
            <p className="text-[9px] font-black text-gray-400 uppercase mb-1 tracking-wider">預估總額</p>
            <p className="text-base font-black truncate">NT$ {stats.totalTwd.toLocaleString()}</p>
          </div>
          <div className="bg-white px-4 py-4 rounded-[1.5rem] border border-gray-100 shadow-sm bg-green-50/30 border-green-100/50">
            <p className="text-[9px] font-black text-green-500 uppercase mb-1 tracking-wider">實收帳款</p>
            <p className="text-base font-black truncate text-green-600">NT$ {stats.paidTwd.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden transition-all">
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Plus size={20} className={`text-primary transition-transform duration-300 ${isFormOpen ? 'rotate-45' : ''}`} />
              <span className="font-bold text-sm text-gray-700">快速建立委託</span>
            </div>
            {isFormOpen ? <ChevronUp size={16} className="text-gray-300"/> : <ChevronDown size={16} className="text-gray-300"/>}
          </button>
          {isFormOpen && (
            <div className="border-t border-gray-50 bg-white">
              <OrderForm onAddOrder={handleAddOrder} />
            </div>
          )}
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text"
            placeholder="搜尋買家、商品名稱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all text-sm font-medium"
          />
        </div>
        
        <OrderList 
          orders={filteredOrders} 
          onRemoveOrder={handleRemoveOrder} 
          onUpdateOrder={handleUpdateOrder}
        />
        
        <div className="py-10 text-center">
            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em] mb-4">無法自動收單？請嘗試在螢幕任意處貼上</p>
            <button 
                onClick={() => checkClipboard(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-50 border border-gray-100 rounded-full text-xs font-bold text-gray-400 active:bg-gray-100"
            >
                <ClipboardPaste size={14} /> 強制檢查剪貼簿
            </button>
        </div>
      </main>

      <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      {importData && <ImportModal data={importData} onConfirm={handleConfirmImport} onCancel={handleCancelImport} />}
      <AIAssistant />
    </div>
  );
};

export default App;