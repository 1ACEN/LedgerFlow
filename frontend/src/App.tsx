import { useEffect, useState } from 'react';
import { TABS, PORTED_TABS } from './lib/tabs';
import NotPortedPanel from './components/NotPortedPanel';
import ArAgingTab from './features/ar-aging/ArAgingTab';

function formatLastUpdated(d: Date): string {
  return 'Updated ' + d.toLocaleTimeString();
}

export default function App() {
  const [activeTab, setActiveTab] = useState('ar-aging');
  const [lastUpdated, setLastUpdated] = useState(() => formatLastUpdated(new Date()));

  // Update the header timestamp on mount and whenever the tab changes —
  // mirrors updateLastUpdated() in the classic dashboard.
  useEffect(() => {
    setLastUpdated(formatLastUpdated(new Date()));
  }, [activeTab]);

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
            <ArAgingTab />
          ) : null
        ) : (
          <NotPortedPanel tabId={activeTab} />
        )}
      </main>
    </div>
  );
}