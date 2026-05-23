import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldAlert, TrendingUp } from 'lucide-react';

export default function ForexRisk() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchForex = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/forex`);
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchForex();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
         <h2 className="text-2xl font-bold">Forex Risk Analysis</h2>
         <p className="text-textSecondary text-sm">Real-time simulated volatility metrics</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {data.map((pair) => (
          <div key={pair.pair} className="bg-surface border border-border p-6 rounded-xl flex items-center justify-between">
            <div>
               <h3 className="text-xl font-bold mb-1">{pair.pair}</h3>
               <div className="flex items-center gap-2 text-sm text-textSecondary mt-2">
                 <TrendingUp size={16} /> 
                 Trend: {pair.trend}
               </div>
            </div>
            <div className="text-right">
               <div className="text-2xl font-bold flex items-center justify-end gap-2">
                  {pair.volatility}%
               </div>
               <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                   pair.risk_level === 'High' ? 'bg-red-500/20 text-red-400' :
                   pair.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                   'bg-green-500/20 text-green-400'
               }`}>
                  {pair.risk_level} Risk
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
