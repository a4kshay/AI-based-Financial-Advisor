import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function InvestmentPrediction() {
  const [initial, setInitial] = useState(50000);
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears] = useState(10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const predict = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/predict/assets`, {
        initial_investment: initial,
        monthly_contribution: monthly,
        years,
      });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
      const fallback = Array.from({ length: years + 1 }, (_, yr) => {
        const fd = initial * (1 + 0.065 / 4) ** (4 * yr);
        const gold = initial * (1 + 0.08) ** yr;
        const rMf = 0.12 / 12;
        const nMf = yr * 12;
        const mfContrib =
          rMf > 0 && nMf > 0
            ? monthly * (((1 + rMf) ** nMf - 1) / rMf) * (1 + rMf)
            : monthly * nMf;
        const mf = initial * (1 + rMf) ** nMf + mfContrib;
        const rSt = 0.15 / 12;
        const nSt = yr * 12;
        const stContrib =
          rSt > 0 && nSt > 0
            ? monthly * (((1 + rSt) ** nSt - 1) / rSt) * (1 + rSt)
            : monthly * nSt;
        const stocks = initial * (1 + rSt) ** nSt + stContrib;
        const crypto = initial * (1 + 0.22) ** yr;
        return {
          year: yr,
          'Fixed Deposit': Math.round(fd),
          Gold: Math.round(gold),
          'Mutual Fund': Math.round(mf),
          Stocks: Math.round(stocks),
          Crypto: Math.round(crypto),
        };
      });
      setData(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    predict();
  }, []);

  const finalYear = data?.[data.length - 1];
  const bestAsset = finalYear
    ? Object.entries(finalYear)
        .filter(([k]) => k !== 'year')
        .sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="text-primary" size={26} />
          Investment Prediction
        </h2>
        <p className="text-textSecondary text-sm mt-1">
          Compare asset growth trajectories and forecast future portfolio value across risk profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface border border-border p-6 rounded-xl space-y-5">
          <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wider">Parameters</h3>

          <div>
            <label className="block text-sm text-textSecondary mb-2">Initial Principal (₹)</label>
            <input
              type="number"
              value={initial}
              onChange={(e) => setInitial(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-textSecondary mb-2">Monthly Contribution (₹)</label>
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-textSecondary mb-2">Projection Tenure (Years)</label>
            <input
              type="number"
              min={2}
              max={30}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary text-white"
            />
          </div>

          <button
            onClick={predict}
            disabled={loading}
            className="w-full bg-primary hover:bg-primaryHover text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? 'Projecting...' : 'Run Projection'}
          </button>

          <div className="pt-4 border-t border-border text-xs text-textSecondary space-y-1">
            <p className="font-semibold text-textPrimary">Model assumptions</p>
            <p>FD: 6.5% · Gold: 8% · Mutual Fund: 12% · Stocks: 15% · Crypto: ~25% (volatile)</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface border border-border p-6 rounded-xl min-h-[420px] flex flex-col">
          {bestAsset && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
              <span className="text-textSecondary">Highest projected value at year {years}: </span>
              <span className="font-bold text-primary">{bestAsset[0]}</span>
              <span className="text-white font-semibold"> — ₹{bestAsset[1].toLocaleString('en-IN')}</span>
            </div>
          )}

          {!data && !loading && (
            <div className="flex-1 flex items-center justify-center text-textSecondary">
              Set parameters and run a projection
            </div>
          )}
          {loading && (
            <div className="flex-1 flex items-center justify-center text-textSecondary animate-pulse">
              Generating multi-asset forecasts...
            </div>
          )}
          {data && !loading && (
            <div className="flex-1 min-h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A303C" vertical={false} />
                  <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} tickLine={false} tickFormatter={(v) => `Yr ${v}`} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#151A23', borderColor: '#2A303C', color: '#F3F4F6' }}
                    formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Fixed Deposit" stroke="#9CA3AF" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Gold" stroke="#EAB308" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Mutual Fund" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Stocks" stroke="#10B981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Crypto" stroke="#A855F7" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
