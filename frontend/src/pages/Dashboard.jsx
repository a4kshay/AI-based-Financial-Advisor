import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, RefreshCw, ExternalLink, Briefcase, Compass, PieChart as PieIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// ── Animations ─────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 110 } }
};

// ── Dashboard ──────────────────────────────────────────────────
export default function Dashboard() {
  const [indices, setIndices] = useState([]);
  const [trendingStocks, setTrendingStocks] = useState([]);
  const [trendingSips, setTrendingSips] = useState([]);
  const [apiHoldings, setApiHoldings] = useState([]);
  const [loadingIndices, setLoadingIndices] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);

  useEffect(() => {
    fetchIndices();
    fetchTrending();
    fetchPortfolio();
    const iv = setInterval(fetchIndices, 60000);
    return () => clearInterval(iv);
  }, []);

  const holdings = apiHoldings.map(h => ({
    ...h,
    invested:   h.qty * h.avg,
    curr_value: h.qty * h.curr,
    pnl:        h.qty * (h.curr - h.avg),
    pnl_pct:    ((h.curr - h.avg) / h.avg) * 100,
  }));

  const totalInvested = holdings.reduce((a, h) => a + h.invested, 0);
  const totalValue    = holdings.reduce((a, h) => a + h.curr_value, 0);
  const totalPnL      = totalValue - totalInvested;
  const totalPnLPct   = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const portfolioGrowth = [
    { month: 'Invested', value: totalInvested },
    { month: 'Current', value: totalValue },
  ];

  const pieData = holdings.map(h => ({ name: h.symbol, value: Math.round(h.curr_value), color: h.color }));

  const fetchIndices = async () => {
    setLoadingIndices(true);
    try {
      const res = await axios.get('/api/indices');
      if (res.data.status === 'success') setIndices(res.data.data);
    } catch (e) {
      console.error("Fetch indices failed:", e);
    } finally {
      setLoadingIndices(false);
    }
  };

  const fetchTrending = async () => {
    setLoadingTrending(true);
    try {
      const res = await axios.get('/api/trending');
      if (res.data.status === 'success') {
        setTrendingStocks(res.data.stocks.slice(0, 4));
        setTrendingSips(res.data.sips.slice(0, 3));
      }
    } catch (e) {
      console.error("Fetch trending failed:", e);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchPortfolio = async () => {
    setLoadingPortfolio(true);
    try {
      const res = await axios.get('/api/portfolio');
      if (res.data.status === 'success') setApiHoldings(res.data.data);
    } catch (e) {
      console.error("Fetch portfolio failed:", e);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">

      {/* ── 1. Market Indices ───────────────────────────────── */}
      <section>
        <SectionHeader title="Market Overview" subtitle="Live Indian market indices" icon={<TrendingUp size={18}/>}
          action={<button onClick={fetchIndices} disabled={loadingIndices}
            className="flex items-center gap-1.5 text-xs text-textSecondary hover:text-primary transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={loadingIndices ? 'animate-spin' : ''}/> Refresh
          </button>} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loadingIndices && indices.length === 0 ? (
            [0,1,2].map(i => <SkeletonCard key={i}/>)
          ) : indices.map(idx => (
            <IndexCard key={idx.name} data={idx}/>
          ))}
        </div>
      </section>

      {/* ── 2. Portfolio Summary ─────────────────────────────── */}
      <section>
        <SectionHeader title="Portfolio" subtitle="Your total wealth overview" icon={<PieIcon size={18}/>}
          link="/dashboard/portfolio" linkLabel="Full View" />
        {loadingPortfolio ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0,1,2].map(i => <SkeletonCard key={i}/>)}
          </div>
        ) : holdings.length === 0 ? (
          <motion.div variants={itemVariants}
            className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <PieIcon size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Investments Yet</h3>
            <p className="text-textSecondary text-sm max-w-xs mb-5">
              You haven't added any holdings yet. Start investing to see your portfolio value, returns, and growth here.
            </p>
            <Link to="/dashboard/explore"
              className="bg-primary hover:bg-primaryHover text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/20">
              Explore Stocks to Invest
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 lg:col-span-1">
              {[
                { l: 'Current Value',  v: `₹${totalValue.toLocaleString('en-IN',{maximumFractionDigits:0})}`,    cls: 'text-primary' },
                { l: 'Total Invested', v: `₹${totalInvested.toLocaleString('en-IN',{maximumFractionDigits:0})}`, cls: 'text-textPrimary' },
                { l: 'Net P&L',        v: `${totalPnL>=0?'+':''}₹${Math.abs(totalPnL).toLocaleString('en-IN',{maximumFractionDigits:0})}`, cls: totalPnL>=0?'text-success':'text-danger' },
              ].map(k => (
                <div key={k.l} className="glass-card rounded-xl p-4">
                  <p className="text-xs text-textSecondary font-semibold uppercase tracking-wider mb-1">{k.l}</p>
                  <p className={`text-2xl font-bold ${k.cls}`}>{k.v}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-2 glass-card rounded-xl p-5">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                Portfolio Growth
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${totalPnL>=0?'bg-success/10 text-success':'bg-danger/10 text-danger'}`}>
                  {totalPnL>=0?'↑':'↓'} {totalPnLPct.toFixed(2)}%
                </span>
              </p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioGrowth}>
                    <defs>
                      <linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{backgroundColor:'#151A23',borderColor:'#2A303C',borderRadius:'8px',fontSize:'12px'}}
                      formatter={v=>[`₹${v.toLocaleString('en-IN')}`,'Value']}/>
                    <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5}
                      fill="url(#pgGrad)" activeDot={{r:5,strokeWidth:0,fill:'#2563EB'}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {/* ── 3. Holdings ──────────────────────────────────────── */}
      <section>
        <SectionHeader title="Holdings" subtitle="Your current stock positions" icon={<Briefcase size={18}/>}
          link="/dashboard/holdings" linkLabel="Full View" />
        {holdings.length === 0 ? (
          <motion.div variants={itemVariants}
            className="glass-card rounded-xl p-10 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-surfaceHover border border-border flex items-center justify-center mb-4">
              <Briefcase size={24} className="text-textSecondary" />
            </div>
            <p className="text-textSecondary text-sm">No stock positions yet.</p>
            <p className="text-textSecondary/60 text-xs mt-1">Your investment holdings will appear here.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Holdings Table */}
            <motion.div variants={itemVariants} className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-textSecondary text-xs uppercase tracking-wider border-b border-border">
                      {['Stock','Qty','Avg Cost','LTP','P&L'].map(h => (
                        <th key={h} className="px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(h => (
                      <tr key={h.symbol} className="border-b border-border/40 hover:bg-surfaceHover/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{background: h.color+'30', color: h.color}}>{h.symbol[0]}</div>
                            <div>
                              <p className="font-semibold text-xs">{h.symbol}</p>
                              <p className="text-xs text-textSecondary">{h.sector}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">{h.qty}</td>
                        <td className="px-4 py-3 text-xs">₹{h.avg.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs font-semibold">₹{h.curr.toLocaleString('en-IN')}</td>
                        <td className={`px-4 py-3 text-xs font-semibold ${h.pnl>=0?'text-success':'text-danger'}`}>
                          <div className="flex items-center gap-0.5">
                            {h.pnl>=0?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>}
                            ₹{Math.abs(h.pnl).toFixed(0)}
                          </div>
                          <p className="text-xs">{h.pnl_pct.toFixed(1)}%</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Allocation Donut */}
            <motion.div variants={itemVariants} className="glass-card rounded-xl p-5">
              <p className="text-sm font-semibold mb-3">Allocation</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={70}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor:'#151A23',borderColor:'#2A303C',borderRadius:'8px',fontSize:'11px'}}
                    formatter={v=>[`₹${v.toLocaleString('en-IN')}`,'']}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{background: d.color}}/>
                      <span className="text-textSecondary">{d.name}</span>
                    </div>
                    <span className="font-medium">₹{d.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {/* ── 4. Explore — Trending Stocks ─────────────────────── */}
      <section>
        <SectionHeader title="Explore" subtitle="Trending stocks right now" icon={<Compass size={18}/>}
          link="/dashboard/explore" linkLabel="See All" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {loadingTrending ? [0,1,2,3].map(i => <SkeletonCard key={i}/>) :
            trendingStocks.map(stock => {
              const isUp = stock.change >= 0;
              const sparkData = stock.sparkline?.map((v,i) => ({i,v})) || [];
              return (
                <motion.div key={stock.symbol} variants={itemVariants} whileHover={{y:-4,scale:1.02}}
                  className="glass-card rounded-xl p-4 relative overflow-hidden group cursor-default">
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br ${isUp?'from-success/5':'from-danger/5'} to-transparent`}/>
                  <div className="relative z-10">
                    <div className="mb-1">
                      <p className="text-xs text-textSecondary font-medium">{stock.symbol.replace('.NS','')}</p>
                      <p className="text-sm font-semibold leading-tight">{stock.name}</p>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <p className="text-xl font-bold">₹{stock.price?.toLocaleString('en-IN')}</p>
                        <p className={`text-xs font-semibold flex items-center gap-0.5 mt-0.5 ${isUp?'text-success':'text-danger'}`}>
                          {isUp?<TrendingUp size={11}/>:<TrendingDown size={11}/>}
                          {isUp?'+':''}{stock.change_pct}%
                        </p>
                      </div>
                      {sparkData.length>0 && (
                        <div className="w-20 h-10">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparkData}>
                              <Line type="monotone" dataKey="v" stroke={isUp?'#10B981':'#EF4444'} strokeWidth={1.5} dot={false}/>
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          }
        </div>

        {/* Popular SIPs Preview */}
        {!loadingTrending && trendingSips.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-textSecondary font-bold uppercase tracking-widest mb-3 px-1">Top Rated SIPs</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trendingSips.map((sip, idx) => (
                <motion.div key={idx} variants={itemVariants} 
                  className="glass-card rounded-xl p-4 flex items-center justify-between border-l-4 border-primary">
                  <div>
                    <p className="text-xs font-semibold">{sip.name}</p>
                    <p className="text-[10px] text-textSecondary">{sip.category}</p>
                  </div>
                  <div className="text-right text-success">
                    <p className="text-sm font-bold">+{sip.returns_1y}%</p>
                    <p className="text-[9px] text-textSecondary">1Y Returns</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </section>

    </motion.div>
  );
}


// ── Helpers ──────────────────────────────────────────────────

function SectionHeader({ title, subtitle, icon, link, linkLabel, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="text-primary">{icon}</div>
        <div>
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          {subtitle && <p className="text-textSecondary text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {action}
        {link && (
          <Link to={link} className="flex items-center gap-1 text-xs text-primary hover:text-blue-400 font-medium transition-colors">
            {linkLabel} <ExternalLink size={11}/>
          </Link>
        )}
      </div>
    </div>
  );
}

function IndexCard({ data }) {
  const isPositive = data.change >= 0;
  const sparkData  = data.sparkline?.map((val, i) => ({ i, val })) || [];

  return (
    <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -4 }}
      className="glass-card rounded-xl p-5 cursor-default relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl -mr-14 -mt-14 pointer-events-none ${isPositive?'bg-success/10':'bg-danger/10'}`}/>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-textSecondary tracking-wider">{data.name}</span>
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isPositive?'bg-success/10 text-success':'bg-danger/10 text-danger'}`}>
            {isPositive?<ArrowUpRight size={10}/>:<ArrowDownRight size={10}/>}
            {data.change_pct}%
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          {data.price.toLocaleString('en-IN',{maximumFractionDigits:2})}
        </h2>
        <p className={`text-sm font-medium mt-0.5 mb-3 ${isPositive?'text-success':'text-danger'}`}>
          {isPositive?'+':''}{data.change.toLocaleString('en-IN',{maximumFractionDigits:2})}
        </p>
        {sparkData.length > 0 && (
          <div className="h-12 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="val" stroke={isPositive?'#10B981':'#EF4444'} strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {data.high > 0 && (
          <div className="flex justify-between text-xs text-textSecondary mt-2 pt-2 border-t border-border/50">
            <span>L: {data.low?.toLocaleString('en-IN')}</span>
            <span>H: {data.high?.toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <motion.div variants={itemVariants} className="glass-card rounded-xl p-5 animate-pulse">
      <div className="h-3 bg-surfaceHover rounded w-20 mb-3"/>
      <div className="h-7 bg-surfaceHover rounded w-28 mb-2"/>
      <div className="h-3 bg-surfaceHover rounded w-16 mb-4"/>
      <div className="h-12 bg-surfaceHover rounded"/>
    </motion.div>
  );
}
