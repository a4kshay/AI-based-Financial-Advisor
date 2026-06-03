import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Search } from 'lucide-react';
import axios from 'axios';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } }
};

export default function Explore() {
  const [tab, setTab] = useState('stocks');
  const [data, setData] = useState({ stocks: [], sips: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/trending');
      if (res.data.status === 'success') {
        setData(res.data);
      }
    } catch (e) {
      console.error("Fetch trending failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredStocks = data.stocks.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Explore</h2>
          <p className="text-textSecondary text-sm mt-0.5">Trending stocks and top-performing SIPs</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 text-sm text-textSecondary hover:text-primary transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border p-1 rounded-xl w-fit">
        {['stocks', 'sips'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              tab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-textSecondary hover:text-textPrimary'
            }`}>
            {t === 'stocks' ? '📈 Trending Stocks' : '💰 Top SIPs'}
          </button>
        ))}
      </div>

      {tab === 'stocks' && (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" size={16} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search stocks..."
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>

          {/* Stocks Grid */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {loading ? (
              Array.from({length: 8}).map((_, i) => (
                <motion.div key={i} variants={itemVariants}
                  className="glass-card rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-surfaceHover rounded w-20 mb-3" />
                  <div className="h-6 bg-surfaceHover rounded w-28 mb-2" />
                  <div className="h-3 bg-surfaceHover rounded w-16 mb-4" />
                  <div className="h-10 bg-surfaceHover rounded" />
                </motion.div>
              ))
            ) : filteredStocks.map(stock => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </motion.div>
        </>
      )}

      {tab === 'sips' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.sips.map((sip, i) => (
            <motion.div key={i} variants={itemVariants} whileHover={{ y: -4, scale: 1.01 }}
              className="glass-card rounded-xl p-5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    sip.category === 'Small Cap' ? 'bg-orange-500/20 text-orange-400' :
                    sip.category === 'Mid Cap' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{sip.category}</span>
                  <span className="text-success text-sm font-bold">+{sip.returns_1y}%</span>
                </div>
                <h3 className="text-sm font-semibold mb-1 leading-snug">{sip.name}</h3>
                <p className="text-textSecondary text-xs mb-4">1Y Returns</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-textSecondary">Min SIP</span>
                  <span className="font-semibold text-textPrimary">₹{sip.min_sip}/mo</span>
                </div>
                <button className="w-full mt-3 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-semibold py-2 rounded-lg transition-all border border-primary/30 hover:border-primary">
                  + Start SIP
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function StockCard({ stock }) {
  const isUp = stock.change >= 0;
  const sparkData = stock.sparkline?.map((v, i) => ({ i, v })) || [];

  return (
    <motion.div variants={itemVariants} whileHover={{ y: -4, scale: 1.02 }}
      className="glass-card rounded-xl p-4 cursor-default relative overflow-hidden group">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br ${
        isUp ? 'from-success/5' : 'from-danger/5'} to-transparent`} />
      <div className="relative z-10">
        <div className="mb-1">
          <p className="text-xs text-textSecondary font-medium">{stock.symbol.replace('.NS','')}</p>
          <p className="text-sm font-semibold leading-tight">{stock.name}</p>
        </div>
        <div className="flex items-end justify-between mt-2">
          <div>
            <p className="text-xl font-bold">₹{stock.price?.toLocaleString('en-IN')}</p>
            <p className={`text-xs font-semibold flex items-center gap-0.5 mt-0.5 ${isUp ? 'text-success' : 'text-danger'}`}>
              {isUp ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
              {isUp ? '+' : ''}{stock.change_pct}%
            </p>
          </div>
          {sparkData.length > 0 && (
            <div className="w-20 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line type="monotone" dataKey="v" stroke={isUp ? '#10B981' : '#EF4444'} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-xs text-textSecondary">
          <span>{stock.sector}</span>
          <span className={isUp ? 'text-success' : 'text-danger'}>
            {isUp ? '+' : ''}₹{stock.change?.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
