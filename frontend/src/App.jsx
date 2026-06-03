import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Calculator, Bot, Bell, Compass, Briefcase, PieChart, Activity, LineChart } from 'lucide-react';

import { motion } from 'framer-motion';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import StockPrediction from './pages/StockPrediction';
import SIPCalculator from './pages/SIPCalculator';
import FDCalculator from './pages/FDCalculator';
import AIChatbot from './pages/AIChatbot';

import Explore from './pages/Explore';
import Portfolio from './pages/Portfolio';
import Holdings from './pages/Holdings';
import LiveMarket from './pages/LiveMarket';

// ─── Sidebar ────────────────────────────────────────────────
function Sidebar() {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard',     path: '/dashboard',          icon: <LayoutDashboard size={20} /> },
    { name: 'Live Market',   path: '/dashboard/market',   icon: <Activity size={20} /> },
    { name: 'Explore',       path: '/dashboard/explore',  icon: <Compass size={20} /> },
    { name: 'Portfolio',     path: '/dashboard/portfolio',icon: <PieChart size={20} /> },
    { name: 'Holdings',      path: '/dashboard/holdings', icon: <Briefcase size={20} /> },
    { name: 'Stock Analysis',path: '/dashboard/stocks',   icon: <TrendingUp size={20} /> },
    { name: 'SIP Calculator',path: '/dashboard/sip',      icon: <Calculator size={20} /> },
    { name: 'FD Calculator', path: '/dashboard/fd',       icon: <Calculator size={20} /> },
    { name: 'AI Advisor',    path: '/dashboard/ai',       icon: <Bot size={20} /> },
  ];

  const isOnDashboard = location.pathname.startsWith('/dashboard');
  if (!isOnDashboard) return null;

  return (
    <aside className="w-64 bg-surface border-r border-border h-screen sticky top-0 flex flex-col hidden md:flex shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2 text-primary font-bold text-base">
          <Bot size={22} />
          <span>AI Financial Advisor</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-textSecondary hover:bg-surfaceHover hover:text-textPrimary border border-transparent'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.name}</span>
              {isActive && (
                <motion.div layoutId="sidebarIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-3 bg-surfaceHover rounded-lg border border-border">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Guest User</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Navbar ─────────────────────────────────────────────────
function MobileNavigation() {
  const location = useLocation();
  const isOnDashboard = location.pathname.startsWith('/dashboard');
  if (!isOnDashboard) return null;

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Market', path: '/dashboard/market', icon: <Activity size={20} /> },
    { name: 'Explore', path: '/dashboard/explore', icon: <Compass size={20} /> },
    { name: 'Stocks', path: '/dashboard/stocks', icon: <TrendingUp size={20} /> },
    { name: 'AI', path: '/dashboard/ai', icon: <Bot size={20} /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur border-t border-border">
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium ${
                isActive ? 'text-primary' : 'text-textSecondary'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Navbar() {
  const location = useLocation();
  const isOnDashboard = location.pathname.startsWith('/dashboard');
  if (!isOnDashboard) return null;

  const pageLabel = (() => {
    const seg = location.pathname.split('/').pop();
    const map = { dashboard: 'Dashboard', stocks: 'Stock Analysis & Forecast', sip: 'SIP Calculator', fd: 'FD Calculator', ai: 'AI Advisor' };
    return map[seg] || 'Dashboard';
  })();

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 w-full">
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-base sm:text-lg font-semibold truncate">{pageLabel}</h2>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-textSecondary hover:text-primary transition-colors">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            U
          </div>
          <span className="text-sm font-medium hidden sm:block">Guest User</span>
        </div>
      </div>
    </header>
  );
}

// ─── App Shell ───────────────────────────────────────────────
function AppShell() {
  return (
    <div className="flex min-h-screen dashboard-grid-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6 overflow-auto">
          <Routes>
            {/* Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/explore" element={<Explore />} />
            <Route path="/dashboard/portfolio" element={<Portfolio />} />
            <Route path="/dashboard/holdings" element={<Holdings />} />
            <Route path="/dashboard/stocks" element={<StockPrediction />} />
            <Route path="/dashboard/sip" element={<SIPCalculator />} />
            <Route path="/dashboard/fd" element={<FDCalculator />} />
            <Route path="/dashboard/market" element={<LiveMarket />} />
            <Route path="/dashboard/ai" element={<AIChatbot />} />
          </Routes>
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}
