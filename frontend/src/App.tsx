import { useEffect, useState } from 'react';
import { TABS } from './lib/tabs';
import { ThemeProvider } from './lib/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import ArAgingTab from './features/ar-aging/ArAgingTab';
import RevenueTab from './features/revenue/RevenueTab';
import CashflowTab from './features/cashflow/CashflowTab';
import { ExecutiveTab } from './features/executive/ExecutiveTab';
import { OpsTab } from './features/ops/OpsTab';
import { LivePipelineTab } from './features/live-pipeline/LivePipelineTab';

function formatLastUpdated(d: Date): string {
  return 'Updated ' + d.toLocaleTimeString();
}

function MainDashboard() {
  const [activeTab, setActiveTab] = useState('ar-aging');
  const [lastUpdated, setLastUpdated] = useState(() => formatLastUpdated(new Date()));
  const [refreshKey, setRefreshKey] = useState(0);

  // Update the header timestamp on mount and whenever the tab changes —
  // mirrors updateLastUpdated() in the classic dashboard.
  useEffect(() => {
    setLastUpdated(formatLastUpdated(new Date()));
  }, [activeTab]);

  const handleRefresh = () => {
    setLastUpdated(formatLastUpdated(new Date()));
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="4" width="18" height="6" rx="2" fill="white" fillOpacity="0.95" />
                <rect x="3" y="14" width="18" height="6" rx="2" fill="white" fillOpacity="0.65" />
                <circle cx="16.5" cy="7" r="1.5" fill="#38bdf8" />
                <circle cx="7.5" cy="17" r="1.5" fill="#a855f7" />
              </svg>
            </div>
            <div>
              <div className="logo-text">LedgerFlow</div>
              <div className="logo-sub">Financial Observability</div>
            </div>
          </div>
          <div className="header-spacer"></div>
          <div className="header-actions">
            <div className="last-updated">
              <span className="dot"></span>
              <span>{lastUpdated}</span>
            </div>
            <div className="demo-badge">
              <div className="demo-dot"></div>
              <span>Live Stream</span>
            </div>
            <ThemeToggle />
            <button className="refresh-btn" onClick={handleRefresh} title="Refresh current tab">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              Refresh
            </button>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="link-btn"
              title="Open FastAPI documentation"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              API Docs
            </a>
          </div>
        </div>
        <nav className="tab-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={'tab-btn' + (tab.id === activeTab ? ' active' : '')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="layout">
        {activeTab === 'ar-aging' && <ArAgingTab refreshKey={refreshKey} />}
        {activeTab === 'revenue' && <RevenueTab refreshKey={refreshKey} />}
        {activeTab === 'cashflow' && <CashflowTab refreshKey={refreshKey} />}
        {activeTab === 'executive' && <ExecutiveTab refreshKey={refreshKey} />}
        {activeTab === 'ops' && <OpsTab refreshKey={refreshKey} />}
        {activeTab === 'live-pipeline' && <LivePipelineTab refreshKey={refreshKey} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainDashboard />
    </ThemeProvider>
  );
}
