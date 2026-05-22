import React, { useState } from 'react';
import axios from 'axios';
import { Send, Bot, User } from 'lucide-react';

export default function AIChatbot() {
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: "Hello! I am your AI Financial Advisor. Ask me anything about SIP, FD, or Stocks." }
  ]);
  const [inp, setInp] = useState('');

  const sendMsg = async (e) => {
    e.preventDefault();
    if(!inp.trim()) return;
    
    const userMessage = { role: 'user', text: inp };
    setMsgs(prev => [...prev, userMessage]);
    setInp('');

    try {
      const res = await axios.post('http://localhost:8000/api/chat', { message: userMessage.text });
      setMsgs(prev => [...prev, { role: 'ai', text: res.data.response }]);
    } catch (err) {
      console.error(err);
      setMsgs(prev => [...prev, { role: 'ai', text: "Sorry, I had trouble processing that request." }]);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-surface border border-border rounded-xl overflow-hidden max-w-4xl mx-auto">
      <div className="p-4 border-b border-border bg-background flex items-center gap-3">
        <Bot className="text-primary" />
        <h3 className="font-semibold text-lg">AI Assistant</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-primary text-white' : 'bg-surfaceHover border border-border text-primary'
            }`}>
              {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[70%] p-3 rounded-2xl ${
              m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-surfaceHover border border-border rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={sendMsg} className="flex gap-2">
          <input 
            type="text" 
            value={inp} 
            onChange={e => setInp(e.target.value)}
            className="flex-1 bg-surface border border-border rounded-lg px-4 focus:outline-none focus:border-primary"
            placeholder="Type your financial question..."
          />
          <button type="submit" className="bg-primary text-white p-3 rounded-lg hover:bg-primaryHover transition">
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
