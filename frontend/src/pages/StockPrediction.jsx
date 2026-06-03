import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ArrowDownRight, ArrowUpRight, BrainCircuit, Clock, GitCompareArrows, Newspaper, RefreshCw, Search, Wifi, TrendingUp, TrendingDown, BarChart2, Target } from 'lucide-react';
import { motion } from 'framer-motion';

const MODEL_OPTIONS = [
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'lstm', label: 'LSTM Momentum' },
  { value: 'linear_regression', label: 'Linear Regression' },
  { value: 'random_forest', label: 'Random Forest' },
  { value: 'arima', label: 'ARIMA' },
];

const MODEL_COLORS = {
  hybrid: { stroke: '#EC4899', fill: 'rgba(236,72,153,0.15)', label: 'Hybrid' },
  lstm: { stroke: '#8B5CF6', fill: 'rgba(139,92,246,0.15)', label: 'LSTM Momentum' },
  linear_regression: { stroke: '#3B82F6', fill: 'rgba(59,130,246,0.15)', label: 'Linear Regression' },
  random_forest: { stroke: '#10B981', fill: 'rgba(16,185,129,0.15)', label: 'Random Forest' },
  arima: { stroke: '#F59E0B', fill: 'rgba(245,158,11,0.15)', label: 'ARIMA' },
};

