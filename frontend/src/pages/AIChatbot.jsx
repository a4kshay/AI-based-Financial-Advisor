import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIChatbot() {
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: "Hello! I am your AI Financial Advisor. Ask me anything about SIP, FD, or Stocks." }
  ]);
  const [inp, setInp] = useState('');
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [msgs, loading]);

  const sendMsg = async (e) => {
    e.preventDefault();
    if(!inp.trim()) return;
    
    const userMessage = { role: 'user', text: inp };
    setMsgs(prev => [...prev, userMessage]);
    setInp('');
    setLoading(true);

    try {
      const res = await axios.post('/api/chat', { message: userMessage.text });
      setMsgs(prev => [...prev, { role: 'ai', text: res.data.response }]);
    } catch (err) {
      console.error(err);
      setMsgs(prev => [...prev, { role: 'ai', text: "**Error:** I had trouble connecting to the server. Please ensure the backend is running." }]);
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-8rem)] flex flex-col bg-surface border border-border rounded-2xl overflow-hidden max-w-4xl mx-auto shadow-2xl">
      <div className="p-5 border-b border-border bg-background flex items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <Bot className="text-primary z-10 relative" size={28} />
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full z-0 animate-pulse" />
        </div>
        <div>
          <h3 className="font-bold text-xl text-white">AI Assistant</h3>
          <p className="text-xs text-primary font-medium tracking-wide">POWERED BY GEMINI</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-surface/50">
        <AnimatePresence>
          {msgs.map((m, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                m.role === 'user' ? 'bg-primary text-white' : 'bg-surface border border-border text-primary'
              }`}>
                {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[75%] p-4 rounded-3xl ${
                m.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none shadow-[0_4px_15px_rgba(37,99,235,0.2)]' 
                  : 'bg-surface border border-border rounded-tl-none text-gray-200'
              }`}>
                {m.role === 'user' ? (
                  <p className="text-[15px]">{m.text}</p>
                ) : (
                  <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-background prose-pre:border prose-pre:border-border max-w-none text-[15px]">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {loading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-surface border border-border text-primary">
                <Bot size={20} />
              </div>
              <div className="bg-surface border border-border rounded-3xl rounded-tl-none p-4 flex items-center gap-2">
                <Loader2 size={20} className="text-primary animate-spin" />
                <span className="text-sm text-textSecondary">Thinking...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-5 border-t border-border bg-background/80 backdrop-blur-md">
        <form onSubmit={sendMsg} className="flex gap-3 relative max-w-4xl mx-auto">
          <input 
            type="text" 
            value={inp} 
            onChange={e => setInp(e.target.value)}
            disabled={loading}
            className="flex-1 bg-surface border border-border rounded-xl px-5 py-3.5 text-[15px] text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner disabled:opacity-50"
            placeholder="Ask about markets, trends, or predictions..."
          />
          <button 
            type="submit" 
            disabled={loading || !inp.trim()}
            className="bg-primary text-white px-6 rounded-xl hover:bg-primaryHover hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
