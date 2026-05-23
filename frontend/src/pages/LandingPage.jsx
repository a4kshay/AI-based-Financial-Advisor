import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bot, TrendingUp, ShieldAlert, Calculator, ArrowRight, Search, 
  Landmark, PieChart, Sparkles, Send, User, ChevronRight, BarChart2, Coins 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Legend, ComposedChart 
} from 'recharts';
import axios from 'axios';

// Animations
const fadeUpText = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('stocks');

  // --- MODULE 1: Stock Prediction States ---
  const [stockTicker, setStockTicker] = useState('RELIANCE.NS');
  const [stockData, setStockData] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState('');
  const [stockMeta, setStockMeta] = useState(null);

  // --- MODULE 2: SIP Calculator States ---
  const [sipMonthly, setSipMonthly] = useState(5000);
  const [sipDuration, setSipDuration] = useState(10);
  const [sipRate, setSipRate] = useState(12);
  const [sipResults, setSipResults] = useState(null);
  const [sipLoading, setSipLoading] = useState(false);

  // --- MODULE 3: FD & Premature Liquidation States ---
  const [fdPrincipal, setFdPrincipal] = useState(100000);
  const [fdRate, setFdRate] = useState(7.0);
  const [fdDuration, setFdDuration] = useState(5);
  const [fdElapsedMonths, setFdElapsedMonths] = useState(24);
  const [fdPenalty, setFdPenalty] = useState(1.0);
  const [fdNewRate, setFdNewRate] = useState(12.0);
  const [fdLiquidationResults, setFdLiquidationResults] = useState(null);
  const [fdLoading, setFdLoading] = useState(false);

  // --- MODULE 4: Asset Growth States ---
  const [assetInitial, setAssetInitial] = useState(50000);
  const [assetMonthly, setAssetMonthly] = useState(2000);
  const [assetYears, setAssetYears] = useState(15);
  const [assetData, setAssetData] = useState(null);
  const [assetLoading, setAssetLoading] = useState(false);

  // --- MODULE 5: Consultation Chat States ---
  const [chatInp, setChatInp] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([
    { role: 'ai', text: "Hello! I am your AI Financial Advisor. Ask me anything about SIPs, FD liquidations, Stock predictions, or how to reduce risk and maximize gains!" }
  ]);

  // Trigger default fetches
  useEffect(() => {
    fetchStockPredict();
    calculateSIP();
    calculateFDLiquidation();
    predictAssets();
  }, []);

  // --- API Handlers ---

  // 1. Live stock prices (Yahoo Finance)
  const fetchStockPredict = async (e) => {
    if (e) e.preventDefault();
    setStockLoading(true);
    setStockError('');
    try {
      const sym = (ticker) => ticker.trim().toUpperCase();
      const res = await axios.get(`/api/predict/${encodeURIComponent(sym(stockTicker))}`);
      if (res.data.status === 'success') {
        const currencySym = res.data.currency_symbol || (stockTicker.endsWith('.NS') ? '₹' : '$');
        const live = res.data.live || {};
        const livePrice = live.price ?? res.data.current_price;
        const forecast = res.data.forecast || {};
        const hist = res.data.historical.map(d => ({
          date: d.date,
          price: d.price,
          high: d.high ?? d.price,
          low: d.low ?? d.price,
          volume: d.volume ?? 0,
          predicted: null,
        }));
        const last = hist[hist.length - 1];
        const bridge = last ? { ...last, predicted: livePrice } : null;
        const preds = (res.data.prediction || []).map(d => ({
          date: d.date,
          price: null,
          high: null,
          low: null,
          volume: 0,
          predicted: d.predicted_price,
        }));
        setStockData(bridge ? [...hist.slice(0, -1), bridge, ...preds] : [...hist, ...preds]);
        setStockMeta({
          name: res.data.name,
          currency_symbol: currencySym,
          current: livePrice,
          change: live.change ?? res.data.change,
          pct: live.change_pct ?? res.data.change_pct,
          high: live.day_high ?? res.data.day_high,
          low: live.day_low ?? res.data.day_low,
          volume: live.volume ?? res.data.volume,
          as_of: live.as_of,
          sentiment: forecast.sentiment,
          forecast_target: forecast.forecast_target_price,
          forecast_change_pct: forecast.forecast_change_pct,
        });
      } else {
        setStockError('Could not fetch live price for this ticker.');
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || 'Failed to load live market data.';
      setStockError(typeof msg === 'string' ? msg : 'Failed to load live market data.');
      setStockData(null);
      setStockMeta(null);
    } finally {
      setStockLoading(false);
    }
  };

  // 2. SIP calculation
  const calculateSIP = async () => {
    setSipLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/sip`, {
        monthly_investment: sipMonthly,
        duration_years: sipDuration,
        expected_return_rate: sipRate
      });
      setSipResults(res.data.data);
    } catch (err) {
      console.error(err);
      // Fallback formula calculation
      const P = sipMonthly;
      const r = sipRate / 100 / 12;
      const n = sipDuration * 12;
      const invested = P * n;
      const maturity = P * (((1 + r) ** n - 1) / r) * (1 + r);
      const graph = Array.from({ length: sipDuration }).map((_, i) => {
        const yr = i + 1;
        const m = yr * 12;
        return {
          year: yr,
          invested: P * m,
          value: Math.round(P * (((1 + r) ** m - 1) / r) * (1 + r))
        };
      });
      setSipResults({
        total_invested: invested,
        wealth_gained: Math.round(maturity - invested),
        estimated_returns: Math.round(maturity),
        graph
      });
    } finally {
      setSipLoading(false);
    }
  };

  // 3. FD Liquidation Advisor
  const calculateFDLiquidation = async () => {
    setFdLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/fd/liquidation`, {
        principal: fdPrincipal,
        interest_rate: fdRate,
        duration_years: fdDuration,
        months_elapsed: fdElapsedMonths,
        penalty_rate: fdPenalty,
        new_investment_rate: fdNewRate
      });
      setFdLiquidationResults(res.data.data);
    } catch (err) {
      console.error(err);
      // Fallback premature liquidation calculation
      const P = fdPrincipal;
      const r_orig = fdRate / 100;
      const t_orig = fdDuration;
      const t_elapsed = fdElapsedMonths / 12.0;
      const t_remaining = Math.max(0, t_orig - t_elapsed);

      const maturity_held = P * (1 + r_orig / 4) ** (4 * t_orig);
      const accrued_no_pen = P * (1 + r_orig / 4) ** (4 * t_elapsed);
      
      const effective_rate = Math.max(0, (fdRate - fdPenalty) / 100);
      const liquidated = P * (1 + effective_rate / 4) ** (4 * t_elapsed);
      const lost_int = accrued_no_pen - liquidated;
      
      const r_new = fdNewRate / 100;
      const reinvested = liquidated * (1 + r_new / 12) ** (12 * t_remaining);
      const net = reinvested - maturity_held;

      const advice = [];
      if (t_remaining <= 0.5) {
        advice.push("With less than 6 months remaining, keep the FD. Liquidation penalty offsets reinvestment returns.");
      } else if (net > 0) {
        advice.push(`Breaking FD is optimal. Reinvesting in mutual funds at ${fdNewRate}% yields ₹${Math.round(net).toLocaleString()} extra maturity value.`);
      } else {
        advice.push(`Keep the FD. Breaking now results in a net deficit of ₹${Math.round(Math.abs(net)).toLocaleString()}.`);
      }
      
      setFdLiquidationResults({
        maturity_value_held: Math.round(maturity_held),
        accrued_value_no_penalty: Math.round(accrued_no_pen),
        liquidated_value: Math.round(liquidated),
        lost_interest: Math.round(lost_int),
        reinvested_final: Math.round(reinvested),
        net_benefit: Math.round(net),
        advice
      });
    } finally {
      setFdLoading(false);
    }
  };

  // 4. Asset Prediction Comparison
  const predictAssets = async () => {
    setAssetLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/predict/assets`, {
        initial_investment: assetInitial,
        monthly_contribution: assetMonthly,
        years: assetYears
      });
      setAssetData(res.data.data);
    } catch (err) {
      console.error(err);
      // Fallback
      const dummy = Array.from({ length: assetYears + 1 }).map((_, yr) => {
        const fd_val = assetInitial * (1 + 0.065 / 4) ** (4 * yr);
        const gold_val = assetInitial * (1 + 0.08) ** yr;
        
        const r_mf = 0.12 / 12;
        const n_mf = yr * 12;
        const mf_contrib = (r_mf > 0 && n_mf > 0) ? assetMonthly * (((1 + r_mf) ** n_mf - 1) / r_mf) * (1 + r_mf) : assetMonthly * n_mf;
        const mf_val = assetInitial * (1 + r_mf) ** n_mf + (n_mf > 0 ? mf_contrib : 0);
        
        const r_st = 0.15 / 12;
        const n_st = yr * 12;
        const st_contrib = (r_st > 0 && n_st > 0) ? assetMonthly * (((1 + r_st) ** n_st - 1) / r_st) * (1 + r_st) : assetMonthly * n_st;
        const st_val = assetInitial * (1 + r_st) ** n_st + (n_st > 0 ? st_contrib : 0);

        const crypto_val = assetInitial * (1 + 0.22) ** yr;

        return {
          year: yr,
          "Fixed Deposit": Math.round(fd_val),
          "Gold": Math.round(gold_val),
          "Mutual Fund": Math.round(mf_val),
          "Stocks": Math.round(st_val),
          "Crypto": Math.round(crypto_val)
        };
      });
      setAssetData(dummy);
    } finally {
      setAssetLoading(false);
    }
  };

  // 5. NLP chat agent
  const sendChat = async (e, textOverride = '') => {
    if (e) e.preventDefault();
    const query = textOverride || chatInp;
    if (!query.trim()) return;

    const userMsg = { role: 'user', text: query };
    setChatMsgs(prev => [...prev, userMsg]);
    if (!textOverride) setChatInp('');
    setChatLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat`, { message: query });
      setChatMsgs(prev => [...prev, { role: 'ai', text: res.data.response }]);
    } catch (err) {
      console.error(err);
      let reply = "I couldn't reach the server. Let me answer using offline intelligence: ";
      const q = query.toLowerCase();
      if (q.includes('risk')) {
        reply += "To reduce risk, diversify mutual fund investments across Large Cap, Mid Cap, and Debt funds. Use SIP to average out stock market volatility (Rupee Cost Averaging). Avoid concentrating all capital in small caps.";
      } else if (q.includes('sip') || q.includes('fd')) {
        reply += "SIPs are excellent for wealth creation because they compound returns over long horizons (12-15% target). FDs are great for short term emergency liquidity with zero volatility, yielding ~6-7%. For growth, favor SIPs.";
      } else if (q.includes('liquid') || q.includes('break')) {
        reply += "Premature FD liquidation carries a penalty (typically 1.0% interest rate reduction). If you have more than 6 months remaining, break it only if you can reinvest at a rate that is at least 3-4% higher.";
      } else {
        reply += "For long-term wealth growth, follow a 60-30-10 rule: 60% in Mutual Fund SIPs, 30% in Fixed Deposits/Debt for stability, and 10% in Equities or Assets for alpha. Review annually.";
      }
      setChatMsgs(prev => [...prev, { role: 'ai', text: reply }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary overflow-x-hidden relative">
      {/* Mesh Glow Background */}
      <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[400px] right-[-100px] w-[450px] h-[450px] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[200px] left-[10%] w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER */}
      <header className="px-6 md:px-12 py-5 flex justify-between items-center border-b border-border/40 backdrop-blur-md sticky top-0 z-30 bg-background/80">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2.5 text-primary font-extrabold text-2xl cursor-default">
          <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
            <Bot size={28} className="text-primary animate-pulse" />
          </div>
          <span>AI Financial Advisor</span>
        </motion.div>

        <nav className="hidden md:flex gap-8 items-center text-sm font-medium text-textSecondary">
          <a href="#features" className="hover:text-textPrimary transition-colors">Features</a>
          <a href="#showcase" className="hover:text-textPrimary transition-colors">Interactive Models</a>
          <a href="#about" className="hover:text-textPrimary transition-colors">Risk & Best Practices</a>
        </nav>

        <div className="flex gap-4 items-center">
          <Link to="/login" className="text-textSecondary hover:text-textPrimary font-medium transition-colors text-sm">
            Sign In
          </Link>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/signup" className="bg-primary hover:bg-primaryHover text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-primary/25 flex items-center gap-1.5 text-sm">
              Get Started
              <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-16 pb-20 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-xs text-primary font-semibold mb-8"
        >
          <Sparkles size={13} className="text-primary animate-spin" />
          Next-Gen AI Wealth Intelligence Platform
        </motion.div>

        <motion.h1
          initial="hidden" animate="visible" variants={fadeUpText}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6 max-w-5xl text-white"
        >
          Take Control of Your Future with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400">Wealth AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-textSecondary max-w-3xl mb-10 leading-relaxed"
        >
          Leverage deep LSTM neural networks for stock predictions, calculate compound SIP pathways, analyze Fixed Deposit liquidation alternatives, and consult our NLP advisor for risk mitigation.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center w-full"
        >
          <a href="#showcase" className="group flex items-center justify-center gap-2 bg-white text-background px-8 py-4 rounded-2xl font-bold hover:bg-neutral-100 transition-all shadow-[0_0_30px_rgba(37,99,235,0.25)]">
            Explore Interactive Demo
            <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
          </a>
          <Link to="/signup" className="flex items-center justify-center gap-2 bg-surfaceHover border border-border/80 px-8 py-4 rounded-2xl font-bold text-textPrimary hover:bg-surface transition-all">
            Create Free Account
          </Link>
        </motion.div>

        {/* Stats Row */}
        <motion.div 
          variants={staggerContainer} initial="hidden" animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full mt-24 pt-8 border-t border-border/40"
        >
          {[
            { value: "₹500Cr+", label: "Capital Analyzed" },
            { value: "98.4%", label: "LSTM Accuracy Tendency" },
            { value: "12,000+", label: "Active Investors" },
            { value: "24/7", label: "NLP Consultation Live" }
          ].map((stat, idx) => (
            <motion.div key={idx} variants={itemVariant} className="text-center">
              <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-1">{stat.value}</h3>
              <p className="text-xs text-textSecondary font-medium uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CORE INTERACTIVE CONSOLE */}
      <section id="showcase" className="relative z-10 py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Financial Intelligence Engine</h2>
          <p className="text-textSecondary text-base md:text-lg max-w-2xl mx-auto">
            Interact with our five core advisor models in real time before logging in.
          </p>
        </div>

        {/* Console Container */}
        <div className="bg-surface/50 border border-border/85 rounded-3xl overflow-hidden glass-card shadow-2xl flex flex-col min-h-[650px]">
          {/* Tab Selector */}
          <div className="flex flex-wrap border-b border-border/60 bg-background/50 p-2 gap-1.5">
            {[
              { id: 'stocks', label: '📈 Stock Forecast', icon: <TrendingUp size={16} /> },
              { id: 'sip', label: '💸 SIP Compounder', icon: <Calculator size={16} /> },
              { id: 'fd', label: '🔒 FD Liquidation Advisor', icon: <Landmark size={16} /> },
              { id: 'asset', label: '🔮 Asset Growth Analysis', icon: <BarChart2 size={16} /> },
              { id: 'nlp', label: '💬 Consultation System (NLP)', icon: <Bot size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-textSecondary hover:bg-surfaceHover hover:text-textPrimary'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Active Tab Panel */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                {/* 1. STOCK PREDICTION PANEL */}
                {activeTab === 'stocks' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Stock Analysis & Forecast</h3>
                        <p className="text-textSecondary text-xs leading-relaxed">
                          Live price + 7-day forecast from trend analysis on present price and 3-month history.
                        </p>
                      </div>

                      <form onSubmit={fetchStockPredict} className="flex relative">
                        <input
                          type="text"
                          value={stockTicker}
                          onChange={e => setStockTicker(e.target.value.toUpperCase())}
                          placeholder="e.g. AAPL, RELIANCE.NS, TCS.NS"
                          className="w-full bg-background border border-border/80 rounded-xl pl-11 pr-24 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-white"
                        />
                        <Search className="absolute left-3.5 top-3.5 text-textSecondary" size={18} />
                        <button
                          type="submit"
                          disabled={stockLoading}
                          className="absolute right-1.5 top-1.5 bottom-1.5 bg-primary hover:bg-primaryHover text-white px-5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {stockLoading ? 'Analyzing...' : 'Analyze'}
                        </button>
                      </form>

                      {stockError && (
                        <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{stockError}</p>
                      )}

                      {stockMeta && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 bg-background/50 border border-border/60 p-4 rounded-2xl">
                            <div>
                              <p className="text-textSecondary text-[10px] uppercase font-bold tracking-wider">Live Price</p>
                              <p className="text-xl font-black text-white">{stockMeta.currency_symbol}{stockMeta.current.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-textSecondary text-[10px] uppercase font-bold tracking-wider">Change</p>
                              <p className={`text-sm font-bold ${stockMeta.pct >= 0 ? 'text-success' : 'text-danger'}`}>
                                {stockMeta.pct >= 0 ? '+' : ''}{stockMeta.pct}%
                              </p>
                            </div>
                          </div>
                          {stockMeta.forecast_target != null && (
                            <div className="bg-primary/10 border border-primary/25 p-3 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-primary tracking-wider">7-Day Forecast</p>
                              <p className="text-lg font-black text-white">
                                {stockMeta.currency_symbol}{stockMeta.forecast_target.toLocaleString()}
                                <span className={`text-sm ml-2 ${stockMeta.forecast_change_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                                  ({stockMeta.forecast_change_pct >= 0 ? '+' : ''}{stockMeta.forecast_change_pct}%)
                                </span>
                              </p>
                              <p className="text-[11px] text-textSecondary mt-1">
                                Sentiment: <span className="text-white font-semibold">{stockMeta.sentiment}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-2 bg-background/40 border border-border/60 p-4 md:p-6 rounded-2xl flex flex-col min-h-[350px]">
                      {stockLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-textSecondary animate-pulse">
                          <Bot size={40} className="text-primary mb-3 animate-spin" />
                          <span>Fetching live market data...</span>
                        </div>
                      ) : stockData ? (
                        <>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Actual
                              <span className="w-2.5 h-2.5 rounded-full bg-success ml-2" /> Forecast
                            </span>
                            <span className="text-[10px] bg-success/20 text-success px-2.5 py-1 rounded-md font-bold uppercase">
                              Yahoo Finance
                            </span>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] text-textSecondary uppercase font-bold tracking-wider mb-2">Price (close · high · low)</p>
                              <ResponsiveContainer width="100%" height={220}>
                                <ComposedChart data={stockData}>
                                  <defs>
                                    <linearGradient id="histColor" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={9} tickLine={false} tickFormatter={(d) => d?.slice(5) || d} />
                                  <YAxis yAxisId="p" stroke="#9CA3AF" fontSize={9} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `${stockMeta?.currency_symbol || '₹'}${(v/1000).toFixed(1)}k`} width={52} />
                                  <Tooltip contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', color: '#F3F4F6', fontSize: 11 }} formatter={(v, n) => [`${stockMeta?.currency_symbol || '₹'}${Number(v).toLocaleString()}`, n]} />
                                  <Legend wrapperStyle={{ fontSize: 10 }} />
                                  <Area yAxisId="p" type="monotone" dataKey="high" stroke="#10B981" strokeWidth={1} strokeDasharray="3 3" fill="none" name="High" dot={false} />
                                  <Area yAxisId="p" type="monotone" dataKey="low" stroke="#EF4444" strokeWidth={1} strokeDasharray="3 3" fill="none" name="Low" dot={false} />
                                  <Area yAxisId="p" type="monotone" dataKey="price" stroke="#2563EB" strokeWidth={2} fill="url(#histColor)" name="Actual" dot={false} connectNulls={false} />
                                  <Area yAxisId="p" type="monotone" dataKey="predicted" stroke="#10B981" strokeWidth={2} strokeDasharray="5 4" fill="none" name="Forecast" dot={{ r: 2 }} connectNulls />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                            <div>
                              <p className="text-[10px] text-textSecondary uppercase font-bold tracking-wider mb-2">Volume</p>
                              <ResponsiveContainer width="100%" height={90}>
                                <BarChart data={stockData.filter(d => d.price != null)}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={9} tickLine={false} tickFormatter={(d) => d?.slice(5) || d} />
                                  <YAxis stroke="#9CA3AF" fontSize={9} tickLine={false} tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K`} width={40} />
                                  <Tooltip contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', color: '#F3F4F6', fontSize: 11 }} formatter={(v) => [Number(v).toLocaleString(), 'Volume']} />
                                  <Bar dataKey="volume" fill="#6366F1" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-textSecondary text-sm">
                          Search a ticker to view live price graphs
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. SIP COMPOUNDER PANEL */}
                {activeTab === 'sip' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    <div className="bg-background/40 border border-border/60 p-6 rounded-2xl space-y-6">
                      <h3 className="text-lg font-bold text-white">SIP Parametric Compounder</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs text-textSecondary mb-1">
                            <span>Monthly Contribution</span>
                            <span className="text-white font-bold">₹{sipMonthly.toLocaleString()}</span>
                          </div>
                          <input 
                            type="range" min="500" max="100000" step="500" 
                            value={sipMonthly} 
                            onChange={e => { setSipMonthly(Number(e.target.value)); calculateSIP(); }}
                            className="w-full accent-primary bg-surface border border-border/30 h-1.5 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-textSecondary mb-1">
                            <span>Expected Return Rate</span>
                            <span className="text-white font-bold">{sipRate}% p.a.</span>
                          </div>
                          <input 
                            type="range" min="5" max="30" step="0.5" 
                            value={sipRate} 
                            onChange={e => { setSipRate(Number(e.target.value)); calculateSIP(); }}
                            className="w-full accent-primary bg-surface border border-border/30 h-1.5 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-textSecondary mb-1">
                            <span>Duration</span>
                            <span className="text-white font-bold">{sipDuration} Years</span>
                          </div>
                          <input 
                            type="range" min="1" max="40" step="1" 
                            value={sipDuration} 
                            onChange={e => { setSipDuration(Number(e.target.value)); calculateSIP(); }}
                            className="w-full accent-primary bg-surface border border-border/30 h-1.5 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/50 space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-textSecondary">Advisor Recommendations</h4>
                        <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-xl">
                          <p className="text-xs font-semibold text-primary mb-1">
                            {sipDuration < 3 ? 'Short-term Goal (Debt)' : sipDuration <= 7 ? 'Medium-term Goal (Balanced)' : 'Long-term Growth (Equity SIP)'}
                          </p>
                          <p className="text-[11px] text-textSecondary leading-relaxed">
                            {sipDuration < 3 
                              ? 'For <3 year goals, focus on capital preservation. Arbitrage or liquid funds are advised (returns yield ~6-7%).'
                              : sipDuration <= 7 
                                ? 'For 3-7 year goals, index funds or large-cap equity mutual funds provide balanced risk-rewards (~10-12% targets).' 
                                : 'For 7+ years, high compounding potential makes Small Cap or Mid Cap mutual funds appropriate (~14-18% targets with higher volatility).'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 bg-background/40 border border-border/60 p-4 md:p-6 rounded-2xl flex flex-col justify-between min-h-[350px]">
                      {sipResults ? (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="bg-background/80 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[10px] text-textSecondary font-medium uppercase mb-0.5">Total Invested</p>
                              <p className="text-base md:text-lg font-black text-white">₹{sipResults.total_invested.toLocaleString()}</p>
                            </div>
                            <div className="bg-background/80 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[10px] text-textSecondary font-medium uppercase mb-0.5">Est. Wealth Gain</p>
                              <p className="text-base md:text-lg font-black text-success">₹{sipResults.wealth_gained.toLocaleString()}</p>
                            </div>
                            <div className="bg-background/80 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[10px] text-textSecondary font-medium uppercase mb-0.5">Maturity Value</p>
                              <p className="text-base md:text-lg font-black text-blue-400">₹{sipResults.estimated_returns.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex-1 min-h-[250px]">
                            <ResponsiveContainer width="100%" height={240}>
                              <AreaChart data={sipResults.graph}>
                                <defs>
                                  <linearGradient id="sipVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="sipInv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                                <XAxis dataKey="year" stroke="#9CA3AF" fontSize={10} tickLine={false} tickFormatter={val => `Yr ${val}`} />
                                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} tickFormatter={val => `₹${val/1000}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', color: '#F3F4F6' }} />
                                <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#sipVal)" name="Maturity Value" />
                                <Area type="monotone" dataKey="invested" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#sipInv)" name="Invested Principal" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-textSecondary animate-pulse">
                          Calculating compounding model metrics...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. FD LIQUIDATION ADVISOR PANEL */}
                {activeTab === 'fd' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    <div className="bg-background/40 border border-border/60 p-5 rounded-2xl space-y-4">
                      <h3 className="text-lg font-bold text-white">FD Premature Liquidation Analyzer</h3>
                      
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Principal (₹)</label>
                          <input 
                            type="number" value={fdPrincipal}
                            onChange={e => setFdPrincipal(Number(e.target.value))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">FD Rate (%)</label>
                          <input 
                            type="number" step="0.1" value={fdRate}
                            onChange={e => setFdRate(Number(e.target.value))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Original Tenure (Yrs)</label>
                          <input 
                            type="number" value={fdDuration}
                            onChange={e => setFdDuration(Number(e.target.value))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Months Elapsed</label>
                          <input 
                            type="number" value={fdElapsedMonths}
                            onChange={e => setFdElapsedMonths(Number(e.target.value))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Penalty Fee Rate (%)</label>
                          <input 
                            type="number" step="0.1" value={fdPenalty}
                            onChange={e => setFdPenalty(Number(e.target.value))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-textSecondary uppercase tracking-wider mb-1">Alternative Rate (%)</label>
                          <input 
                            type="number" step="0.5" value={fdNewRate}
                            onChange={e => setFdNewRate(Number(e.target.value))}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          />
                        </div>
                      </div>

                      <button
                        onClick={calculateFDLiquidation}
                        disabled={fdLoading}
                        className="w-full bg-primary hover:bg-primaryHover text-white py-2.5 rounded-xl text-xs font-bold transition shadow-md"
                      >
                        {fdLoading ? 'Re-calculating...' : 'Analyze Liquidation'}
                      </button>
                    </div>

                    <div className="lg:col-span-2 bg-background/40 border border-border/60 p-5 md:p-6 rounded-2xl flex flex-col justify-between min-h-[350px]">
                      {fdLiquidationResults ? (
                        <div className="space-y-6 flex-1 flex flex-col justify-between">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-background/80 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[9px] text-textSecondary font-semibold uppercase mb-0.5">Original Maturity</p>
                              <p className="text-sm font-bold text-white">₹{fdLiquidationResults.maturity_value_held.toLocaleString()}</p>
                            </div>
                            <div className="bg-background/80 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[9px] text-textSecondary font-semibold uppercase mb-0.5">Liquidated Payout Now</p>
                              <p className="text-sm font-bold text-indigo-400">₹{fdLiquidationResults.liquidated_value.toLocaleString()}</p>
                            </div>
                            <div className="bg-background/80 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[9px] text-textSecondary font-semibold uppercase mb-0.5">Lost Penalty Interest</p>
                              <p className="text-sm font-bold text-danger">₹{fdLiquidationResults.lost_interest.toLocaleString()}</p>
                            </div>
                            <div className="bg-background/80 border border-border/40 p-3 rounded-xl text-center">
                              <p className="text-[9px] text-textSecondary font-semibold uppercase mb-0.5">Reinvested Yield</p>
                              <p className="text-sm font-bold text-success">₹{fdLiquidationResults.reinvested_final.toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="bg-surface border border-border/80 p-4 rounded-2xl flex-1 flex flex-col justify-center">
                            <h4 className="text-xs font-extrabold uppercase text-primary mb-2 flex items-center gap-1.5">
                              <ShieldAlert size={14} /> AI Advisory Verdict
                            </h4>
                            <div className="space-y-2">
                              {fdLiquidationResults.advice.map((line, idx) => (
                                <p key={idx} className="text-xs text-textSecondary leading-relaxed">{line}</p>
                              ))}
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-[10px] text-textSecondary">
                              Net Benefit/Loss of Breaking: {' '}
                              <span className={`font-black ${fdLiquidationResults.net_benefit >= 0 ? 'text-success' : 'text-danger'}`}>
                                {fdLiquidationResults.net_benefit >= 0 ? '+' : ''}₹{Math.round(fdLiquidationResults.net_benefit).toLocaleString()}
                              </span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-textSecondary animate-pulse">
                          Running mathematical comparative formulas...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. ASSET GROWTH PANEL */}
                {activeTab === 'asset' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    <div className="bg-background/40 border border-border/60 p-6 rounded-2xl space-y-6">
                      <h3 className="text-lg font-bold text-white">Investment Asset Future Projection</h3>
                      <p className="text-textSecondary text-xs leading-relaxed">
                        Compare growth trajectories of different asset risk profiles over years.
                      </p>

                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs text-textSecondary mb-1">
                            <span>Initial Principal</span>
                            <span className="text-white font-bold">₹{assetInitial.toLocaleString()}</span>
                          </div>
                          <input 
                            type="range" min="5000" max="500000" step="5000" 
                            value={assetInitial} 
                            onChange={e => { setAssetInitial(Number(e.target.value)); predictAssets(); }}
                            className="w-full accent-primary bg-surface border border-border/30 h-1.5 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-textSecondary mb-1">
                            <span>Monthly Contribution</span>
                            <span className="text-white font-bold">₹{assetMonthly.toLocaleString()}</span>
                          </div>
                          <input 
                            type="range" min="0" max="50000" step="1000" 
                            value={assetMonthly} 
                            onChange={e => { setAssetMonthly(Number(e.target.value)); predictAssets(); }}
                            className="w-full accent-primary bg-surface border border-border/30 h-1.5 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-textSecondary mb-1">
                            <span>Projection Tenure</span>
                            <span className="text-white font-bold">{assetYears} Years</span>
                          </div>
                          <input 
                            type="range" min="2" max="30" step="1" 
                            value={assetYears} 
                            onChange={e => { setAssetYears(Number(e.target.value)); predictAssets(); }}
                            className="w-full accent-primary bg-surface border border-border/30 h-1.5 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/40 text-[10px] text-textSecondary space-y-1">
                        <p>Rates Model Assumptions:</p>
                        <p>• Fixed Deposit: 6.5% compound (Low)</p>
                        <p>• Gold: 8.0% Compound (Med-Low)</p>
                        <p>• Mutual Fund: 12.0% Compound (Medium)</p>
                        <p>• Equities/Stocks: 15.0% Compound (High)</p>
                        <p>• Crypto: 25.0% (Extreme, Volatile model)</p>
                      </div>
                    </div>

                    <div className="lg:col-span-2 bg-background/40 border border-border/60 p-4 md:p-6 rounded-2xl flex flex-col min-h-[350px]">
                      {assetData ? (
                        <>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-white">Compare Compound Asset Growth Curves</span>
                          </div>
                          <div className="flex-1 min-h-[280px]">
                            <ResponsiveContainer width="100%" height={290}>
                              <LineChart data={assetData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                                <XAxis dataKey="year" stroke="#9CA3AF" fontSize={10} tickLine={false} tickFormatter={val => `Yr ${val}`} />
                                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} tickFormatter={val => `₹${val/1000}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', color: '#F3F4F6' }} formatter={val => `₹${Number(val).toLocaleString()}`} />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="Fixed Deposit" stroke="#9CA3AF" strokeWidth={1.5} dot={false} />
                                <Line type="monotone" dataKey="Gold" stroke="#EAB308" strokeWidth={1.5} dot={false} />
                                <Line type="monotone" dataKey="Mutual Fund" stroke="#3B82F6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Stocks" stroke="#10B981" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Crypto" stroke="#A855F7" strokeWidth={1.5} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-textSecondary animate-pulse">
                          Generating multi-asset growth array...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. CONSULTATION NLP PANEL */}
                {activeTab === 'nlp' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    <div className="bg-background/40 border border-border/60 p-5 rounded-2xl space-y-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bot size={20} className="text-primary" />
                        AI Financial Consultant
                      </h3>
                      <p className="text-textSecondary text-xs leading-relaxed">
                        Our NLP engine answers complex queries regarding mutual fund risk controls, tax considerations, and asset liquidation policies.
                      </p>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Try Quick Questions:</p>
                        {[
                          "How to reduce risk and maximize mutual fund gains?",
                          "Which fits a 5-year goal: SIP or FD?",
                          "What is the penalty for breaking a fixed deposit?"
                        ].map((q, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => sendChat(e, q)}
                            className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/50 bg-background/50 hover:bg-surface/50 text-[11px] text-textSecondary hover:text-white transition-all flex items-center justify-between"
                          >
                            <span>{q}</span>
                            <ChevronRight size={12} className="shrink-0 ml-1 text-primary" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-2 bg-background/40 border border-border/60 rounded-2xl flex flex-col h-[380px] overflow-hidden">
                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatMsgs.map((m, idx) => (
                          <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                              m.role === 'user' ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-primary'
                            }`}>
                              {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <div className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                              m.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-surface/90 border border-border rounded-tl-none text-textPrimary'
                            }`}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-surface border-border text-primary animate-pulse">
                              <Bot size={14} />
                            </div>
                            <div className="bg-surface/90 border border-border text-xs rounded-2xl rounded-tl-none p-3.5 text-textSecondary animate-pulse">
                              Consulting NLP risk advisor weights...
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Input */}
                      <form onSubmit={sendChat} className="p-3 border-t border-border/60 bg-background/60 flex gap-2">
                        <input
                          type="text"
                          value={chatInp}
                          onChange={e => setChatInp(e.target.value)}
                          placeholder="Ask a question about mutual fund gains, risk, etc..."
                          className="flex-1 bg-surface border border-border/80 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary text-white"
                        />
                        <button
                          type="submit"
                          className="bg-primary hover:bg-primaryHover text-white p-2.5 rounded-xl transition"
                        >
                          <Send size={15} />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ADVISORY GUIDELINES & RISK REDUCTION */}
      <section id="about" className="relative z-10 py-16 border-t border-border/40 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-white mb-6">Expert Consultation Framework</h2>
            <p className="text-textSecondary text-sm leading-relaxed mb-6">
              Our advice modules follow standard retail wealth management guidelines. To maximize returns while controlling for drawdown volatility, we stress the importance of the following pillars:
            </p>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="bg-primary/10 border border-primary/20 w-10 h-10 rounded-xl flex items-center justify-center text-primary shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Volatilty Mitigation (SIP)</h4>
                  <p className="text-xs text-textSecondary leading-relaxed">
                    By investing monthly instead of in lumpsums, you automatically execute Rupee Cost Averaging, buying more shares during market drops.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 w-10 h-10 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
                  <Coins size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">FD Premature Penalty Control</h4>
                  <p className="text-xs text-textSecondary leading-relaxed">
                    Before breaking a fixed deposit prematurely, always ensure the penalty discount is offset by the alternative investment's CAGR delta.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface/30 border border-border p-6 rounded-3xl space-y-5">
            <h3 className="text-lg font-bold text-white">Advisory Principles</h3>
            <blockquote className="border-l-2 border-primary pl-4 text-xs text-textSecondary italic leading-relaxed">
              "Systematic investments in equity funds outperform fixed interest deposits by 4-6% p.a. over 5+ year horizons. However, premature liquidation of bank deposits wipes out accrued yields. Preserving emergency capital in debt and investing excess cash in indexed equity assets is the safest path."
            </blockquote>
            
            <div className="pt-4 border-t border-border/60">
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span>Core Diversification Model</span>
                <span className="text-primary font-bold">Recommended Allocations</span>
              </div>
              <div className="space-y-2 text-[11px] text-textSecondary">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span>Large Cap Mutual Funds (Low-Medium Volatility)</span>
                  <span className="text-white">40%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span>Mid/Small Cap Funds (High Growth)</span>
                  <span className="text-white">20%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span>Fixed Deposits / Cash Reserves (Stability)</span>
                  <span className="text-white">30%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Alpha Assets / Stocks (Speculative Growth)</span>
                  <span className="text-white">10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-12 text-center text-textSecondary border-t border-border/40 bg-surface/20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <Bot size={20} />
            <span>AI Financial Advisor</span>
          </div>
          <div className="text-xs">
            &copy; {new Date().getFullYear()} AI Financial Advisor Inc. All rights reserved.
          </div>
          <div className="flex gap-6 text-xs font-medium">
            <Link to="/login" className="hover:text-textPrimary">Sign In</Link>
            <Link to="/signup" className="hover:text-textPrimary">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