function MultiModelComparisonChart({ compareData, historicalData, currency }) {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hiddenModels, setHiddenModels] = useState({});

  if (!compareData || !compareData.models) {
    return null;
  }

  const models = compareData.models;
  const modelKeys = Object.keys(models);
  const currentPrice = compareData.current_price;

  // Build unified data: array of { date, lstm, linear_regression, random_forest, arima, actual }
  const firstModel = models[modelKeys[0]];
  if (!firstModel?.predictions?.length) return null;

  const histData = historicalData ? historicalData.slice(-30).map((h, i) => {
    const point = { date: h.date, day: `H-${30 - i}`, actual: h.price };
    modelKeys.forEach(k => point[k] = null);
    return point;
  }) : [];

  const predData = firstModel.predictions.map((p, i) => {
    const point = { date: p.date, day: `F+${i + 1}`, actual: null };
    modelKeys.forEach(key => {
      point[key] = models[key]?.predictions?.[i]?.predicted_price ?? null;
    });
    return point;
  });

  if (histData.length > 0) {
    const todayIndex = histData.length - 1;
    modelKeys.forEach(k => {
      histData[todayIndex][k] = currentPrice;
    });
  }

  const chartData = [...histData, ...predData];

  // SVG dimensions
  const width = 1518;
  const height = 450;
  const pad = { top: 30, right: 60, bottom: 40, left: 80 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  // Get price range across all models
  const allPrices = [];
  chartData.forEach(point => {
    if (point.actual !== null) allPrices.push(point.actual);
    modelKeys.forEach(key => {
      if (!hiddenModels[key] && point[key] !== null) allPrices.push(point[key]);
    });
  });
  if (allPrices.length === 0) allPrices.push(currentPrice);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const range = Math.max(1, maxPrice - minPrice);
  const low = minPrice - range * 0.1;
  const high = maxPrice + range * 0.1;

  const xFor = i => pad.left + (i / Math.max(1, chartData.length - 1)) * plotWidth;
  const yFor = v => pad.top + ((high - v) / (high - low)) * plotHeight;
  const ticks = Array.from({ length: 6 }, (_, i) => low + ((high - low) * i) / 5).reverse();

  // Build polylines for each model
  const polylines = modelKeys.filter(k => !hiddenModels[k]).map(key => {
    const points = chartData
      .map((p, i) => p[key] !== null ? `${xFor(i)},${yFor(p[key])}` : null)
      .filter(Boolean)
      .join(' ');
    return { key, points, color: MODEL_COLORS[key] };
  });

  const actualPoints = chartData
    .map((p, i) => p.actual !== null ? `${xFor(i)},${yFor(p.actual)}` : null)
    .filter(Boolean)
    .join(' ');

  // X-axis labels
  const xLabels = [];
  const step = Math.max(1, Math.floor(chartData.length / 6));
  for (let i = 0; i < chartData.length; i += step) {
    xLabels.push({ i, date: chartData[i].date });
  }
  if (xLabels[xLabels.length - 1]?.i !== chartData.length - 1) {
    xLabels.push({ i: chartData.length - 1, date: chartData[chartData.length - 1].date });
  }

  const hovered = hoveredDay !== null ? chartData[hoveredDay] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md p-5 shadow-lg mt-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
          <GitCompareArrows size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">Multi-Model Comparison</h3>
          <p className="text-xs text-textSecondary mb-2">All 4 ML models plotted against the same {compareData.days}-day forecast window</p>

        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-textSecondary px-2 py-1">
          <span className="w-5 h-0.5 inline-block rounded" style={{ backgroundColor: '#ffffff' }} /> Actual Price History
        </span>
        <span className="inline-flex items-center gap-1.5 text-textSecondary px-2 py-1">
          <span className="w-3 h-0.5 bg-white/40 inline-block border-t border-dashed border-white/40" /> Current Price Baseline
        </span>
        {modelKeys.map(key => {
          const isHidden = hiddenModels[key];
          return (
            <button 
              key={key} 
              onClick={() => setHiddenModels(prev => ({...prev, [key]: !prev[key]}))}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${isHidden ? 'opacity-50 grayscale hover:opacity-80' : 'opacity-100 hover:bg-white/5'}`}
            >
              <span className="w-5 h-0.5 inline-block rounded" style={{ backgroundColor: MODEL_COLORS[key].stroke }} />
              <span style={{ color: isHidden ? '#8899AA' : MODEL_COLORS[key].stroke }} className="font-semibold">{MODEL_COLORS[key].label}</span>
            </button>
          );
        })}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="aspect-[1518/450] w-full overflow-visible" onMouseLeave={() => setHoveredDay(null)}>
        <defs>
          {modelKeys.map(key => (
            <linearGradient key={key} id={`grad_${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MODEL_COLORS[key].stroke} stopOpacity="0.25" />
              <stop offset="100%" stopColor={MODEL_COLORS[key].stroke} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {ticks.map(tick => (
          <g key={tick}>
            <line x1={pad.left} y1={yFor(tick)} x2={width - pad.right} y2={yFor(tick)} stroke="#ffffff08" strokeWidth="1" />
            <text x={pad.left - 10} y={yFor(tick) + 4} textAnchor="end" fill="#8899AA" fontSize="12" fontFamily="monospace">
              {currency}{formatNumber(tick)}
            </text>
          </g>
        ))}

        {/* Current price baseline */}
        <line x1={pad.left} y1={yFor(currentPrice)} x2={width - pad.right} y2={yFor(currentPrice)} stroke="#ffffff40" strokeWidth="1" strokeDasharray="6,4" />
        <text x={width - pad.right + 8} y={yFor(currentPrice) + 4} fill="#ffffff80" fontSize="11" fontFamily="monospace">
          {currency}{formatNumber(currentPrice)}
        </text>

        {/* Area fills + Lines for each model */}
        {actualPoints && (
          <polyline points={actualPoints} fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {polylines.map(({ key, points, color }) => {
          if (!points) return null;
          // Build area path
          const pts = chartData
            .map((p, i) => p[key] !== null ? { x: xFor(i), y: yFor(p[key]) } : null)
            .filter(Boolean);
          if (pts.length < 2) return null;
          const areaPath = `M${pts[0].x},${yFor(currentPrice)} L${pts.map(p => `${p.x},${p.y}`).join(' L')} L${pts[pts.length - 1].x},${yFor(currentPrice)} Z`;
          return (
            <g key={key}>
              <path d={areaPath} fill={`url(#grad_${key})`} />
              <polyline points={points} fill="none" stroke={color.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map(({ i, date }) => (
          <text key={i} x={xFor(i)} y={height - 8} textAnchor="middle" fill="#8899AA" fontSize="11" fontFamily="monospace">
            {date.slice(5)}
          </text>
        ))}

        {/* Hover interaction */}
        {chartData.map((_, i) => (
          <rect
            key={i}
            x={xFor(i) - plotWidth / chartData.length / 2}
            y={pad.top}
            width={plotWidth / chartData.length}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHoveredDay(i)}
          />
        ))}

        {/* Hover crosshair + dots */}
        {hoveredDay !== null && (
          <g>
            <line x1={xFor(hoveredDay)} y1={pad.top} x2={xFor(hoveredDay)} y2={pad.top + plotHeight} stroke="#ffffff30" strokeWidth="1" />
            {chartData[hoveredDay]?.actual !== null && (
              <circle cx={xFor(hoveredDay)} cy={yFor(chartData[hoveredDay].actual)} r="4" fill="#ffffff" stroke="#0a0a0f" strokeWidth="2" />
            )}
            {modelKeys.filter(k => !hiddenModels[k]).map(key => {
              const val = chartData[hoveredDay]?.[key];
              if (val === null || val === undefined) return null;
              return <circle key={key} cx={xFor(hoveredDay)} cy={yFor(val)} r="5" fill={MODEL_COLORS[key].stroke} stroke="#0a0a0f" strokeWidth="2" />;
            })}
          </g>
        )}

        {/* Hover tooltip */}
        {hovered && (
          <foreignObject x={xFor(hoveredDay) > width / 2 ? xFor(hoveredDay) - 280 : xFor(hoveredDay) + 16} y={pad.top + 10} width="260" height={40 + (modelKeys.filter(k => !hiddenModels[k] && hovered[k] !== null).length + (hovered.actual !== null ? 1 : 0)) * 32}>
            <div style={{ background: 'rgba(15,17,22,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              <div style={{ color: '#8899AA', marginBottom: '8px', fontWeight: 600, fontSize: '11px' }}>Day {hovered.day} · {hovered.date}</div>
              {hovered.actual !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '11px' }}>Actual Price</span>
                  <span style={{ color: '#fff', fontWeight: 800, fontFamily: 'monospace', fontSize: '12px' }}>{currency}{formatNumber(hovered.actual)}</span>
                </div>
              )}
              {modelKeys.filter(k => !hiddenModels[k]).map(key => (
                hovered[key] !== null && (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: MODEL_COLORS[key].stroke, fontWeight: 700, fontSize: '11px' }}>{MODEL_COLORS[key].label}</span>
                    <span style={{ color: '#fff', fontWeight: 800, fontFamily: 'monospace', fontSize: '12px' }}>{currency}{formatNumber(hovered[key])}</span>
                  </div>
                )
              ))}
            </div>
          </foreignObject>
        )}
      </svg>

      {/* Target price summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {modelKeys.map(key => {
          const m = models[key];
          const isUp = m.change_pct >= 0;
          const isHidden = hiddenModels[key];
          return (
            <div key={key} className={`rounded-lg border px-4 py-3 transition-all ${isHidden ? 'opacity-30 grayscale' : 'opacity-100'}`} style={{ borderColor: MODEL_COLORS[key].stroke + '40', background: MODEL_COLORS[key].fill }}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: MODEL_COLORS[key].stroke }}>{m.name}</p>
              <p className="text-base font-extrabold text-white">{currency}{formatNumber(m.target_price)}</p>
              <p className={`text-xs font-semibold mt-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{m.change_pct}%
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '--';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function getCurrencyPrefix(payload) {
  const symbol = payload?.symbol || '';
  const currency = payload?.currency_symbol || '';
  if (currency === '$') return '$';
  if (currency === 'INR' || symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol.startsWith('^')) {
    return 'INR ';
  }
  return '$';
}

function HistoryForecastChart({ chart, currency }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const zoomRange = 'all';
  const visibleChart = useMemo(() => {
    if (!chart?.length) return [];
    const candles = chart.filter(point => point.close !== null && point.close !== undefined);
    const forecasts = chart.filter(point => point.close === null || point.close === undefined);
    return chart;
  }, [chart]);

  if (!visibleChart.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-textSecondary">
        No history data available for this symbol.
      </div>
    );
  }

  const width = 1518;
  const height = 650;
  const pad = { top: 12, right: 8, bottom: 32, left: 8 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const priceValues = visibleChart.flatMap(point => [point.high, point.low, point.close, point.forecast]).filter(value => value !== null && value !== undefined);
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);
  const range = Math.max(1, maxPrice - minPrice);
  const low = minPrice - range * 0.08;
  const high = maxPrice + range * 0.08;
  const xStep = plotWidth / Math.max(1, visibleChart.length - 1);
  const candleWidth = Math.max(7, Math.min(18, xStep * 0.62));
  const yFor = value => pad.top + ((high - value) / (high - low)) * plotHeight;
  const xFor = index => pad.left + index * xStep;
  const forecastPoints = visibleChart
    .map((point, index) => point.forecast !== null && point.forecast !== undefined ? `${xFor(index)},${yFor(point.forecast)}` : null)
    .filter(Boolean)
    .join(' ');
  const ticks = Array.from({ length: 5 }, (_, index) => low + ((high - low) * index) / 4).reverse();
  const labelIndexes = [0, Math.floor((visibleChart.length - 1) / 2), visibleChart.length - 1];
  const hovered = hoverIndex !== null ? visibleChart[hoverIndex] : null;
  const hoverPrice = hovered?.close ?? hovered?.forecast;
  const hoverX = hoverIndex !== null ? xFor(hoverIndex) : null;
  const hoverY = hoverPrice !== null && hoverPrice !== undefined ? yFor(hoverPrice) : null;
  const tooltipWidth = 218;
  const tooltipHeight = hovered?.close !== null && hovered?.close !== undefined ? 116 : 74;
  const tooltipX = hoverX !== null && hoverX > width - pad.right - tooltipWidth - 16 ? hoverX - tooltipWidth - 16 : (hoverX ?? pad.left) + 16;
  const tooltipY = hoverY !== null ? Math.max(pad.top + 8, Math.min(height - pad.bottom - tooltipHeight - 8, hoverY - tooltipHeight / 2)) : pad.top;

  return (
    <div className="rounded-lg border border-primary/20 bg-background/70 p-2 shadow-inner">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-textSecondary">Price History</p>
          <p className="text-[11px] text-textSecondary">Hover any candle to trace exact price values</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-3 text-xs text-textSecondary">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 bg-green-500/70 border border-green-400 inline-block" /> Up</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 bg-red-500/70 border border-red-400 inline-block" /> Down</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-6 shrink-0 bg-sky-400 inline-block" /> Forecast</span>
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="aspect-[1518/650] w-full overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="forecastGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.14" />
            <stop offset="55%" stopColor="#151A23" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} rx="10" fill="url(#chartFill)" stroke="#38BDF8" strokeOpacity="0.38" strokeWidth="1.5" />
        {ticks.map(tick => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#2A303C" strokeDasharray="4 5" />
              <text x={width - pad.right - 10} y={y + 4} fill="#CBD5E1" fontSize="12" textAnchor="end">
                {currency}{formatNumber(tick)}
              </text>
            </g>
          );
        })}

        {visibleChart.map((point, index) => {
          if (point.close === null || point.close === undefined) return null;
          const x = xFor(index);
          const up = point.close >= point.open;
          const color = up ? '#10B981' : '#EF4444';
          const openY = yFor(point.open);
          const closeY = yFor(point.close);
          const highY = yFor(point.high);
          const lowY = yFor(point.low);
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(2, Math.abs(closeY - openY));

          return (
            <g key={point.date}>
              <title>{`${point.date}\nOpen: ${currency}${formatNumber(point.open)}\nHigh: ${currency}${formatNumber(point.high)}\nLow: ${currency}${formatNumber(point.low)}\nClose: ${currency}${formatNumber(point.close)}`}</title>
              <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth="1.5" />
              <rect
                x={x - candleWidth / 2}
                y={bodyY}
                width={candleWidth}
                height={bodyHeight}
                rx="1.5"
                fill={up ? 'rgba(16, 185, 129, 0.58)' : 'rgba(239, 68, 68, 0.58)'}
                stroke={color}
                strokeWidth="1.7"
              />
            </g>
          );
        })}

        {forecastPoints && (
          <polyline points={forecastPoints} fill="none" stroke="url(#forecastGlow)" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {visibleChart.map((point, index) => {
          if (point.forecast === null || point.forecast === undefined) return null;
          return (
            <circle key={`forecast-${point.date}`} cx={xFor(index)} cy={yFor(point.forecast)} r="3.5" fill="#38BDF8">
              <title>{`${point.date}\nForecast: ${currency}${formatNumber(point.forecast)}`}</title>
            </circle>
          );
        })}

        {visibleChart.map((point, index) => (
          <rect
            key={`hover-zone-${point.date}`}
            x={xFor(index) - xStep / 2}
            y={pad.top}
            width={Math.max(12, xStep)}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(index)}
            onFocus={() => setHoverIndex(index)}
          />
        ))}

        {hovered && hoverX !== null && hoverY !== null && (
          <g pointerEvents="none">
            <line x1={hoverX} x2={hoverX} y1={pad.top} y2={height - pad.bottom} stroke="#94A3B8" strokeDasharray="5 5" strokeOpacity="0.7" />
            <line x1={pad.left} x2={width - pad.right} y1={hoverY} y2={hoverY} stroke="#94A3B8" strokeDasharray="5 5" strokeOpacity="0.4" />
            <circle cx={hoverX} cy={hoverY} r="5" fill={hovered.close !== null && hovered.close !== undefined ? '#F8FAFC' : '#38BDF8'} stroke="#0F172A" strokeWidth="2" />
            <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="8" fill="#151A23" stroke="#38BDF8" strokeOpacity="0.75" />
            <text x={tooltipX + 12} y={tooltipY + 22} fill="#F3F4F6" fontSize="13" fontWeight="700">{hovered.date}</text>
            {hovered.close !== null && hovered.close !== undefined ? (
              <>
                <text x={tooltipX + 12} y={tooltipY + 43} fill="#9CA3AF" fontSize="12">Open</text>
                <text x={tooltipX + 100} y={tooltipY + 43} fill="#F3F4F6" fontSize="12" fontWeight="700">{currency}{formatNumber(hovered.open)}</text>
                <text x={tooltipX + 12} y={tooltipY + 62} fill="#9CA3AF" fontSize="12">High</text>
                <text x={tooltipX + 100} y={tooltipY + 62} fill="#10B981" fontSize="12" fontWeight="700">{currency}{formatNumber(hovered.high)}</text>
                <text x={tooltipX + 12} y={tooltipY + 81} fill="#9CA3AF" fontSize="12">Low</text>
                <text x={tooltipX + 100} y={tooltipY + 81} fill="#EF4444" fontSize="12" fontWeight="700">{currency}{formatNumber(hovered.low)}</text>
                <text x={tooltipX + 12} y={tooltipY + 100} fill="#9CA3AF" fontSize="12">Close</text>
                <text x={tooltipX + 100} y={tooltipY + 100} fill="#F3F4F6" fontSize="12" fontWeight="700">{currency}{formatNumber(hovered.close)}</text>
              </>
            ) : (
              <>
                <text x={tooltipX + 12} y={tooltipY + 47} fill="#9CA3AF" fontSize="12">Forecast</text>
                <text x={tooltipX + 100} y={tooltipY + 47} fill="#38BDF8" fontSize="12" fontWeight="700">{currency}{formatNumber(hovered.forecast)}</text>
              </>
            )}
          </g>
        )}

        {labelIndexes.map(index => (
          <text key={index} x={xFor(index)} y={height - 18} fill="#9CA3AF" fontSize="12" textAnchor={index === 0 ? 'start' : index === visibleChart.length - 1 ? 'end' : 'middle'}>
            {visibleChart[index]?.date}
          </text>
        ))}
      </svg>
    </div>
  );
}

function sentimentTone(label) {
  if (label === 'positive') return 'text-green-400 bg-green-500/10 border-green-500/20';
  if (label === 'negative') return 'text-red-400 bg-red-500/10 border-red-500/20';
  return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20';
}

function NewsSentimentWidget({ data, loading, error, onRefresh }) {
  const distribution = data?.distribution || { positive: 0, neutral: 0, negative: 0 };
  const total = Math.max(1, distribution.positive + distribution.neutral + distribution.negative);
  const pct = value => `${Math.round((value / total) * 100)}%`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md p-4 sm:p-5 shadow-lg flex flex-col h-full"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Newspaper size={20} className="text-primary" />
            <h3 className="text-lg font-bold">Live News Sentiment Analysis</h3>
            {data && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sentimentTone(data.overall_sentiment)}`}>
                {data.overall_sentiment}
              </span>
            )}
          </div>
          <p className="text-xs text-textSecondary mt-1 truncate">
            {data ? `${data.symbol} · ${data.model}` : 'Yahoo Finance headlines scored with FinBERT sentiment'}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh News
        </button>
      </div>

      {loading && (
        <div className="py-8 text-center text-sm text-textSecondary animate-pulse">
          Fetching live headlines and scoring sentiment...
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-textSecondary font-semibold">Average Score</p>
              <p className={`mt-1 text-xl font-extrabold ${data.average_score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.average_score > 0 ? '+' : ''}{data.average_score}
              </p>
            </div>
            {[
              ['Positive', distribution.positive, 'bg-green-400'],
              ['Neutral', distribution.neutral, 'bg-yellow-300'],
              ['Negative', distribution.negative, 'bg-red-400'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-lg border border-border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-textSecondary font-semibold">{label}</p>
                  <p className="text-xs font-bold text-white">{value}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-surfaceHover overflow-hidden">
                  <div className={`h-full ${color}`} style={{ width: pct(value) }} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {data.articles.map(article => (
              <a
                key={`${article.title}-${article.published}`}
                href={article.link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-border bg-background/50 p-4 transition hover:border-primary/40 hover:bg-background/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-white leading-snug">{article.title}</p>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sentimentTone(article.sentiment)}`}>
                    {article.sentiment}
                  </span>
                </div>
                {article.summary && (
                  <p className="mt-2 line-clamp-2 text-xs text-textSecondary leading-relaxed">{article.summary}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-textSecondary">
                  <span>{article.published || 'Live headline'}</span>
                  <span>confidence {Math.round(article.confidence * 100)}%</span>
                </div>
              </a>
            ))}
          </div>

          <p className="text-[11px] text-textSecondary">{data.model_status}</p>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="py-8 text-center text-sm text-textSecondary flex-1 flex items-center justify-center">
          Analyze a ticker to load live news sentiment.
        </div>
      )}
    </motion.div>
  );
}

export default function StockPrediction() {
  const [ticker, setTicker] = useState('RELIANCE.NS');
  const [model, setModel] = useState('hybrid');
  const [forecastDays, setForecastDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newsData, setNewsData] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState('');
  
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Initial load
  useEffect(() => {
    fetchPrediction(null, 'hybrid', 7);
  }, []);

  const fetchPrediction = async (e, selectedModel = model, selectedDays = forecastDays) => {
    e?.preventDefault();
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;

    setLoading(true);
    setError('');
    setNewsLoading(true);
    setNewsError('');
    try {
      const res = await axios.get(`/api/predict/${encodeURIComponent(symbol)}`, {
        params: { model: selectedModel, days: selectedDays },
      });
      if (res.data.status === 'success') {
        const historical = res.data.historical.map(d => ({
          date: d.date,
          open: d.open ?? d.price,
          high: d.high ?? d.price,
          low: d.low ?? d.price,
          close: d.price,
          forecast: null,
        }));
        const prediction = res.data.prediction.map(d => ({
          date: d.date,
          open: null,
          high: null,
          low: null,
          close: null,
          forecast: d.predicted_price,
        }));
        if (historical.length > 0 && prediction.length > 0) {
          historical[historical.length - 1] = {
            ...historical[historical.length - 1],
            forecast: historical[historical.length - 1].close,
          };
        }
        const combined = [
          ...historical,
          ...prediction,
        ];
        setData({ ...res.data, chart: combined });
        setTicker(res.data.symbol || symbol);
      }
    } catch (err) {
      console.error(err);
      setData(null);
      setError(err.response?.data?.detail || 'Could not fetch a live Yahoo Finance price for this ticker.');
    } finally {
      setLoading(false);
    }

    try {
      const newsRes = await axios.get(`/api/news-sentiment/${encodeURIComponent(symbol)}`);
      if (newsRes.data.status === 'success') {
        setNewsData(newsRes.data);
      } else {
        setNewsError('Could not fetch news data.');
      }
    } catch(err) {
      console.error("News fetch error:", err);
      setNewsError(err.response?.data?.detail || 'Could not fetch news sentiment.');
      setNewsData(null);
    } finally {
      setNewsLoading(false);
    }

    // Fetch multi-model comparison
    try {
      setCompareLoading(true);
      const compRes = await axios.get(`/api/predict-compare/${encodeURIComponent(symbol)}`, {
        params: { days: selectedDays },
      });
      if (compRes.data.status === 'success') {
        setCompareData(compRes.data);
      }
    } catch(err) {
      console.error('Compare fetch error:', err);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setModel(newModel);
    fetchPrediction(null, newModel, forecastDays);
  };

  const currency = getCurrencyPrefix(data);
  const isUp = (data?.change ?? 0) >= 0;
  const stats = data ? [
    { label: 'Day High', value: `${currency}${formatNumber(data.day_high)}`, tone: 'text-green-400', icon: <TrendingUp size={14} className="text-green-400" /> },
    { label: 'Day Low', value: `${currency}${formatNumber(data.day_low)}`, tone: 'text-red-400', icon: <TrendingDown size={14} className="text-red-400" /> },
    { label: 'Volume', value: formatNumber(data.volume), tone: 'text-textPrimary', icon: <BarChart2 size={14} className="text-textSecondary" /> },
    { label: 'Forecast Target', value: `${currency}${formatNumber(data.forecast?.forecast_target_price)}`, tone: 'text-primary', icon: <Target size={14} className="text-primary" /> },
    { label: 'Model', value: data.forecast?.model_name || data.model, tone: 'text-textPrimary', icon: <BrainCircuit size={14} className="text-purple-400" /> },
  ] : [];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Activity size={24} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-textSecondary">Stock Sentiment & Prediction</h2>
            {data?.data_source === 'yahoo_chart' && (
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1.5 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/20 bg-green-500/10 uppercase tracking-widest ml-2"
              >
                <Wifi size={10} /> LIVE
              </motion.span>
            )}
          </div>
          <p className="text-textSecondary text-sm mt-1">Advanced ML forecasting synced with live market data</p>
        </div>
        <form onSubmit={fetchPrediction} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex relative w-full sm:w-auto">
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="Enter Ticker (e.g. AAPL)"
              className="bg-background border border-border rounded-l-lg pl-10 pr-4 py-2 focus:outline-none focus:border-primary w-full"
            />
            <Search className="absolute left-3 top-2.5 text-textSecondary" size={18} />
            <button type="submit" disabled={loading} className="bg-primary hover:bg-primaryHover px-4 rounded-r-lg font-medium transition disabled:opacity-50">
              {loading ? '...' : 'Analyze'}
            </button>
          </div>
        </form>
      </div>

      <div className="min-h-[640px] flex flex-col">
        {!data && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-textSecondary gap-3">
            <p>{error || 'Search a stock ticker to see live Yahoo Finance predictions'}</p>
            {error && (
              <p className="text-xs max-w-xl">
                Try Yahoo symbols like RELIANCE.NS, TCS.NS, AAPL, SENSEX, NIFTY50, or BANKNIFTY.
              </p>
            )}
          </div>
        )}
        {loading && (
          <div className="flex-1 flex items-center justify-center text-textSecondary animate-pulse">
            Fetching live price from Yahoo Finance...
          </div>
        )}
        {data && !loading && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.4 }}
           >
             <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6 bg-surface/50 p-6 rounded-2xl border border-border/50 backdrop-blur-sm">
               <div className="min-w-0">
                 <div className="flex flex-wrap items-center gap-3 mb-2">
                   <h3 className="text-2xl font-bold break-words text-white">{data.symbol}</h3>
                   <span className="text-[10px] font-bold tracking-widest bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full uppercase">
                     {data.forecast?.model_name || data.model}
                   </span>
                 </div>
                 <p className="text-sm text-textSecondary break-words">
                   {data.name} · {data.live?.exchange || 'Yahoo Finance'}
                 </p>
               </div>
               <div className="shrink-0 text-left lg:text-right">
                 <p className="text-3xl sm:text-4xl font-extrabold whitespace-nowrap text-white drop-shadow-md">
                   {currency}{formatNumber(data.current_price)}
                 </p>
                 <p className={`text-sm sm:text-base font-semibold inline-flex items-center justify-end gap-1 mt-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                   {isUp ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                   {isUp ? '+' : ''}{currency}{formatNumber(data.change)} ({isUp ? '+' : ''}{formatNumber(data.change_pct)}%)
                 </p>
               </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
               {stats.map((stat, i) => (
                 <motion.div 
                   key={stat.label} 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: i * 0.05 + 0.2 }}
                   whileHover={{ scale: 1.02 }}
                   className="min-w-0 bg-surface/80 backdrop-blur-md border border-border/60 shadow-lg rounded-xl px-4 py-4 transition-all hover:bg-surface hover:border-border"
                 >
                   <div className="flex items-center gap-2 mb-1.5">
                     {stat.icon}
                     <p className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">{stat.label}</p>
                   </div>
                   <p className={`text-base font-extrabold mt-1 truncate ${stat.tone}`} title={String(stat.value)}>{stat.value}</p>
                 </motion.div>
               ))}
             </div>

             <div className="flex flex-col gap-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <NewsSentimentWidget data={newsData} loading={newsLoading} error={newsError} onRefresh={() => fetchPrediction(null, model)} />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col"
                >
                  <HistoryForecastChart chart={data.chart} currency={currency} />
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-surface/50 border border-border/50 rounded-xl backdrop-blur-sm">
                    <div className="text-sm text-textSecondary">
                      <strong className="text-white">Forecast Length:</strong> Customize how many days into the future the model should predict.
                    </div>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (forecastDays > 0) fetchPrediction(null, model, forecastDays);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input 
                        type="number" 
                        min="1" 
                        max="60"
                        value={forecastDays}
                        onChange={(e) => setForecastDays(e.target.value ? Number(e.target.value) : '')}
                        onBlur={() => {
                          if (!forecastDays || forecastDays < 1) setForecastDays(1);
                          else if (forecastDays > 60) setForecastDays(60);
                        }}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:border-primary text-white font-semibold text-center"
                        placeholder="Days"
                      />
                      <button 
                        type="submit"
                        disabled={loading || !forecastDays || forecastDays < 1}
                        className="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </form>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 text-xs text-textSecondary mt-4 px-2">
                    <Clock size={12} />
                    Last Yahoo sync: {data.live?.as_of || data.historical?.at(-1)?.date}
                  </div>
                </motion.div>

                {/* Multi-Model Comparison */}
                {compareLoading && (
                  <div className="mt-8 flex items-center justify-center text-textSecondary animate-pulse py-12">
                    Loading multi-model comparison...
                  </div>
                )}
                {compareData && !compareLoading && (
                  <MultiModelComparisonChart compareData={compareData} historicalData={data?.historical} currency={currency} />
                )}
             </div>
           </motion.div>
        )}
      </div>
    </motion.div>
  );
}
