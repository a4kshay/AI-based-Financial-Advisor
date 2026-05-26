import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  TrendingUp, TrendingDown, RefreshCw, Activity,
  ArrowUpRight, ArrowDownRight, Clock, Wifi
} from 'lucide-react';
import axios from 'axios';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

const INDEX_META = {
  'SENSEX':    { color: '#F59E0B', gradient: 'from-amber-500/20 to-transparent' },
  'NIFTY 50':  { color: '#2563EB', gradient: 'from-blue-500/20 to-transparent'  },
  'BANK NIFTY':{ color: '#8B5CF6', gradient: 'from-violet-500/20 to-transparent' },
};

function formatINR(n) {
  if (!n && n !== 0) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function LiveDot() {
  return (
    <span className="relative inline-flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <span className="text-green-400 text-xs font-semibold tracking-wide">LIVE</span>
    </span>
  );
}

// ── Ticker Tape ───────────────────────────────────────────────
function TickerTape({ indices }) {
  if (!indices.length) return null;
  const items = [...indices, ...indices]; // double for seamless loop
  return (
    <div className="overflow-hidden border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="flex animate-marquee whitespace-nowrap py-2 gap-10">
        {items.map((idx, i) => {
          const isUp = idx.change >= 0;
          return (
            <span key={i} className="inline-flex items-center gap-2 text-xs">
              <span className="font-bold text-textPrimary">{idx.name}</span>
              <span className="font-semibold">{formatINR(idx.price)}</span>
              <span className={`flex items-center gap-0.5 font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {isUp ? '+' : ''}{formatINR(idx.change)} ({isUp ? '+' : ''}{idx.change_pct?.toFixed(2)}%)
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Big Index Card ────────────────────────────────────────────
function IndexCard({ data, selected, onClick }) {
  const meta = INDEX_META[data.name] || { color: '#2563EB', gradient: 'from-blue-500/20 to-transparent' };
  const isUp = data.change >= 0;
  const sparkData = data.sparkline?.map((v, i) => ({ i, v })) || [];

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, scale: 1.015 }}
      onClick={onClick}
      className={`glass-card rounded-2xl p-5 cursor-pointer relative overflow-hidden transition-all duration-200 ${
        selected ? 'ring-2' : 'ring-0 hover:ring-1 hover:ring-border'
      }`}
      style={{ '--tw-ring-color': meta.color + '60' }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} pointer-events-none`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold tracking-wider text-textSecondary">{data.name}</span>
          <span
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              isUp ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
            }`}
          >
            {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {isUp ? '+' : ''}{data.change_pct?.toFixed(2)}%
          </span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight mt-1">{formatINR(data.price)}</h2>
        <p className={`text-sm font-semibold mt-0.5 mb-3 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '+' : ''}{formatINR(data.change)}
        </p>
        {sparkData.length > 0 && (
          <div className="h-14">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke={meta.color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex justify-between text-[11px] text-textSecondary mt-2 pt-2 border-t border-border/50">
          <span>L: {formatINR(data.low)}</span>
          <span>H: {formatINR(data.high)}</span>
          <span>Prev: {formatINR(data.prev_close)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5 animate-pulse">
      <div className="h-3 bg-surfaceHover rounded w-24 mb-3" />
      <div className="h-8 bg-surfaceHover rounded w-36 mb-2" />
      <div className="h-3 bg-surfaceHover rounded w-20 mb-4" />
      <div className="h-14 bg-surfaceHover rounded" />
    </motion.div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs border border-border shadow-xl">
      <p className="text-textSecondary mb-0.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {p.name}: ₹{p.value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function LiveMarket() {
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchIndices = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/indices');
      if (res.data.status === 'success') {
        setIndices(res.data.data);
        setLastUpdated(new Date());
        setCountdown(60);
      }
    } catch (e) {
      console.error('LiveMarket fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndices();
    intervalRef.current = setInterval(fetchIndices, 60000);
    countdownRef.current = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 60)), 1000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  const selected = indices[selectedIdx];
  const chartData = (() => {
    if (!selected) return [];
    const hist = (selected.sparkline || []).map((v, i) => ({ day: `D${i + 1}`, price: v, predicted: null }));
    const preds = (selected.prediction || []).map((p, i) => ({ day: `F${i + 1}`, price: null, predicted: p.predicted_price }));
    
    if (hist.length > 0 && preds.length > 0) {
      const lastHist = hist[hist.length - 1];
      hist[hist.length - 1] = { ...lastHist, predicted: lastHist.price };
    }
    return [...hist, ...preds];
  })();
  const meta = selected ? (INDEX_META[selected.name] || { color: '#2563EB' }) : { color: '#2563EB' };

  // Market stats cards
  const stats = selected ? [
    { label: 'Current Price', value: `₹${formatINR(selected.price)}`, cls: 'text-textPrimary' },
    { label: 'Day High',      value: `₹${formatINR(selected.high)}`,  cls: 'text-green-400' },
    { label: 'Day Low',       value: `₹${formatINR(selected.low)}`,   cls: 'text-red-400' },
    { label: 'Prev Close',    value: `₹${formatINR(selected.prev_close)}`, cls: 'text-textSecondary' },
    { label: 'Change',        value: `${selected.change >= 0 ? '+' : ''}₹${formatINR(selected.change)}`, cls: selected.change >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: '% Change',      value: `${selected.change_pct >= 0 ? '+' : ''}${selected.change_pct?.toFixed(2)}%`, cls: selected.change_pct >= 0 ? 'text-green-400' : 'text-red-400' },
  ] : [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity size={22} className="text-primary" />
            <h1 className="text-2xl font-extrabold">Live Market</h1>
            <LiveDot />
          </div>
          <p className="text-textSecondary text-sm">
            Real-time Indian market indices — Sensex, Nifty 50 &amp; Bank Nifty
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-textSecondary">
              <Clock size={12} />
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-textSecondary bg-surfaceHover px-2.5 py-1.5 rounded-lg border border-border">
            <Wifi size={11} className="text-green-400" />
            Refresh in {countdown}s
          </div>
          <button
            onClick={fetchIndices}
            disabled={loading}
            className="flex items-center gap-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* ── Ticker tape ── */}
      <motion.div variants={itemVariants} className="rounded-xl overflow-hidden border border-border">
        <TickerTape indices={indices} />
      </motion.div>

      {/* ── Index Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading && indices.length === 0
          ? [0, 1, 2].map(i => <SkeletonCard key={i} />)
          : indices.map((idx, i) => (
              <IndexCard
                key={idx.name}
                data={idx}
                selected={selectedIdx === i}
                onClick={() => setSelectedIdx(i)}
              />
            ))}
      </div>

      {/* ── Detail Chart ── */}
      {selected && (
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-3 h-3 rounded-full" style={{ background: meta.color }} />
                <h3 className="text-lg font-bold">{selected.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${selected.change >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                  {selected.change >= 0 ? '▲' : '▼'} {selected.change_pct?.toFixed(2)}%
                </span>
              </div>
              <p className="text-textSecondary text-xs">30-day price trend</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold">₹{formatINR(selected.price)}</p>
              <p className={`text-sm font-semibold ${selected.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {selected.change >= 0 ? '+' : ''}{formatINR(selected.change)} today
              </p>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={meta.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={meta.color} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                <XAxis dataKey="day" stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false}
                  interval="preserveStartEnd" minTickGap={20} />
                <YAxis stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} width={68}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="price" stroke={meta.color} strokeWidth={2.5}
                  fill="url(#areaGrad)" activeDot={{ r: 5, strokeWidth: 0, fill: meta.color }} name="Actual" connectNulls={false} />
                <Area type="monotone" dataKey="predicted" stroke="#10B981" strokeWidth={2.5} strokeDasharray="6 4"
                  fill="none" name="Forecast (7d)" dot={{ r: 3, fill: '#10B981' }} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {selected.forecast && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
              <div>
                <p className="text-xs text-textSecondary uppercase tracking-wider font-bold mb-1">7-Day Forecast</p>
                <p className="text-xl font-extrabold">₹{formatINR(selected.forecast.forecast_target_price)}</p>
                <p className={`text-sm font-semibold ${selected.forecast.forecast_change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {selected.forecast.forecast_change_pct >= 0 ? '+' : ''}{selected.forecast.forecast_change_pct}%
                </p>
              </div>
              <div>
                <p className="text-xs text-textSecondary uppercase tracking-wider font-bold mb-1">Trend Sentiment</p>
                <p className={`text-xl font-extrabold ${selected.forecast.sentiment === 'Bullish' ? 'text-green-400' : selected.forecast.sentiment === 'Bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {selected.forecast.sentiment}
                </p>
              </div>
              <div>
                <p className="text-xs text-textSecondary uppercase tracking-wider font-bold mb-1">Analysis Detail</p>
                <p className="text-sm font-semibold text-textPrimary">Daily Drift: {selected.forecast.daily_trend_pct}%</p>
                <p className="text-sm font-semibold text-textSecondary">Volatility: {selected.forecast.volatility_pct}%</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Stats Grid ── */}
      {stats.length > 0 && (
        <motion.div variants={itemVariants}>
          <p className="text-xs text-textSecondary font-bold uppercase tracking-widest mb-3 px-1">
            {selected?.name} — Key Statistics
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {stats.map(s => (
              <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                <p className="text-[10px] text-textSecondary uppercase tracking-wider mb-1 font-semibold">{s.label}</p>
                <p className={`text-base font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── All Indices Comparison ── */}
      {indices.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
          <p className="text-sm font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-primary" /> All Indices Snapshot
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-textSecondary text-xs uppercase tracking-wider border-b border-border">
                  {['Index', 'Price', 'Change', '% Change', 'Day High', 'Day Low', 'Prev Close'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {indices.map((idx, i) => {
                  const up = idx.change >= 0;
                  const m = INDEX_META[idx.name] || { color: '#2563EB' };
                  return (
                    <tr
                      key={idx.name}
                      onClick={() => setSelectedIdx(i)}
                      className="border-b border-border/40 hover:bg-surfaceHover/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                          <span className="font-bold text-xs">{idx.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">₹{formatINR(idx.price)}</td>
                      <td className={`px-4 py-3 font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
                        {up ? '+' : ''}{formatINR(idx.change)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit ${up ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                          {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {up ? '+' : ''}{idx.change_pct?.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-green-400 font-medium">₹{formatINR(idx.high)}</td>
                      <td className="px-4 py-3 text-xs text-red-400 font-medium">₹{formatINR(idx.low)}</td>
                      <td className="px-4 py-3 text-xs text-textSecondary">₹{formatINR(idx.prev_close)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
