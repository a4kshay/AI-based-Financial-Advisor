import React, { useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// Using global axios configuration for API requests

export default function FDCalculator() {
  // --- Standard FD Calculator state ---
  const [fdForm, setFdForm] = useState({
    principal: 100000,
    interest_rate: 6.5,
    duration_years: 5,
  });
  const [fdResults, setFdResults] = useState(null);
  const [fdLoading, setFdLoading] = useState(false);

  // --- Handlers ---
  const handleFdCalculate = async (e) => {
    e.preventDefault();
    setFdLoading(true);
    try {
      const res = await axios.post('/api/fd', fdForm);
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

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Fixed Deposit Tools</h2>
        <p className="text-textSecondary text-sm mt-1">Calculate FD maturity or get a premature liquidation analysis.</p>
      </div>

      {/* ===== FD CALCULATOR ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      </div>
    </motion.div>
  );
}
