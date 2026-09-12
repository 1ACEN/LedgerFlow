import { useEffect, useState } from 'react';
import { TABS, PORTED_TABS } from './lib/tabs';
import NotPortedPanel from './components/NotPortedPanel';
import ArAgingTab from './features/ar-aging/ArAgingTab';
import RevenueTab from './features/revenue/RevenueTab';

function formatLastUpdated(d: Date): string {
  return 'Updated ' + d.toLocaleTimeString();
}

export default function App() {
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
    <div>
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">◈</div>
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
            <button className="refresh-btn" onClick={handleRefresh} title="Refresh current tab">
              🔄 Refresh
            </button>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="link-btn"
              title="Open FastAPI documentation"
            >
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
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="layout">
        {PORTED_TABS.has(activeTab) ? (
          activeTab === 'ar-aging' ? (
            <ArAgingTab refreshKey={refreshKey} />
          ) : activeTab === 'revenue' ? (
            <RevenueTab refreshKey={refreshKey} />
          ) : null
        ) : (
          <NotPortedPanel tabId={activeTab} />
        )}
      </main>
    </div>
  );
}