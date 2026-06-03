import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ComposedChart, Area, Line, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import {
  Search, TrendingUp, TrendingDown, RefreshCw, BarChart2,
  Info, ShieldAlert, Sliders, Play, FileText, ChevronRight, Activity, Calendar
} from 'lucide-react';

const QUICK_TICKERS = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'AAPL', 'MSFT', 'GOOGL', 'TSLA'];

export default function StockPrediction() {
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [rawHistorical, setRawHistorical] = useState([]);
  const [predictionTrend, setPredictionTrend] = useState([]);
  const [forecastTrend, setForecastTrend] = useState({});
  const [forecastHW, setForecastHW] = useState([]);
  const [forecastMC, setForecastMC] = useState([]);
  const [mcPaths, setMcPaths] = useState([]);
  const [mcStats, setMcStats] = useState(null);
  const [techAnalysis, setTechAnalysis] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // UI States
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'indicators', 'chart', 'montecarlo', 'report'
  const [forecastModel, setForecastModel] = useState('hw'); // 'none', 'trend', 'hw'
  const [timeRange, setTimeRange] = useState('3M'); // '1M', '3M', '1Y'
  
  // Indicator overlays
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);
  const [showSma200, setShowSma200] = useState(false);
  const [showBBands, setShowBBands] = useState(false);

  // Monte Carlo Probability Target Calculator state
  const [mcTargetPrice, setMcTargetPrice] = useState('');
  const [mcTargetDirection, setMcTargetDirection] = useState('above'); // 'above', 'below'
  const [calculatedProbability, setCalculatedProbability] = useState(null);

  const sym = meta?.currency_symbol || '₹';

  const fetchLiveStock = async (e, symbolOverride) => {
    e?.preventDefault();
    const symbol = (symbolOverride || ticker).trim().toUpperCase();
    if (!symbol) return;

    setTicker(symbol);
    setLoading(true);
    setError('');
    
    // Reset data
    setRawHistorical([]);
    setPredictionTrend([]);
    setForecastTrend({});
    setForecastHW([]);
    setForecastMC([]);
    setMcPaths([]);
    setMcStats(null);
    setTechAnalysis(null);
    setMeta(null);
    setCalculatedProbability(null);

    try {
      const res = await axios.get(`/api/predict/${encodeURIComponent(symbol)}`);
      if (res.data.status === 'success') {
        const live = res.data.live || {};
        const livePrice = live.price ?? res.data.current_price;
        
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
        });

        // Backend returns:
        // - historical: [ {date, price, open, high, low, volume, sma20, sma50, sma200, rsi, macd, macd_signal, macd_hist, bb_upper, bb_lower, bb_middle} ]
        setRawHistorical(res.data.historical || []);
        
        // Predictions
        setPredictionTrend(res.data.prediction || []);
        setForecastTrend(res.data.forecast || {});
        setForecastHW(res.data.holt_winters || []);
        
        // Monte Carlo simulation data
        const mcData = res.data.monte_carlo || {};
        setForecastMC(mcData.forecast || []);
        setMcPaths(mcData.paths || []);
        setMcStats(mcData.stats || null);
        
        // Technical analysis narrative & consensus
        setTechAnalysis(res.data.technical_analysis || null);

        // Pre-fill Monte Carlo calculator target price to current price
        setMcTargetPrice(Math.round(livePrice).toString());
      } else {
        setError(res.data.message || 'Could not fetch stock data.');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load market data.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLiveStock();
  }, []);

  // Filter historical data on chart based on range
  const getFilteredHistory = () => {
    if (!rawHistorical.length) return [];
    
    let count = 90; // Default 3M (roughly 60-90 trading days)
    if (timeRange === '1M') count = 22;
    if (timeRange === '1Y') count = rawHistorical.length;
    
    return rawHistorical.slice(-count);
  };

  // Build chart dataset combining historical + selected forecast model
  const getChartData = () => {
    const history = getFilteredHistory().map((d) => ({
      date: d.date,
      price: d.price,
      high: d.high,
      low: d.low,
      sma20: d.sma20,
      sma50: d.sma50,
      sma200: d.sma200,
      bb_upper: d.bb_upper,
      bb_lower: d.bb_lower,
      bb_middle: d.bb_middle,
      volume: d.volume,
      forecast: null,
      forecast_lower: null,
      forecast_upper: null,
      isForecast: false,
    }));

    if (!history.length || !meta) return [];

    const lastHist = history[history.length - 1];
    let preds = [];

    if (forecastModel === 'trend') {
      // 7-day trend regression
      preds = predictionTrend.map((p) => ({
        date: p.date,
        price: null,
        high: null,
        low: null,
        forecast: p.predicted_price,
        forecast_lower: p.lower_bound,
        forecast_upper: p.upper_bound,
        isForecast: true,
      }));
    } else if (forecastModel === 'hw') {
      // 30-day double exponential smoothing
      preds = forecastHW.map((p) => ({
        date: p.date,
        price: null,
        high: null,
        low: null,
        forecast: p.predicted_price,
        forecast_lower: null,
        forecast_upper: null,
        isForecast: true,
      }));
    }

    // Add a bridge point to connect historical close with forecast line smoothly
    const bridge = lastHist ? {
      ...lastHist,
      forecast: lastHist.price,
      forecast_lower: lastHist.price,
      forecast_upper: lastHist.price,
    } : null;

    if (bridge && preds.length > 0) {
      return [...history.slice(0, -1), bridge, ...preds];
    }

    return history;
  };

  // Build chart data for Monte Carlo path rendering
  const getMonteCarloChartData = () => {
    const history = getFilteredHistory().map((d) => ({
      date: d.date,
      price: d.price,
      isForecast: false,
    }));

    if (!history.length || !meta || !forecastMC.length) return [];

    const lastPrice = meta.price;
    const lastDate = history[history.length - 1].date;

    // Create paths projection structure
    // Each index of path projections will map dates to pricing of the 10 selected paths
    const projectedSteps = forecastMC.map((mcPoint, stepIdx) => {
      const stepData = {
        date: mcPoint.date,
        median: mcPoint.predicted_price,
        lower: mcPoint.lower_bound,
        upper: mcPoint.upper_bound,
        isForecast: true,
      };
      
      // Inject the price for each of the 10 sampled paths at this specific stepIdx
      mcPaths.forEach((path, pathIdx) => {
        stepData[`path_${pathIdx}`] = path[stepIdx]?.price ?? null;
      });

      return stepData;
    });

    // Bridge point to connect actual line to the simulation bounds
    const bridge = {
      date: lastDate,
      price: lastPrice,
      median: lastPrice,
      lower: lastPrice,
      upper: lastPrice,
      isForecast: false,
    };
    mcPaths.forEach((_, pathIdx) => {
      bridge[`path_${pathIdx}`] = lastPrice;
    });

    return [...history.slice(0, -1), bridge, ...projectedSteps];
  };

  const handleCalculateProbability = (e) => {
    e?.preventDefault();
    if (!mcStats || !mcTargetPrice) return;
    
    const target = parseFloat(mcTargetPrice);
    if (isNaN(target) || target <= 0) return;

    const endingPrices = mcStats.ending_prices;
    let count = 0;

    if (mcTargetDirection === 'above') {
      count = endingPrices.filter((p) => p >= target).length;
    } else {
      count = endingPrices.filter((p) => p <= target).length;
    }

    const prob = (count / endingPrices.length) * 100;
    setCalculatedProbability(Math.round(prob * 10) / 10); // 1 decimal place
  };

  const formatDate = (d) => {
    if (!d) return '';
    const parts = d.split('-');
    return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : d;
  };

  const getConsensusColor = (consensus) => {
    if (!consensus) return 'text-gray-400 bg-gray-900 border-gray-800';
    const c = consensus.toUpperCase();
    if (c.includes('STRONG BUY')) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
    if (c.includes('BUY')) return 'text-green-400 bg-green-950/40 border-green-900/40';
    if (c.includes('STRONG SELL')) return 'text-rose-400 bg-rose-950/40 border-rose-800/40';
    if (c.includes('SELL')) return 'text-red-400 bg-red-950/40 border-red-900/40';
    return 'text-amber-400 bg-amber-950/40 border-amber-900/40';
  };

  const getSignalBadgeColor = (signal) => {
    if (!signal) return 'text-gray-400 bg-gray-900/30';
    const s = signal.toUpperCase();
    if (s.includes('BULLISH')) return 'text-green-400 bg-green-900/20';
    if (s.includes('BEARISH')) return 'text-red-400 bg-red-900/20';
    return 'text-gray-400 bg-gray-900/20';
  };

  const chartDataCombined = getChartData();
  const mcChartData = getMonteCarloChartData();

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">AI Stock Analysis & Forecast</h2>
          <p className="text-textSecondary text-sm">
            Live prices from Yahoo Finance · Advanced mathematical forecasts & technical indicators
          </p>
        </div>
        <form onSubmit={fetchLiveStock} className="flex relative w-full sm:w-auto">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g. RELIANCE.NS, AAPL, TSLA"
            className="bg-background border border-border rounded-l-lg pl-10 pr-4 py-2 focus:outline-none focus:border-primary text-white w-full min-w-[220px] transition-colors"
          />
          <Search className="absolute left-3 top-2.5 text-textSecondary" size={18} />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primaryHover text-white px-4 rounded-r-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <><RefreshCw size={16} /> Load</>}
          </button>
        </form>
      </div>

      {/* Quick Tickers Row */}
      <div className="flex flex-wrap gap-2">
        {QUICK_TICKERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => fetchLiveStock(null, t)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              meta?.ticker === t
                ? 'border-primary bg-primary/10 text-primary font-bold'
                : 'border-border bg-surface hover:border-primary/50 text-textSecondary hover:text-primary'
            }`}
          >
            {t.replace('.NS', '')}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-3">
          <ShieldAlert size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Market KPIs */}
      {meta && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-surface border border-border p-4 rounded-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Live Price</p>
            <p className="text-2xl font-black text-white mt-1">
              {sym}{meta.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-textSecondary mt-1 truncate font-medium">{meta.name}</p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl relative overflow-hidden">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Day Change</p>
            <p className={`text-xl font-bold flex items-center gap-1 mt-1 ${meta.change_pct >= 0 ? 'text-success' : 'text-danger'}`}>
              {meta.change_pct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {meta.change_pct >= 0 ? '+' : ''}{meta.change_pct}%
            </p>
            <p className="text-xs text-textSecondary">
              {meta.change >= 0 ? '+' : ''}{sym}{meta.change?.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Prev Close</p>
            <p className="text-lg font-semibold text-white mt-1">{sym}{meta.prev_close?.toLocaleString()}</p>
            <p className="text-xs text-textSecondary mt-1">Previous Close</p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Day Range</p>
            <p className="text-sm font-semibold text-white mt-1">
              {sym}{meta.day_low?.toLocaleString()} - {sym}{meta.day_high?.toLocaleString()}
            </p>
            <div className="w-full bg-border h-1.5 rounded-full mt-2 overflow-hidden relative">
              {meta.day_high !== meta.day_low && (
                <div
                  className="bg-primary h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((meta.price - meta.day_low) / (meta.day_high - meta.day_low)) * 100))}%`
                  }}
                />
              )}
            </div>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Day Open</p>
            <p className="text-lg font-semibold text-white mt-1">{sym}{meta.day_open?.toLocaleString()}</p>
            <p className="text-xs text-textSecondary mt-1">Open Price</p>
          </div>
          <div className="bg-surface border border-border p-4 rounded-xl">
            <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Volume</p>
            <p className="text-lg font-semibold text-white mt-1">
              {meta.volume >= 1e6 ? `${(meta.volume / 1e6).toFixed(2)}M` : meta.volume?.toLocaleString()}
            </p>
            <p className="text-xs text-textSecondary mt-1">Shares Traded</p>
          </div>
        </div>
      )}

      {/* Tabs System */}
      {meta && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-border bg-surfaceHover/30 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview & Predictions', icon: <Sliders size={16} /> },
              { id: 'chart', label: 'Technical Overlay Chart', icon: <Activity size={16} /> },
              { id: 'indicators', label: 'Technical Indicators', icon: <BarChart2 size={16} /> },
              { id: 'montecarlo', label: 'Monte Carlo Simulator', icon: <Play size={16} /> },
              { id: 'report', label: 'AI Analytical Report', icon: <FileText size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-surfaceHover/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Body */}
          <div className="p-6">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Chart header filters */}
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-textSecondary uppercase tracking-wider">Forecast Model:</span>
                      <div className="flex rounded-lg border border-border p-0.5 bg-background">
                        <button
                          onClick={() => setForecastModel('none')}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                            forecastModel === 'none' ? 'bg-surface text-white font-bold shadow' : 'text-textSecondary'
                          }`}
                        >
                          None
                        </button>
                        <button
                          onClick={() => setForecastModel('trend')}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                            forecastModel === 'trend' ? 'bg-primary text-white font-bold shadow' : 'text-textSecondary'
                          }`}
                        >
                          Trend (7d)
                        </button>
                        <button
                          onClick={() => setForecastModel('hw')}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition ${
                            forecastModel === 'hw' ? 'bg-success text-white font-bold shadow' : 'text-textSecondary'
                          }`}
                        >
                          Holt-Winters (30d)
                        </button>
                      </div>
                    </div>

                    <div className="flex rounded-lg border border-border p-0.5 bg-background">
                      {['1M', '3M', '1Y'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`text-xs px-3 py-1 rounded-md font-bold transition ${
                            timeRange === range ? 'bg-surface text-white' : 'text-textSecondary'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart representation */}
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartDataCombined} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatDate}
                          minTickGap={30}
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          domain={['auto', 'auto']}
                          tickFormatter={(v) => `${sym}${v.toLocaleString()}`}
                          width={60}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#1F2937', color: '#F3F4F6', borderRadius: 10 }}
                          labelFormatter={formatDate}
                          formatter={(val, name) => [`${sym}${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#priceGrad)"
                          name="Close Price"
                          dot={false}
                          activeDot={{ r: 5, fill: '#2563EB' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          stroke={forecastModel === 'hw' ? '#10B981' : '#6366F1'}
                          strokeWidth={2.5}
                          strokeDasharray="5 5"
                          name={`${forecastModel === 'hw' ? 'Holt-Winters (30d)' : 'Trend Extrapolation'} Forecast`}
                          dot={forecastModel === 'trend' ? { r: 3 } : false}
                          connectNulls
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Volume Chart */}
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-textSecondary mb-2 font-semibold uppercase tracking-wider">Trading Volume</p>
                    <div className="h-[120px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartDataCombined.filter(d => !d.isForecast)} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                          <XAxis
                            dataKey="date"
                            stroke="#6B7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatDate}
                            minTickGap={30}
                          />
                          <YAxis
                            stroke="#6B7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)}
                            width={60}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#1F2937', color: '#F3F4F6', borderRadius: 10 }}
                            labelFormatter={formatDate}
                            formatter={(val) => [Number(val).toLocaleString(), 'Volume']}
                          />
                          <Bar dataKey="volume" fill="#4F46E5" fillOpacity={0.6} name="Volume" radius={[3, 3, 0, 0]} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Right side summary cards */}
                <div className="space-y-6">
                  {/* Forecast details widget */}
                  <div className="bg-surfaceHover/30 border border-border p-5 rounded-xl space-y-4">
                    <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-border pb-3">
                      <Calendar size={18} className="text-primary" />
                      Prediction Outlook
                    </h3>

                    {forecastModel === 'hw' && forecastHW.length > 0 && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-surface border border-border">
                          <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">30-Day HW Target</p>
                          <p className="text-3xl font-black text-white mt-1">
                            {sym}{forecastHW[forecastHW.length - 1].predicted_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                          {(() => {
                            const changePct = ((forecastHW[forecastHW.length - 1].predicted_price - meta.price) / meta.price) * 100;
                            return (
                              <p className={`text-sm font-bold mt-1.5 flex items-center gap-1 ${changePct >= 0 ? 'text-success' : 'text-danger'}`}>
                                {changePct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}% from current
                              </p>
                            );
                          })()}
                        </div>
                        <div className="text-xs text-textSecondary leading-relaxed space-y-2">
                          <p className="font-semibold text-textPrimary">Double Exponential Smoothing:</p>
                          <p>This model adapts to recent trends and weights recent closes more heavily. It projects a linear direction while accounting for momentum adjustments.</p>
                        </div>
                      </div>
                    )}

                    {forecastModel === 'trend' && predictionTrend.length > 0 && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-surface border border-border">
                          <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">7-Day Regression Target</p>
                          <p className="text-3xl font-black text-white mt-1">
                            {sym}{forecastTrend.forecast_target_price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                          <p className={`text-sm font-bold mt-1.5 flex items-center gap-1 ${forecastTrend.forecast_change_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                            {forecastTrend.forecast_change_pct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {forecastTrend.forecast_change_pct >= 0 ? '+' : ''}{forecastTrend.forecast_change_pct}% from current
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs border-b border-border/50 pb-1.5">
                            <span className="text-textSecondary">Volatlity (std deviation)</span>
                            <span className="font-semibold text-white">{forecastTrend.volatility_pct}%</span>
                          </div>
                          <div className="flex justify-between text-xs border-b border-border/50 pb-1.5">
                            <span className="text-textSecondary">Trend Sentiment</span>
                            <span className={`font-semibold ${forecastTrend.sentiment === 'Bullish' ? 'text-success' : 'text-danger'}`}>{forecastTrend.sentiment}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {forecastModel === 'none' && (
                      <div className="p-8 text-center text-xs text-textSecondary bg-surface/50 border border-dashed border-border rounded-xl">
                        Select a forecasting model (Trend or Holt-Winters) in the toolbar to display projections.
                      </div>
                    )}
                  </div>

                  {/* Consensus mini widget */}
                  {techAnalysis && (
                    <div className="bg-surfaceHover/30 border border-border p-5 rounded-xl space-y-4">
                      <h3 className="text-md font-bold text-white flex items-center gap-2 border-b border-border pb-3">
                        <Activity size={18} className="text-success" />
                        Technical Consensus
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className={`text-center py-2.5 px-4 rounded-xl border font-bold text-md tracking-wide ${getConsensusColor(techAnalysis.consensus)}`}>
                          {techAnalysis.consensus}
                        </div>
                        <div className="text-xs text-textSecondary">
                          Based on aggregate scoring of SMA-50, SMA-200, MACD, Bollinger Bands, and RSI (Score: {techAnalysis.score})
                        </div>
                      </div>
                      <p className="text-xs text-textSecondary leading-relaxed italic border-t border-border/30 pt-3">
                        "{techAnalysis.narrative.split('.')[0]}."
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TECHNICAL CHART TAB */}
            {activeTab === 'chart' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                  {/* Indicators Checkboxes */}
                  <div className="flex flex-wrap justify-between items-center gap-4 bg-background border border-border p-3 rounded-xl">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <span className="text-xs font-bold text-textSecondary uppercase tracking-wider">Overlays:</span>
                      <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showSma20}
                          onChange={(e) => setShowSma20(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary w-4 h-4 bg-surface"
                        />
                        SMA-20 (Blue)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showSma50}
                          onChange={(e) => setShowSma50(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary w-4 h-4 bg-surface"
                        />
                        SMA-50 (Yellow)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showSma200}
                          onChange={(e) => setShowSma200(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary w-4 h-4 bg-surface"
                        />
                        SMA-200 (Red)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showBBands}
                          onChange={(e) => setShowBBands(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary w-4 h-4 bg-surface"
                        />
                        Bollinger Bands (Shaded)
                      </label>
                    </div>

                    <div className="flex rounded-lg border border-border p-0.5 bg-surface">
                      {['1M', '3M', '1Y'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`text-xs px-2.5 py-1 rounded-md font-bold transition ${
                            timeRange === range ? 'bg-background text-white shadow' : 'text-textSecondary'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Indicators Chart */}
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartDataCombined.filter(d => !d.isForecast)} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatDate}
                          minTickGap={35}
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          domain={['auto', 'auto']}
                          tickFormatter={(v) => `${sym}${v.toLocaleString()}`}
                          width={60}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#1F2937', color: '#F3F4F6', borderRadius: 10 }}
                          labelFormatter={formatDate}
                          formatter={(val, name) => [`${sym}${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        
                        {showBBands && (
                          <Area
                            type="monotone"
                            dataKey="bb_upper"
                            stroke="#A78BFA"
                            strokeWidth={0.5}
                            strokeDasharray="3 3"
                            fill="#A78BFA"
                            fillOpacity={0.06}
                            name="BB Upper"
                            dot={false}
                          />
                        )}
                        {showBBands && (
                          <Area
                            type="monotone"
                            dataKey="bb_lower"
                            stroke="#A78BFA"
                            strokeWidth={0.5}
                            strokeDasharray="3 3"
                            fill="none"
                            name="BB Lower"
                            dot={false}
                          />
                        )}

                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#ffffff"
                          strokeWidth={2}
                          name="Close Price"
                          dot={false}
                        />

                        {showSma20 && (
                          <Line
                            type="monotone"
                            dataKey="sma20"
                            stroke="#2563EB"
                            strokeWidth={1.5}
                            name="SMA 20"
                            dot={false}
                          />
                        )}
                        {showSma50 && (
                          <Line
                            type="monotone"
                            dataKey="sma50"
                            stroke="#F59E0B"
                            strokeWidth={1.5}
                            name="SMA 50"
                            dot={false}
                          />
                        )}
                        {showSma200 && (
                          <Line
                            type="monotone"
                            dataKey="sma200"
                            stroke="#EF4444"
                            strokeWidth={1.5}
                            name="SMA 200"
                            dot={false}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right side helper info */}
                <div className="space-y-6">
                  <div className="bg-surfaceHover/30 border border-border p-5 rounded-xl space-y-4 text-xs leading-relaxed text-textSecondary">
                    <h3 className="text-sm font-bold text-white border-b border-border pb-3 flex items-center gap-2">
                      <Info size={16} className="text-primary" />
                      Indicator Guide
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="font-bold text-textPrimary">Moving Averages (SMA)</p>
                        <p className="mt-1">Smooth price data to identify trend direction. A crossover of a shorter MA (e.g. SMA-20) above a longer MA (e.g. SMA-50) is typically bullish.</p>
                      </div>
                      
                      <div>
                        <p className="font-bold text-textPrimary">Bollinger Bands (BB)</p>
                        <p className="mt-1">Indicate volatility bands. The price touching the upper band indicates overbought conditions, while touching the lower band suggests oversold levels.</p>
                      </div>

                      <div>
                        <p className="font-bold text-textPrimary">Consensus Rule</p>
                        <p className="mt-1">The overlay is calculated dynamically using historical series values mapping standard windows (20, 50, 200 sessions).</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TECHNICAL INDICATORS TAB */}
            {activeTab === 'indicators' && techAnalysis && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Consensus Gauge Area */}
                <div className="bg-surfaceHover/30 border border-border p-6 rounded-xl flex flex-col justify-between items-center text-center space-y-6">
                  <div>
                    <h3 className="text-md font-bold text-white">Consensus Sentiment</h3>
                    <p className="text-xs text-textSecondary mt-1">Weighted metric aggregations</p>
                  </div>

                  <div className="relative flex items-center justify-center w-full my-4">
                    {/* Semi circular representation */}
                    <div className="w-48 h-24 border border-border rounded-t-full bg-background overflow-hidden relative flex items-end justify-center">
                      {/* Gauge dial bar */}
                      {(() => {
                        // score goes from -4.5 to +4.5
                        const min = -4.5;
                        const max = 4.5;
                        const score = techAnalysis.score;
                        const percent = Math.min(100, Math.max(0, ((score - min) / (max - min)) * 100));
                        return (
                          <>
                            <div 
                              className="absolute top-0 left-0 right-0 bottom-0 origin-bottom transition-transform duration-1000 ease-out"
                              style={{ 
                                background: 'conic-gradient(from 270deg, #ef4444, #f59e0b, #10b981)',
                                clipPath: 'ellipse(50% 100% at 50% 100%)'
                              }}
                            />
                            {/* Inner circle mask */}
                            <div className="w-[84%] h-[84%] bg-surface rounded-t-full z-10 flex items-end justify-center pb-2">
                              <span className="text-xs font-black text-textSecondary uppercase tracking-widest">Sentiment</span>
                            </div>
                            {/* Gauge needle pointer */}
                            <div 
                              className="absolute w-1 bg-white h-full bottom-0 left-1/2 -ml-0.5 origin-bottom z-20 transition-transform duration-1000"
                              style={{ transform: `rotate(${(percent / 100) * 180 - 90}deg)` }}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className={`text-2xl font-black ${getConsensusColor(techAnalysis.consensus).split(' ')[0]}`}>
                      {techAnalysis.consensus.toUpperCase()}
                    </p>
                    <p className="text-xs text-textSecondary">Consensus Score: {techAnalysis.score} (-4.5 to +4.5)</p>
                  </div>

                  <div className="w-full bg-background border border-border p-3 rounded-lg text-xs text-textSecondary text-left">
                    <span className="font-semibold text-white block mb-1">Score Breakdown:</span>
                    SMAs (+2.0 max), MACD (+1.0 max), RSI (+1.0 max), Bollinger Bands (+0.5 max). Negative scores denote bearish states.
                  </div>
                </div>

                {/* Indicators breakdown list */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-md font-bold text-white border-b border-border pb-3 flex items-center gap-2">
                    <BarChart2 size={18} className="text-primary" />
                    Core Metric Statuses
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* RSI Details */}
                    <div className="bg-background border border-border p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white uppercase">Relative Strength Index (RSI-14)</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSignalBadgeColor(techAnalysis.signals?.rsi?.signal)}`}>
                          {techAnalysis.signals?.rsi?.signal}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{techAnalysis.signals?.rsi?.value}</span>
                        <span className="text-xs text-textSecondary">/ 100</span>
                      </div>
                      
                      {/* RSI Color horizontal bar meter */}
                      <div className="w-full bg-border h-2 rounded-full relative overflow-hidden">
                        {/* Shaded boundaries */}
                        <div className="absolute left-[30%] right-[30%] bg-blue-500/10 h-full border-l border-r border-border" />
                        {/* Cursor */}
                        <div 
                          className="absolute w-2 h-full bg-white rounded-full z-10"
                          style={{ left: `${techAnalysis.signals?.rsi?.value}%`, transform: 'translateX(-50%)' }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-textSecondary">
                        <span>Oversold (&lt;30)</span>
                        <span>Neutral</span>
                        <span>Overbought (&gt;70)</span>
                      </div>
                    </div>

                    {/* MACD Details */}
                    <div className="bg-background border border-border p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white uppercase">MACD Convergence</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSignalBadgeColor(techAnalysis.signals?.macd?.signal)}`}>
                          {techAnalysis.signals?.macd?.signal}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xl font-black text-white">{techAnalysis.signals?.macd?.value}</span>
                        <span className="text-xs text-textSecondary">Signal: {techAnalysis.signals?.macd?.signal_value}</span>
                      </div>
                      <p className="text-xs text-textSecondary">
                        {techAnalysis.signals?.macd?.signal.includes('Crossover') 
                          ? 'Momentum crossover triggered recently.'
                          : `Histogram is currently ${techAnalysis.signals?.macd?.value - techAnalysis.signals?.macd?.signal_value >= 0 ? 'bullish' : 'bearish'}.`}
                      </p>
                    </div>

                    {/* SMAs Details */}
                    <div className="bg-background border border-border p-4 rounded-xl space-y-2 col-span-1 sm:col-span-2">
                      <span className="text-xs font-bold text-white uppercase block border-b border-border pb-1.5">Moving Averages Grid</span>
                      <div className="grid grid-cols-3 text-center text-xs pt-1.5 border-b border-border/50 pb-1">
                        <span className="font-semibold text-textSecondary text-left">Period</span>
                        <span className="font-semibold text-textSecondary">Value</span>
                        <span className="font-semibold text-textSecondary text-right">Condition</span>
                      </div>
                      
                      <div className="grid grid-cols-3 text-center text-xs py-1">
                        <span className="text-white text-left font-medium">SMA 50 (Intermediate)</span>
                        <span className="text-white font-medium">{sym}{techAnalysis.signals?.sma50?.value.toLocaleString()}</span>
                        <span className={`font-bold text-right ${techAnalysis.signals?.sma50?.signal === 'Bullish' ? 'text-success' : 'text-danger'}`}>
                          {techAnalysis.signals?.sma50?.signal}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 text-center text-xs py-1">
                        <span className="text-white text-left font-medium">SMA 200 (Long-Term)</span>
                        <span className="text-white font-medium">{sym}{techAnalysis.signals?.sma200?.value.toLocaleString()}</span>
                        <span className={`font-bold text-right ${techAnalysis.signals?.sma200?.signal === 'Bullish' ? 'text-success' : 'text-danger'}`}>
                          {techAnalysis.signals?.sma200?.signal}
                        </span>
                      </div>
                    </div>

                    {/* Bollinger Bands Details */}
                    <div className="bg-background border border-border p-4 rounded-xl space-y-2 col-span-1 sm:col-span-2">
                      <div className="flex justify-between items-center border-b border-border pb-1.5">
                        <span className="text-xs font-bold text-white uppercase">Bollinger volatility</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSignalBadgeColor(techAnalysis.signals?.bollinger?.signal)}`}>
                          {techAnalysis.signals?.bollinger?.signal}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-textSecondary block">Upper Band:</span>
                          <span className="text-white font-semibold">{sym}{techAnalysis.signals?.bollinger?.upper.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-textSecondary block">Lower Band:</span>
                          <span className="text-white font-semibold">{sym}{techAnalysis.signals?.bollinger?.lower.toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-textSecondary pt-1">
                        Band width is currently {techAnalysis.signals?.bollinger?.width}% of middle channel price.
                      </p>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* MONTE CARLO SIMULATION TAB */}
            {activeTab === 'montecarlo' && mcStats && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Simulation Chart representation */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <h3 className="text-md font-bold text-white">Monte Carlo Simulation paths (N=100)</h3>
                      <p className="text-xs text-textSecondary">Geometric Brownian Motion projections next 30 days</p>
                    </div>
                    <div className="flex rounded-lg border border-border p-0.5 bg-background">
                      {['1M', '3M', '1Y'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`text-xs px-3 py-1 rounded-md font-bold transition ${
                            timeRange === range ? 'bg-surface text-white' : 'text-textSecondary'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={mcChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatDate}
                          minTickGap={35}
                        />
                        <YAxis
                          stroke="#6B7280"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          domain={['auto', 'auto']}
                          tickFormatter={(v) => `${sym}${v.toLocaleString()}`}
                          width={60}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#1F2937', color: '#F3F4F6', borderRadius: 10 }}
                          labelFormatter={formatDate}
                          formatter={(val, name) => {
                            if (name.includes('path_')) return null; // Avoid flooding tooltip with all 10 path values
                            return [`${sym}${Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, name];
                          }}
                        />

                        {/* Shaded area between 5% and 95% boundaries */}
                        <Area
                          type="monotone"
                          dataKey="upper"
                          stroke="none"
                          fill="#10B981"
                          fillOpacity={0.06}
                          name="95% Confidence Interval (Upper Boundary)"
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="lower"
                          stroke="none"
                          fill="none"
                          name="5% Confidence Interval (Lower Boundary)"
                          dot={false}
                        />

                        {/* Render the 10 sampled simulation paths */}
                        {mcPaths.map((_, idx) => (
                          <Line
                            key={`sim_path_${idx}`}
                            type="monotone"
                            dataKey={`path_${idx}`}
                            stroke="#818CF8"
                            strokeWidth={1}
                            strokeOpacity={0.3}
                            dot={false}
                            name={`Path ${idx + 1}`}
                            legendType="none" // do not render in legend
                          />
                        ))}

                        {/* Render Actual close */}
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#ffffff"
                          strokeWidth={2.5}
                          name="Actual Close"
                          dot={false}
                        />

                        {/* Render Median simulation path */}
                        <Line
                          type="monotone"
                          dataKey="median"
                          stroke="#10B981"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          name="Median Path (50%)"
                          dot={false}
                          connectNulls
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right side Calculator widget */}
                <div className="space-y-6">
                  {/* Stats card */}
                  <div className="bg-surfaceHover/30 border border-border p-4 rounded-xl text-xs space-y-2">
                    <span className="font-bold text-white block mb-1 border-b border-border pb-1.5 uppercase tracking-wider text-[10px]">Simulation Stats</span>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Mean Return (Drift)</span>
                      <span className="font-semibold text-white">{(mcStats.drift * 100).toFixed(4)}% daily</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Volatility (Sigma)</span>
                      <span className="font-semibold text-white">{(mcStats.volatility * 100).toFixed(2)}% daily</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Expected Ending Value</span>
                      <span className="font-semibold text-success">{sym}{mcStats.expected_value?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Worst Path Ending Price</span>
                      <span className="font-semibold text-white">{sym}{mcStats.min_ending_price?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-textSecondary">Best Path Ending Price</span>
                      <span className="font-semibold text-white">{sym}{mcStats.max_ending_price?.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Calculator Widget */}
                  <div className="bg-surfaceHover/30 border border-border p-5 rounded-xl space-y-4">
                    <h4 className="text-sm font-bold text-white border-b border-border pb-2.5 flex items-center gap-2">
                      <Sliders size={15} className="text-primary" />
                      Target Price Calculator
                    </h4>
                    
                    <form onSubmit={handleCalculateProbability} className="space-y-4 text-xs">
                      <div>
                        <label className="text-textSecondary block mb-1.5 font-medium">Calculate probability of closing:</label>
                        <select 
                          value={mcTargetDirection} 
                          onChange={(e) => {
                            setMcTargetDirection(e.target.value);
                            setCalculatedProbability(null);
                          }}
                          className="bg-background border border-border rounded-lg px-3 py-2 w-full focus:outline-none focus:border-primary text-white"
                        >
                          <option value="above">Above or Equal to</option>
                          <option value="below">Below or Equal to</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-textSecondary block mb-1.5 font-medium">Target Price ({sym}):</label>
                        <input
                          type="number"
                          step="any"
                          value={mcTargetPrice}
                          onChange={(e) => {
                            setMcTargetPrice(e.target.value);
                            setCalculatedProbability(null);
                          }}
                          className="bg-background border border-border rounded-lg px-3 py-2 w-full focus:outline-none focus:border-primary text-white"
                          placeholder={`e.g. ${Math.round(meta.price * 1.05)}`}
                        />
                      </div>

                      <button
                        type="submit"
                        className="bg-primary hover:bg-primaryHover text-white py-2 px-4 w-full rounded-lg font-bold transition-colors"
                      >
                        Calculate Probability
                      </button>
                    </form>

                    {calculatedProbability !== null && (
                      <div className="p-4 rounded-xl bg-background border border-border text-center space-y-1 animate-fadeIn">
                        <p className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Probability Result</p>
                        <p className="text-3xl font-black text-white">
                          {calculatedProbability}%
                        </p>
                        <p className="text-[11px] text-textSecondary leading-normal pt-1.5">
                          There is a {calculatedProbability}% chance of ending {mcTargetDirection} {sym}{parseFloat(mcTargetPrice).toLocaleString()} in 30 days.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* AI ANALYST REPORT TAB */}
            {activeTab === 'report' && techAnalysis && (
              <div className="bg-surfaceHover/30 border border-border p-6 rounded-xl space-y-6">
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="text-primary" size={20} />
                      AI Executive Summary
                    </h3>
                    <p className="text-xs text-textSecondary mt-0.5">Automated technical commentary generator</p>
                  </div>
                  <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-1 rounded">Report Ready</span>
                </div>

                <div className="space-y-4 text-sm text-textSecondary leading-relaxed">
                  <p className="font-semibold text-textPrimary">Technical Consensus Outlook:</p>
                  <p>{techAnalysis.narrative}</p>
                  
                  <div className="bg-background border border-border p-4 rounded-xl space-y-2 mt-4">
                    <p className="font-semibold text-textPrimary text-xs uppercase tracking-wider">Historical Trend Analysis Context:</p>
                    <p className="text-xs">
                      The current close price of {sym}{meta.price?.toLocaleString()} trades compared to intermediate momentum channels (SMA-50) and long term structures (SMA-200). 
                      RSI stands at {techAnalysis.signals?.rsi?.value}, indicating that the asset is neither overextended nor oversold, leaving room for organic consolidation.
                    </p>
                  </div>
                  
                  {mcStats && (
                    <div className="bg-background border border-border p-4 rounded-xl space-y-2 mt-4">
                      <p className="font-semibold text-textPrimary text-xs uppercase tracking-wider">Volatility & Risk Exposure Context:</p>
                      <p className="text-xs">
                        Historical return paths reveal a daily volatility coefficient of {(mcStats.volatility * 100).toFixed(2)}% (equivalent to ~{((mcStats.volatility * Math.sqrt(252)) * 100).toFixed(1)}% annualized). 
                        Under Geometric Brownian Motion random walk simulations, the median projected price target by the end of the next month settles around {sym}{mcStats.expected_value?.toLocaleString()}, with a 90% probability window ranging between a lower extreme of {sym}{mcStats.min_ending_price?.toLocaleString()} and an upper threshold of {sym}{mcStats.max_ending_price?.toLocaleString()}.
                      </p>
                    </div>
                  )}
                </div>

                {meta.disclaimer && (
                  <p className="text-[10px] text-textSecondary border-t border-border pt-4 italic">
                    Disclaimer: {meta.disclaimer}
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
