import React, { useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function FDCalculator() {
  const [activeTab, setActiveTab] = useState('calculator');

  // --- Standard FD Calculator state ---
  const [fdForm, setFdForm] = useState({
    principal: 100000,
    interest_rate: 6.5,
    duration_years: 5,
  });
  const [fdResults, setFdResults] = useState(null);
  const [fdLoading, setFdLoading] = useState(false);

  // --- Liquidation Advisor state ---
  const [liqForm, setLiqForm] = useState({
    principal: 100000,
    interest_rate: 7.0,
    duration_years: 5,
    months_elapsed: 18,
    penalty_rate: 1.0,
    new_investment_rate: 12.0,
  });
  const [liqResults, setLiqResults] = useState(null);
  const [liqLoading, setLiqLoading] = useState(false);

  // --- Handlers ---
  const handleFdCalculate = async (e) => {
    e.preventDefault();
    setFdLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/fd`, fdForm);
      setFdResults(res.data.data);
    } catch {
      // Fallback mock
      const P = fdForm.principal, r = fdForm.interest_rate / 100, n = 4, t = fdForm.duration_years;
      const amt = P * Math.pow(1 + r / n, n * t);
      const graph = Array.from({ length: t }, (_, i) => ({
        year: i + 1,
        principal: P,
        value: parseFloat((P * Math.pow(1 + r / n, n * (i + 1))).toFixed(2)),
      }));
      setFdResults({ maturity_amount: parseFloat(amt.toFixed(2)), interest_earned: parseFloat((amt - P).toFixed(2)), graph });
    }
    setFdLoading(false);
  };

  const handleLiqCalculate = async (e) => {
    e.preventDefault();
    setLiqLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/fd/liquidation`, liqForm);
      setLiqResults(res.data.data);
    } catch {
      // Fallback mock
      const { principal: P, interest_rate, duration_years, months_elapsed, penalty_rate, new_investment_rate } = liqForm;
      const r = interest_rate / 100, tElapsed = months_elapsed / 12, tRemaining = duration_years - tElapsed;
      const maturity = P * Math.pow(1 + r / 4, 4 * duration_years);
      const accruedNoPenalty = P * Math.pow(1 + r / 4, 4 * tElapsed);
      const rPenalty = Math.max(0, (interest_rate - penalty_rate) / 100);
      const liquidated = P * Math.pow(1 + rPenalty / 4, 4 * tElapsed);
      const rNew = new_investment_rate / 100;
      const reinvested = liquidated * Math.pow(1 + rNew / 12, 12 * tRemaining);
      const netBenefit = reinvested - maturity;
      const advice = [];
      if (tRemaining <= 0.5) advice.push('With less than 6 months left, it is highly recommended to KEEP the FD. Short window rarely offsets the penalty.');
      else if (netBenefit > 0) advice.push(`LIQUIDATING and reinvesting at ${new_investment_rate}% yields ₹${Math.abs(netBenefit).toLocaleString('en-IN', { maximumFractionDigits: 0 })} more.`);
      else advice.push(`KEEP the FD. Liquidating now yields ₹${Math.abs(netBenefit).toLocaleString('en-IN', { maximumFractionDigits: 0 })} LESS due to the ${penalty_rate}% penalty.`);
      if (P >= 50000) advice.push('Alternative: Consider a Loan against FD at ~+1% above your FD rate to avoid breaking it.');
      setLiqResults({ maturity_value_held: parseFloat(maturity.toFixed(2)), accrued_value_no_penalty: parseFloat(accruedNoPenalty.toFixed(2)), liquidated_value: parseFloat(liquidated.toFixed(2)), lost_interest: parseFloat((accruedNoPenalty - liquidated).toFixed(2)), reinvested_final: parseFloat(reinvested.toFixed(2)), net_benefit: parseFloat(netBenefit.toFixed(2)), advice });
    }
    setLiqLoading(false);
  };

  const tabs = [
    { id: 'calculator', label: '📊 FD Calculator' },
    { id: 'liquidation', label: '⚡ Liquidation Advisor' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Fixed Deposit Tools</h2>
        <p className="text-textSecondary text-sm mt-1">Calculate FD maturity or get a premature liquidation analysis.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-textSecondary hover:text-white hover:border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ===== FD CALCULATOR TAB ===== */}
        {activeTab === 'calculator' && (
          <motion.div key="calculator" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="bg-surface border border-border p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <form onSubmit={handleFdCalculate} className="space-y-5 relative z-10">
                {[
                  { label: 'Principal Amount (₹)', key: 'principal', min: 1000 },
                  { label: 'Interest Rate (%)', key: 'interest_rate', step: 0.1 },
                  { label: 'Duration (Years)', key: 'duration_years', min: 1, max: 30 },
                ].map(({ label, key, ...rest }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-textSecondary mb-2">{label}</label>
                    <input
                      type="number"
                      value={fdForm[key]}
                      onChange={e => setFdForm({ ...fdForm, [key]: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      {...rest}
                    />
                  </div>
                ))}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={fdLoading}
                  className="w-full bg-primary hover:bg-primaryHover text-white py-3 rounded-lg font-semibold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                >
                  {fdLoading ? 'Calculating...' : 'Calculate FD'}
                </motion.button>
              </form>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 bg-surface border border-border p-6 rounded-xl flex flex-col">
              <AnimatePresence mode="wait">
                {!fdResults ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-textSecondary gap-3">
                    <div className="w-14 h-14 rounded-full bg-surfaceHover border border-border flex items-center justify-center text-2xl">🏦</div>
                    <p>Enter details above to view your FD maturity breakdown</p>
                  </motion.div>
                ) : (
                  <motion.div key="results" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.2 }} className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-background border border-border rounded-xl hover:border-success/40 transition-colors">
                        <div className="text-sm text-textSecondary mb-1">Maturity Amount</div>
                        <div className="text-2xl font-bold text-success">₹{fdResults.maturity_amount.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="text-center p-4 bg-background border border-border rounded-xl hover:border-primary/40 transition-colors">
                        <div className="text-sm text-textSecondary mb-1">Interest Earned</div>
                        <div className="text-2xl font-bold text-primary">₹{fdResults.interest_earned.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={fdResults.graph}>
                          <defs>
                            <linearGradient id="fdGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                          <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `Yr ${v}`} />
                          <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', borderRadius: '12px', color: '#F3F4F6' }} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                          <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} fill="url(#fdGrad)" name="FD Value" activeDot={{ r: 6, fill: '#2563EB', strokeWidth: 0 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ===== LIQUIDATION ADVISOR TAB ===== */}
        {activeTab === 'liquidation' && (
          <motion.div key="liquidation" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="bg-surface border border-border p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
              <h3 className="text-sm font-semibold text-yellow-400 mb-4 flex items-center gap-2">⚡ Break-FD Analysis</h3>
              <form onSubmit={handleLiqCalculate} className="space-y-4 relative z-10">
                {[
                  { label: 'FD Principal (₹)', key: 'principal' },
                  { label: 'FD Interest Rate (%)', key: 'interest_rate', step: 0.1 },
                  { label: 'FD Duration (Years)', key: 'duration_years', min: 1 },
                  { label: 'Months Elapsed', key: 'months_elapsed', min: 1 },
                  { label: 'Penalty Rate (%)', key: 'penalty_rate', step: 0.1 },
                  { label: 'New Investment Rate (%)', key: 'new_investment_rate', step: 0.1 },
                ].map(({ label, key, ...rest }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-textSecondary mb-1.5">{label}</label>
                    <input
                      type="number"
                      value={liqForm[key]}
                      onChange={e => setLiqForm({ ...liqForm, [key]: Number(e.target.value) })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/40 transition-colors"
                      {...rest}
                    />
                  </div>
                ))}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={liqLoading}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-lg font-semibold text-sm transition-colors shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                >
                  {liqLoading ? 'Analyzing...' : 'Analyze Liquidation'}
                </motion.button>
              </form>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence mode="wait">
                {!liqResults ? (
                  <motion.div key="liq-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-surface border border-border rounded-xl p-10 flex flex-col items-center justify-center text-textSecondary gap-3 min-h-[300px]">
                    <div className="text-4xl">⚡</div>
                    <p>Fill in your FD details to get a break vs. hold analysis</p>
                  </motion.div>
                ) : (
                  <motion.div key="liq-results" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.2 }} className="space-y-4">
                    {/* Value Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { label: 'Maturity (if held)', value: liqResults.maturity_value_held, color: 'text-success' },
                        { label: 'Liquidated Value', value: liqResults.liquidated_value, color: 'text-yellow-400' },
                        { label: 'Interest Lost', value: liqResults.lost_interest, color: 'text-red-400' },
                        { label: 'Reinvested Final', value: liqResults.reinvested_final, color: 'text-blue-400' },
                        {
                          label: 'Net Benefit',
                          value: Math.abs(liqResults.net_benefit),
                          color: liqResults.net_benefit >= 0 ? 'text-success' : 'text-red-400',
                          prefix: liqResults.net_benefit >= 0 ? '+' : '-',
                        },
                      ].map(({ label, value, color, prefix = '' }) => (
                        <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center hover:border-white/10 transition-colors">
                          <div className="text-xs text-textSecondary mb-1">{label}</div>
                          <div className={`text-lg font-bold ${color}`}>{prefix}₹{Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        </div>
                      ))}
                    </div>

                    {/* AI Verdict */}
                    <div className={`bg-surface border rounded-xl p-5 space-y-3 ${liqResults.net_benefit >= 0 ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        🤖 AI Verdict
                      </h4>
                      {liqResults.advice.map((line, i) => (
                        <motion.p
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className={`text-sm leading-relaxed ${i === 0 ? (liqResults.net_benefit >= 0 ? 'text-green-400' : 'text-yellow-400') : 'text-textSecondary'}`}
                        >
                          {i === 0 ? '▶ ' : '💡 '}{line}
                        </motion.p>
                      ))}
                    </div>

                    {/* Simple bar comparison */}
                    <div className="bg-surface border border-border rounded-xl p-5">
                      <p className="text-xs text-textSecondary mb-3 font-medium uppercase tracking-wider">Value Comparison</p>
                      {[
                        { label: 'Hold to Maturity', value: liqResults.maturity_value_held, color: 'bg-success' },
                        { label: 'Reinvest After Breaking', value: liqResults.reinvested_final, color: 'bg-blue-500' },
                      ].map(({ label, value, color }) => {
                        const maxVal = Math.max(liqResults.maturity_value_held, liqResults.reinvested_final);
                        const pct = (value / maxVal) * 100;
                        return (
                          <div key={label} className="mb-3">
                            <div className="flex justify-between text-xs text-textSecondary mb-1">
                              <span>{label}</span>
                              <span className="text-white font-medium">₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="h-2 bg-background rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${color}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
