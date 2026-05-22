import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Briefcase, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } }
};

const SkeletonRow = () => (
  <tr className="border-b border-border/40 animate-pulse">
    <td className="px-5 py-3"><div className="h-4 bg-surfaceHover rounded w-24" /></td>
    <td className="px-5 py-3"><div className="h-4 bg-surfaceHover rounded w-12" /></td>
    <td className="px-5 py-3"><div className="h-4 bg-surfaceHover rounded w-16" /></td>
    <td className="px-5 py-3"><div className="h-4 bg-surfaceHover rounded w-16" /></td>
    <td className="px-5 py-3"><div className="h-4 bg-surfaceHover rounded w-14" /></td>
  </tr>
);

export default function Holdings() {
  const [apiHoldings, setApiHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/portfolio');
      if (res.data.status === 'success') {
        setApiHoldings(res.data.data);
      }
    } catch (e) {
      console.error("Fetch holdings failed:", e);
      // Fallback or empty state already handled by apiHoldings being []
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const holdings = apiHoldings.map(h => ({
    ...h,
    invested: h.qty * h.avg,
    curr_value: h.qty * h.curr,
    pnl: h.qty * (h.curr - h.avg),
    pnl_pct: ((h.curr - h.avg) / h.avg) * 100,
  }));

  const totalInvested = holdings.reduce((a, h) => a + h.invested, 0);
  const totalValue    = holdings.reduce((a, h) => a + h.curr_value, 0);
  const totalPnL      = totalValue - totalInvested;
  const totalPnLPct   = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const isOverallUp   = totalPnL >= 0;

  // Sector-wise allocation for pie
  const sectorMap = {};
  holdings.forEach(h => {
    sectorMap[h.sector] = (sectorMap[h.sector] || 0) + h.curr_value;
  });
  const pieData = Object.entries(sectorMap).map(([name, value]) => ({ name, value: Math.round(value) }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase size={22} className="text-primary" />
          Holdings
        </h2>
        <p className="text-textSecondary text-sm mt-0.5">Your current stock positions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? [0,1,2].map(i => (
          <div key={i} className="glass-card rounded-xl p-5 animate-pulse">
            <div className="h-3 bg-surfaceHover rounded w-20 mb-3" />
            <div className="h-7 bg-surfaceHover rounded w-32" />
          </div>
        )) : [
          { label: 'Current Value', value: `₹${totalValue.toLocaleString('en-IN')}`, sub: `${isOverallUp ? '+' : ''}${totalPnLPct.toFixed(2)}% Total Return`, color: 'text-primary' },
          { label: 'Total Invested', value: `₹${totalInvested.toLocaleString('en-IN')}`, sub: `${holdings.length} Positions`, color: 'text-textPrimary' },
          { label: 'Total P&L', value: `${isOverallUp ? '+' : '-'}₹${Math.abs(totalPnL).toLocaleString('en-IN')}`, sub: 'Overall profit/loss', color: isOverallUp ? 'text-success' : 'text-danger' },
        ].map((k, i) => (
          <motion.div key={i} variants={itemVariants} className="glass-card rounded-xl p-5 border-l-4 border-primary">
            <p className="text-xs text-textSecondary font-semibold uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-bold mb-1 ${k.color}`}>{k.value}</p>
            <p className="text-xs text-textSecondary">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-10 flex items-center justify-center">
          <RefreshCw className="animate-spin text-primary mr-3" size={24} />
          <span className="text-textSecondary">Loading your portfolio...</span>
        </div>
      ) : holdings.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
            <Briefcase size={40} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-3">No Stocks in Holdings</h3>
          <p className="text-textSecondary text-sm max-w-sm mb-8">
            Your portfolio is waiting for its first investment! Head over to the explore page to find top-performing stocks.
          </p>
          <motion.a 
            href="/dashboard/explore"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-primary hover:bg-primaryHover text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-primary/20"
          >
            Start Investing
          </motion.a>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Holdings Table */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold">Stock Positions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-textSecondary text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Stock</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Avg Price</th>
                    <th className="px-4 py-3 text-right">LTP</th>
                    <th className="px-4 py-3 text-right">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <motion.tr key={h.symbol} variants={itemVariants}
                      className="border-b border-border/40 hover:bg-surfaceHover/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{h.symbol}</p>
                        <p className="text-xs text-textSecondary">{h.name}</p>
                      </td>
                      <td className="px-4 py-4 text-right">{h.qty}</td>
                      <td className="px-4 py-4 text-right">₹{h.avg.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 text-right font-semibold">₹{h.curr.toLocaleString('en-IN')}</td>
                      <td className={`px-4 py-4 text-right font-semibold ${h.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {h.pnl >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                          ₹{Math.abs(h.pnl).toFixed(0)}
                        </div>
                        <p className="text-xs">{h.pnl_pct.toFixed(2)}%</p>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Sector Pie */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-xl p-5">
            <h3 className="font-semibold mb-4">Sector Allocation</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85}
                  paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, '']}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}
    </div>
  );
}
