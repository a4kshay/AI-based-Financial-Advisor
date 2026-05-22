import React, { useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, CartesianGrid, YAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export default function SIPCalculator() {
  const [formData, setFormData] = useState({
    monthly_investment: 5000,
    duration_years: 10,
    expected_return_rate: 12
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate slight delay for animation effect
    await new Promise(r => setTimeout(r, 600));
    try {
      const res = await axios.post('http://localhost:8000/api/sip', formData);
      setResults(res.data.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">SIP Calculator</h2>
        <p className="text-textSecondary text-sm">Visualize your wealth compounding over time.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div whileHover={{ boxShadow: '0 0 20px rgba(37,99,235,0.1)' }} className="bg-surface border border-border p-6 rounded-xl relative overflow-hidden transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <form onSubmit={handleCalculate} className="space-y-5 relative z-10">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Monthly Investment (₹)</label>
              <input 
                type="number"
                value={formData.monthly_investment}
                onChange={e => setFormData({...formData, monthly_investment: Number(e.target.value)})}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Duration (Years)</label>
              <input 
                type="number"
                value={formData.duration_years}
                onChange={e => setFormData({...formData, duration_years: Number(e.target.value)})}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Expected Return Rate (%)</label>
              <input 
                type="number"
                value={formData.expected_return_rate}
                onChange={e => setFormData({...formData, expected_return_rate: Number(e.target.value)})}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-white"
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="w-full bg-primary hover:bg-primaryHover text-white py-3 rounded-lg font-semibold transition-colors mt-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]" 
              disabled={loading}
            >
              {loading ? (
                 <span className="flex items-center justify-center gap-2">
                   <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Calculating...
                 </span>
              ) : 'Calculate SIP'}
            </motion.button>
          </form>
        </motion.div>

        <div className="lg:col-span-2 bg-surface border border-border p-6 rounded-xl min-h-[400px] flex flex-col justify-between overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!results ? (
               <motion.div 
                 key="empty"
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="flex-1 flex flex-col items-center justify-center text-textSecondary"
               >
                 <div className="w-16 h-16 rounded-full bg-surfaceHover flex items-center justify-center mb-4 border border-border">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                 </div>
                 Enter details to calculate returns
               </motion.div>
            ) : (
               <motion.div 
                 key="results"
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ type: 'spring', bounce: 0.2 }}
                 className="w-full h-full flex flex-col"
               >
                 <div className="grid grid-cols-3 gap-4 mb-8">
                   <motion.div whileHover={{ y: -2 }} className="text-center p-4 bg-background rounded-xl border border-border cursor-default hover:border-textSecondary/30 transition-colors">
                     <p className="text-sm text-textSecondary uppercase tracking-wider font-semibold mb-1">Total Invested</p>
                     <p className="text-2xl font-bold">₹{results.total_invested.toLocaleString()}</p>
                   </motion.div>
                   <motion.div whileHover={{ y: -2 }} className="text-center p-4 bg-background rounded-xl border border-border cursor-default hover:border-success/30 transition-colors relative overflow-hidden">
                     <div className="absolute inset-0 bg-success/5 pointer-events-none"/>
                     <p className="text-sm text-textSecondary uppercase tracking-wider font-semibold mb-1">Est. Returns</p>
                     <p className="text-2xl font-bold text-success relative">₹{results.wealth_gained.toLocaleString()}</p>
                   </motion.div>
                   <motion.div whileHover={{ y: -2 }} className="text-center p-4 bg-background rounded-xl border border-border cursor-default hover:border-primary/30 transition-colors relative overflow-hidden">
                     <div className="absolute inset-0 bg-primary/5 pointer-events-none"/>
                     <p className="text-sm text-textSecondary uppercase tracking-wider font-semibold mb-1">Total Value</p>
                     <p className="text-2xl font-bold text-blue-400 relative">₹{results.estimated_returns.toLocaleString()}</p>
                   </motion.div>
                 </div>
                 
                 <div className="flex-1 h-64 min-h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results.graph}>
                        <defs>
                          <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                        <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} tickMargin={10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', color: '#F3F4F6', borderRadius: '12px', padding: '12px' }} 
                          itemStyle={{ fontSize: '14px', fontWeight: '500' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#valGrad)" name="Total Value" activeDot={{r:6, fill:"#2563EB", strokeWidth:0}} />
                        <Area type="monotone" dataKey="invested" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#invGrad)" name="Amount Invested" activeDot={{r:6, fill:"#10B981", strokeWidth:0}} />
                      </AreaChart>
                   </ResponsiveContainer>
                 </div>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
