import React, { useState, useRef } from 'react';
import { Plus, Image as ImageIcon, MapPin } from 'lucide-react';
import { calculateTwd } from '../constants.ts';
import { OrderItem, OrderStatus } from '../types.ts';

// Added missing interface definition for OrderFormProps to resolve TypeScript error
interface OrderFormProps {
  onAddOrder: (order: OrderItem) => void;
}

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

const OrderForm: React.FC<OrderFormProps> = ({ onAddOrder }) => {
  const [buyerName, setBuyerName] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [name, setName] = useState('');
  const [shopInfo, setShopInfo] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estimatedTotal = price 
    ? calculateTwd(parseFloat(price) * parseFloat(qty))
    : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        setImageUrl(compressed);
      } catch(e) { console.error(e); }
      finally { setIsCompressing(false); }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !buyerName) return;
    onAddOrder({
      id: Date.now().toString(),
      buyerName,
      productName: name,
      shopInfo,
      imageUrl: imageUrl || undefined,
      originalPriceJpy: parseFloat(price),
      requestedQuantity: parseInt(qty),
      purchasedQuantity: 0,
      calculatedPrice: estimatedTotal,
      status: OrderStatus.PENDING,
      isPaid: false,
      createdAt: Date.now(),
    });
    setImageUrl(''); setName(''); setShopInfo(''); setPrice(''); setQty('1');
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 animate-slide-in relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">買家名稱</label>
            <input type="text" required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="輸入買家姓名" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-medium" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">商品名稱</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="商品名稱" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-medium" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">購買地點</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
              <input type="text" value={shopInfo} onChange={(e) => setShopInfo(e.target.value)} placeholder="地點或通路 (選填)" className="w-full pl-9 pr-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">價格 (JPY)</label>
              <input type="number" required min="1" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-bold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">數量</label>
              <input type="number" required min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-bold text-center" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5 flex flex-col h-full">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">商品預覽</label>
            <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden relative min-h-[150px]">
                {imageUrl ? (
                    <img src={imageUrl} className="w-full h-full object-cover" />
                ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><ImageIcon size={32}/><span className="text-[10px] font-bold mt-2">點擊上傳圖片</span></button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            </div>
        </div>
      </div>
      <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg">加入清單</button>
    </form>
  );
};

export default OrderForm;