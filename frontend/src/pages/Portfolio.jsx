import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import axios from 'axios';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } }
};

export default function Portfolio() {
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
      console.error("Fetch portfolio failed:", e);
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
  }));

  const totalInvested = holdings.reduce((a, h) => a + h.invested, 0);
  const totalValue    = holdings.reduce((a, h) => a + h.curr_value, 0);
  const totalPnL      = totalValue - totalInvested;
  const totalPnLPct   = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const isOverallUp   = totalPnL >= 0;

  const pieData = holdings.map(h => ({ name: h.symbol, value: Math.round(h.curr_value), color: h.color }));

  // Growth comparison: invested vs current
  const portfolioGrowth = [
    { month: 'Invested', value: totalInvested },
    { month: 'Current', value: totalValue },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Wallet size={22} className="text-primary" />
          Portfolio
        </h2>
        <p className="text-textSecondary text-sm mt-0.5">Your complete financial overview</p>
      </div>

      {/* Top KPI Row */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible"
        className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Value',    value: `₹${totalValue.toLocaleString('en-IN', {maximumFractionDigits:0})}`, sub: `${holdings.length} stock${holdings.length !== 1 ? 's' : ''}`, color: 'text-primary' },
          { label: 'Net P&L',        value: `${isOverallUp ? '+' : ''}₹${Math.abs(totalPnL).toLocaleString('en-IN', {maximumFractionDigits:0})}`, sub: `${totalPnLPct.toFixed(2)}%`, color: isOverallUp ? 'text-success' : 'text-danger' },
          { label: 'Total Invested', value: `₹${totalInvested.toLocaleString('en-IN', {maximumFractionDigits:0})}`, sub: 'Cost basis', color: 'text-textPrimary' },
        ].map(k => (
          <motion.div key={k.label} variants={itemVariants} whileHover={{ y: -3 }}
            className="glass-card rounded-xl p-5 cursor-default">
            <p className="text-xs text-textSecondary font-semibold uppercase tracking-wider mb-2">{k.label}</p>
            <p className={`text-2xl font-bold mb-1 ${k.color}`}>{k.value}</p>
            <p className="text-xs text-textSecondary">{k.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {holdings.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card rounded-xl p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
            <Wallet size={40} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-3">Portfolio Empty</h3>
          <p className="text-textSecondary text-sm max-w-sm mb-8">
            Build your wealth today. Invest in stocks or start a SIP to track your growth here.
          </p>
          <motion.a 
            href="/dashboard/explore"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-primary hover:bg-primaryHover text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-primary/20"
          >
            Go to Explore
          </motion.a>
        </motion.div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Growth Chart */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 glass-card rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                Portfolio Growth
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isOverallUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {isOverallUp ? '↑' : '↓'} {totalPnLPct.toFixed(2)}%
                </span>
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioGrowth}>
                    <defs>
                      <linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', borderRadius: '10px', fontSize: '13px' }}
                      formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Value']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5}
                      fill="url(#pgGrad)" activeDot={{ r: 5, strokeWidth: 0, fill: '#2563EB' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Allocation Pie */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-xl p-5">
              <h3 className="font-semibold mb-3">Allocation</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', borderRadius: '8px', fontSize: '12px' }}
                    formatter={v => [`₹${v.toLocaleString('en-IN')}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-textSecondary">{d.name}</span>
                    </div>
                    <span className="font-medium">₹{d.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Holdings Table */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold">Positions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-textSecondary text-xs uppercase tracking-wider border-b border-border">
                    {['Stock', 'Qty', 'Avg Cost', 'LTP', 'Curr Value', 'P&L'].map(h => (
                      <th key={h} className="px-5 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map(h => (
                    <tr key={h.symbol}
                      className="border-b border-border/40 hover:bg-surfaceHover/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: h.color + '30', color: h.color }}>
                            {h.symbol[0]}
                          </div>
                          <div>
                            <p className="font-semibold">{h.symbol}</p>
                            <p className="text-xs text-textSecondary">{h.sector}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">{h.qty}</td>
                      <td className="px-5 py-3">₹{h.avg.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 font-semibold">₹{h.curr.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3">₹{h.curr_value.toLocaleString('en-IN', {maximumFractionDigits:0})}</td>
                      <td className={`px-5 py-3 font-semibold ${h.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        <div className="flex items-center gap-1">
                          {h.pnl >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                          ₹{Math.abs(h.pnl).toFixed(0)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
