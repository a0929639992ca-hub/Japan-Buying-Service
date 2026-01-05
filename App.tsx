import React, { useState, useEffect, useMemo } from 'react';
import { OrderItem } from './types.ts';
import Calculator from './components/Calculator.tsx';
import OrderForm from './components/OrderForm.tsx';
import OrderList from './components/OrderList.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import BuyerForm from './components/BuyerForm.tsx';
import ImportModal from './components/ImportModal.tsx';
import { Search, Calculator as CalcIcon, Share2, Plus, ChevronUp, ChevronDown, Radio } from 'lucide-react';

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('mode') === 'buyer') {
      setViewMode('buyer');
      return;
    }

    // 處理 Magic Link 匯入
    const encodedData = params.get('importData');
    if (encodedData) {
      try {
        const decodedString = decodeURIComponent(escape(atob(encodedData)));
        const data = JSON.parse(decodedString);
        setImportData(data);
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.error('解析匯入資料失敗', e);
      }
    }

    // 自動同步機制：偵測 localStorage 委託池
    const checkQueue = () => {
      const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
      if (queue.length > 0 && !importData) {
        // 取出第一筆尚未處理的委託
        setImportData(queue[0]);
      }
    };

    const timer = setInterval(checkQueue, 1500);
    checkQueue();
    return () => clearInterval(timer);
  }, [importData]);

  useEffect(() => {
    localStorage.setItem('sakura_orders', JSON.stringify(orders));
  }, [orders]);

  const handleAddOrder = (order: OrderItem) => {
    setOrders((prev) => [order, ...prev]);
    setIsFormOpen(false);
  };

  const handleRemoveOrder = (id: string) => {
    if (confirm('確定要刪除此項商品嗎？')) {
      setOrders((prev) => prev.filter(o => o.id !== id));
    }
  };

  const handleUpdateOrder = (id: string, updates: Partial<OrderItem>) => {
    setOrders((prev) => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const handleConfirmImport = (order: OrderItem) => {
    handleAddOrder(order);
    setImportData(null);
    // 從公共委託池中移除已處理的項目
    const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
    localStorage.setItem('rento_external_queue', JSON.stringify(queue.filter((q: any) => q.id !== order.id)));
  };

  const handleCancelImport = () => {
    const orderToSkip = importData;
    setImportData(null);
    if (orderToSkip) {
        const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
        localStorage.setItem('rento_external_queue', JSON.stringify(queue.filter((q: any) => q.id !== orderToSkip.id)));
    }
  };

  const handleCopyRequestLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?mode=buyer`;
    navigator.clipboard.writeText(url);
    alert('買家填單連結已複製！請傳送給買家。');
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
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 safe-pt">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-1.5 rounded-xl text-accent shadow-md shadow-primary/20">
              <Plus size={18} strokeWidth={3} className="rotate-45" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-gray-900 leading-none">Rento 後台</h1>
              <div className="flex items-center gap-1 mt-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Auto-Sync Active</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={handleCopyRequestLink} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl transition-all border border-indigo-100 flex items-center gap-1.5 text-xs font-bold">
              <Share2 size={14} /> <span className="hidden sm:inline">發送買家連結</span>
            </button>
            <button onClick={() => setIsCalculatorOpen(true)} className="p-2 bg-gray-50 text-gray-600 rounded-xl border border-gray-100"><CalcIcon size={16} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5 tracking-wider">總採購 JPY</p>
            <p className="text-sm font-black truncate">¥ {stats.totalJpy.toLocaleString()}</p>
          </div>
          <div className="bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5 tracking-wider">預估總額</p>
            <p className="text-sm font-black truncate">NT$ {stats.totalTwd.toLocaleString()}</p>
          </div>
          <div className="bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm bg-green-50/30 border-green-100/50">
            <p className="text-[9px] font-black text-green-500/70 uppercase mb-0.5 tracking-wider">實收帳款</p>
            <p className="text-sm font-black truncate text-green-600">NT$ {stats.paidTwd.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus size={18} className={`text-primary transition-transform ${isFormOpen ? 'rotate-45' : ''}`} />
              <span className="font-bold text-sm text-gray-700">手動快速新增</span>
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors" size={16} />
          <input 
            type="text"
            placeholder="搜尋買家或商品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all text-xs font-medium"
          />
        </div>
        
        <OrderList 
          orders={filteredOrders} 
          onRemoveOrder={handleRemoveOrder} 
          onUpdateOrder={handleUpdateOrder}
        />
      </main>

      <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      {importData && <ImportModal data={importData} onConfirm={handleConfirmImport} onCancel={handleCancelImport} />}
      <AIAssistant />
    </div>
  );
};

export default App;