import React, { useState, useEffect, useMemo } from 'react';
import { OrderItem } from './types.ts';
import Calculator from './components/Calculator.tsx';
import OrderForm from './components/OrderForm.tsx';
import OrderList from './components/OrderList.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import BuyerForm from './components/BuyerForm.tsx';
import ImportModal from './components/ImportModal.tsx';
import { JapaneseYen, Flower2, Search, Banknote, Coins, Calculator as CalcIcon, Share2, Bell } from 'lucide-react';

const App: React.FC = () => {
  const [orders, setOrders] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('sakura_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importData, setImportData] = useState<OrderItem | null>(null);
  const [viewMode, setViewMode] = useState<'admin' | 'buyer'>('admin');

  // 初始化偵測網址參數與自動隊列
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'buyer') {
      setViewMode('buyer');
      return;
    }

    // 代購主模式：啟動自動監控隊列
    const checkQueue = () => {
      const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
      if (queue.length > 0 && !importData) {
        setImportData(queue[0]);
      }
    };

    const timer = setInterval(checkQueue, 2000);
    checkQueue(); // 立即檢查一次

    return () => clearInterval(timer);
  }, [importData]);

  useEffect(() => {
    localStorage.setItem('sakura_orders', JSON.stringify(orders));
  }, [orders]);

  const handleAddOrder = (order: OrderItem) => {
    setOrders((prev) => [order, ...prev]);
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
    // 從隊列中移除已處理的項目
    const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
    localStorage.setItem('rento_external_queue', JSON.stringify(queue.filter((q: OrderItem) => q.id !== order.id)));
  };

  const handleCancelImport = () => {
    const orderToSkip = importData;
    setImportData(null);
    if (orderToSkip) {
        const queue = JSON.parse(localStorage.getItem('rento_external_queue') || '[]');
        localStorage.setItem('rento_external_queue', JSON.stringify(queue.filter((q: OrderItem) => q.id !== orderToSkip.id)));
    }
  };

  const handleCopyRequestLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?mode=buyer`;
    navigator.clipboard.writeText(url);
    alert('買家填單連結已複製！您可以發送給客戶填寫，填完後會自動出現在您的後台。');
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
    <div className="min-h-screen bg-background text-gray-900 pb-24 font-sans">
      <header className="sticky top-0 z-30 glass border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-2xl text-white shadow-lg shadow-primary/30 ring-4 ring-primary/10">
              <Flower2 size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900 leading-none">
                Rento 代購團
              </h1>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-1">Admin Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyRequestLink}
              className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all border border-indigo-100 flex items-center gap-2"
            >
              <Share2 size={18} />
              <span className="text-xs font-bold hidden sm:inline">獲取填單網址</span>
            </button>
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-all border border-gray-100"
            >
              <CalcIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
              <JapaneseYen size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">總日幣支出</p>
              <p className="text-xl font-black">¥ {stats.totalJpy.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
              <Banknote size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">預估總營收</p>
              <p className="text-xl font-black">NT$ {stats.totalTwd.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500">
              <Coins size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">已入帳台幣</p>
              <p className="text-xl font-black text-green-600">NT$ {stats.paidTwd.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <OrderForm onAddOrder={handleAddOrder} />
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text"
            placeholder="搜尋買家姓名或商品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
          />
        </div>
        
        <OrderList 
          orders={filteredOrders} 
          onRemoveOrder={handleRemoveOrder} 
          onUpdateOrder={handleUpdateOrder}
        />
      </main>

      <Calculator 
        isOpen={isCalculatorOpen} 
        onClose={() => setIsCalculatorOpen(false)} 
      />
      
      {importData && (
        <ImportModal 
          data={importData} 
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
        />
      )}

      <AIAssistant />
    </div>
  );
};

export default App;