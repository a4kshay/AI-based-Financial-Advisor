import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ComposedChart, Area, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

const QUICK_TICKERS = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'AAPL', 'MSFT'];

export default function StockPrediction() {
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [chartData, setChartData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sym = meta?.currency_symbol || '₹';

  const fetchLiveStock = async (e, symbolOverride) => {
    e?.preventDefault();
    const symbol = (symbolOverride || ticker).trim().toUpperCase();
    if (!symbol) return;

    setTicker(symbol);
    setLoading(true);
    setError('');
    setChartData(null);
    setMeta(null);

    try {
      const res = await axios.get(`/api/predict/${encodeURIComponent(symbol)}`);
      if (res.data.status === 'success') {
        const live = res.data.live || {};
        const livePrice = live.price ?? res.data.current_price;
        const forecast = res.data.forecast || {};
        setMeta({
          name: res.data.name,
          ticker: res.data.ticker,
          currency_symbol: res.data.currency_symbol || sym,
          price: livePrice,
          prev_close: live.prev_close ?? res.data.prev_close,
          change: live.change ?? res.data.change,
          change_pct: live.change_pct ?? res.data.change_pct,
          day_high: live.day_high ?? res.data.day_high,
          day_low: live.day_low ?? res.data.day_low,
          day_open: live.day_open ?? res.data.day_open,
          volume: live.volume ?? res.data.volume,
          as_of: live.as_of,
          data_source: res.data.data_source,
          disclaimer: res.data.disclaimer,
          sentiment: forecast.sentiment,
          forecast_target: forecast.forecast_target_price,
          forecast_change_pct: forecast.forecast_change_pct,
          forecast_days: forecast.forecast_days ?? 7,
          daily_trend_pct: forecast.daily_trend_pct,
        });

        const hist = res.data.historical.map((d) => ({
          date: d.date,
          price: d.price,
          high: d.high ?? d.price,
          low: d.low ?? d.price,
          open: d.open ?? d.price,
          volume: d.volume ?? 0,
          predicted: null,
          isForecast: false,
        }));
        const last = hist[hist.length - 1];
        const bridge = last ? { ...last, predicted: livePrice } : null;
        const preds = (res.data.prediction || []).map((d) => ({
          date: d.date,
          price: null,
          high: null,
          low: null,
          volume: null,
          predicted: d.predicted_price,
          predicted_upper: d.upper_bound,
          predicted_lower: d.lower_bound,
          isForecast: true,
        }));
        setChartData(bridge ? [...hist.slice(0, -1), bridge, ...preds] : [...hist, ...preds]);
      } else {
        setError(res.data.message || 'Could not fetch live price.');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load live market data.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLiveStock();
  }, []);

  const formatDate = (d) => {
    if (!d) return '';
    const parts = d.split('-');
    return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : d;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold">Stock Analysis & Price Forecast</h2>
          <p className="text-textSecondary text-sm">
            Live prices from Yahoo Finance · 7-day forecast from current trend analysis
          </p>
        </div>
        <form onSubmit={fetchLiveStock} className="flex relative w-full sm:w-auto">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g. RELIANCE.NS, TCS.NS, AAPL"
            className="bg-background border border-border rounded-l-lg pl-10 pr-4 py-2 focus:outline-none focus:border-primary w-full min-w-[200px]"
          />
          <Search className="absolute left-3 top-2.5 text-textSecondary" size={18} />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primaryHover px-4 rounded-r-lg font-medium transition disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? '...' : <><RefreshCw size={16} /> Live</>}
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_TICKERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => fetchLiveStock(null, t)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-primary/50 text-textSecondary hover:text-primary transition"
          >
            {t.replace('.NS', '')}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {meta?.forecast_target != null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">7-Day Forecast</p>
            <p className="text-2xl font-black text-white mt-1">
              {sym}{meta.forecast_target?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className={`text-sm font-semibold mt-1 ${meta.forecast_change_pct >= 0 ? 'text-success' : 'text-danger'}`}>
              {meta.forecast_change_pct >= 0 ? '+' : ''}{meta.forecast_change_pct}% from today
            </p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Trend Sentiment</p>
            <p className={`text-2xl font-black mt-1 ${
              meta.sentiment === 'Bullish' ? 'text-success' : meta.sentiment === 'Bearish' ? 'text-danger' : 'text-yellow-400'
            }`}>
              {meta.sentiment || 'Neutral'}
            </p>
            <p className="text-xs text-textSecondary mt-1">Daily drift: {meta.daily_trend_pct}%</p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Analysis Basis</p>
            <p className="text-sm text-white mt-2 leading-relaxed">
              Regression on 30-day closes + EMA momentum from present price ({sym}{meta.price?.toLocaleString()})
            </p>
          </div>
        </div>
      )}

      {meta && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-surface border border-border p-4 rounded-xl col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Live Price</p>
            <p className="text-2xl font-black text-white mt-1">
              {sym}{meta.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-textSecondary mt-1 truncate">{meta.name}</p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Change</p>
            <p className={`text-lg font-bold flex items-center gap-1 mt-1 ${meta.change_pct >= 0 ? 'text-success' : 'text-danger'}`}>
              {meta.change_pct >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {meta.change_pct >= 0 ? '+' : ''}{meta.change_pct}%
            </p>
            <p className="text-xs text-textSecondary">
              {meta.change >= 0 ? '+' : ''}{sym}{meta.change?.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Prev Close</p>
            <p className="text-lg font-semibold text-white mt-1">{sym}{meta.prev_close?.toLocaleString()}</p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Day High</p>
            <p className="text-lg font-semibold text-white mt-1">{sym}{meta.day_high?.toLocaleString()}</p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Day Low</p>
            <p className="text-lg font-semibold text-white mt-1">{sym}{meta.day_low?.toLocaleString()}</p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Volume</p>
            <p className="text-lg font-semibold text-white mt-1">{meta.volume?.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-6 min-h-[480px] flex flex-col">
        {!chartData && !loading && !error && (
          <div className="flex-1 flex items-center justify-center text-textSecondary">
            Search a ticker to view live price and 3-month history
          </div>
        )}
        {loading && (
          <div className="flex-1 flex items-center justify-center text-textSecondary animate-pulse">
            Fetching live market data...
          </div>
        )}
        {chartData && !loading && meta && (
          <>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">
                {meta.ticker} — History + 7-Day Forecast
              </h3>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded font-bold uppercase">Live</span>
                <span className="text-[10px] bg-success/20 text-success px-2 py-1 rounded font-bold uppercase">Forecast</span>
              </div>
            </div>
            <div className="mb-2">
              <p className="text-xs text-textSecondary mb-2 font-semibold uppercase tracking-wider">
                Blue = actual · Green dashed = predicted (from present price trend)
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="livePriceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDate}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    yAxisId="price"
                    stroke="#9CA3AF"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `${sym}${Number(v).toLocaleString()}`}
                    width={72}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', color: '#F3F4F6', borderRadius: 8 }}
                    labelFormatter={formatDate}
                    formatter={(val, name) => [`${sym}${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="high"
                    stroke="#10B981"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    fill="none"
                    name="Day High"
                    dot={false}
                  />
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="low"
                    stroke="#EF4444"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    fill="none"
                    name="Day Low"
                    dot={false}
                  />
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="price"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#livePriceGrad)"
                    name="Actual Close"
                    dot={false}
                    connectNulls={false}
                    activeDot={{ r: 5, fill: '#2563EB' }}
                  />
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="predicted"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    fill="none"
                    name="Forecast (7d)"
                    dot={{ r: 3, fill: '#10B981' }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Volume bar graph */}
            <div className="border-t border-border pt-4">
              <p className="text-xs text-textSecondary mb-2 font-semibold uppercase tracking-wider">Volume</p>
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={chartData.filter((d) => !d.isForecast)} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDate}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', color: '#F3F4F6', borderRadius: 8 }}
                    labelFormatter={formatDate}
                    formatter={(val) => [Number(val).toLocaleString('en-IN'), 'Volume']}
                  />
                  <Bar dataKey="volume" fill="#6366F1" fillOpacity={0.75} name="Volume" radius={[2, 2, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {meta.disclaimer && (
              <p className="text-[11px] text-textSecondary mt-3 border-t border-border pt-3">{meta.disclaimer}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
