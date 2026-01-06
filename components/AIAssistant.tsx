import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Wand2, Loader2, Image as ImageIcon, Plus } from 'lucide-react';
import { ChatMessage } from '../types.ts';
import { generateAssistantResponse } from '../services/geminiService.ts';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '您好！我是您的代購法務助理 🤖\n\n我可以幫您：\n1. 🇯🇵 翻譯日文商品說明\n2. 📦 判斷是否為「空運禁運品」\n3. 🔍 透過照片辨識商品\n\n請輸入文字或上傳圖片！',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, selectedImage]);

  // 簡單的圖片壓縮處理 (與 Form 類似但獨立)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800;
          
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setSelectedImage(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    const currentImage = selectedImage;
    const currentText = inputValue;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentText + (currentImage ? ' [已上傳圖片]' : ''),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
        // 過濾掉包含 "[已上傳圖片]" 這種顯示用的文字，確保 Prompt 乾淨，或是直接用 inputValue
        // 但為了讓 AI 知道有圖片，我們直接依賴 generateAssistantResponse 的參數
        const history = messages.map(m => ({ 
            role: m.role === 'model' ? 'model' : 'user', 
            text: m.text.replace(' [已上傳圖片]', '') 
        }));
        
        const responseText = await generateAssistantResponse(
            currentText || (currentImage ? "請分析這張圖片" : ""), 
            history, 
            currentImage || undefined
        );
        
        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        console.error(error);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100 bg-gradient-to-tr from-primary to-secondary text-white'
        }`}
      >
        <Sparkles size={28} />
      </button>

      <div
        className={`fixed bottom-6 right-6 z-50 w-[90vw] max-w-[360px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right border border-gray-100 ${
          isOpen 
            ? 'scale-100 opacity-100 translate-y-0 h-[600px] max-h-[80vh]' 
            : 'scale-90 opacity-0 translate-y-10 pointer-events-none h-0'
        }`}
      >
        <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
                <Wand2 size={20} className="text-white" />
            </div>
            <div>
                <h3 className="font-bold text-sm">れんと AI 助理</h3>
                <p className="text-xs text-white/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Gemini 支援中
                </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-thin scrollbar-thumb-gray-200">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-none'
                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                <Sparkles size={16} className="text-primary animate-pulse" />
                <span className="text-xs text-gray-400">正在思考...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 圖片預覽區 */}
        {selectedImage && (
            <div className="px-4 pt-2 bg-white border-t border-gray-50">
                <div className="relative inline-block">
                    <img src={selectedImage} alt="Upload Preview" className="h-20 w-auto rounded-xl border border-gray-200 object-cover" />
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 shadow-md hover:bg-slate-700"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
        )}

        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 rounded-[2rem] px-2 py-2 border border-gray-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white rounded-full text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 transition-colors"
                title="上傳圖片"
            >
                <ImageIcon size={18} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
            />

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={selectedImage ? "想問這張圖什麼？" : "貼上日文或上傳圖片..."}
              className="flex-1 bg-transparent border-none outline-none text-sm px-2"
              disabled={isLoading}
            />
            
            <button
              onClick={handleSend}
              disabled={(!inputValue.trim() && !selectedImage) || isLoading}
              className={`p-2 rounded-full transition-all shrink-0 ${
                (inputValue.trim() || selectedImage) && !isLoading
                  ? 'bg-primary text-white hover:bg-primary/90 shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;