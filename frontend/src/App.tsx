import { useEffect, useState } from 'react';
import { TABS } from './lib/tabs';
import { ThemeProvider } from './lib/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { LoadingBox } from './components/LoadingBox';
import { Sidebar } from './components/Sidebar';
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
  const { user } = useAuth();
  const isSidebarParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('sidebar') === 'open';
  const [isSidebarOpen, setIsSidebarOpen] = useState(isSidebarParam);

  // Initialize active tab with authorized tab or query param
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t && TABS.some((tab) => tab.id === t)) return t;
    }
    return user?.role.id === 'admin' ? 'executive' : user?.role.allowedTabs[0] || 'executive';
  });

  const [lastUpdated, setLastUpdated] = useState(() => formatLastUpdated(new Date()));
  const [refreshKey, setRefreshKey] = useState(0);

  const isFreezeLoading = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('freeze_loading') === 'true';
  const isSkipLoading = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('skip_loading') === 'true';

  // 1-Second Loading Box state for initial site entry and tab transitions
  const [isLoading, setIsLoading] = useState(!isSkipLoading);
  const [loadingMsg, setLoadingMsg] = useState('Initializing Financial Telemetry...');

  // Ensure user always lands on an authorized module for their role
  useEffect(() => {
    if (user && user.role.id !== 'admin' && !user.role.allowedTabs.includes(activeTab)) {
      setActiveTab(user.role.allowedTabs[0] || 'executive');
    }
  }, [user, activeTab]);

  // Update header timestamp on tab change
  useEffect(() => {
    setLastUpdated(formatLastUpdated(new Date()));
  }, [activeTab]);

  // Handle switching tabs with 1s loading animation
  const handleTabChange = (newTabId: string) => {
    if (newTabId === activeTab) return;
    const targetTab = TABS.find((t) => t.id === newTabId);
    setLoadingMsg(`Loading ${targetTab?.label || 'Module'}...`);
    setIsLoading(true);
    setActiveTab(newTabId);
  };

  // One and only refresh button of the dashboard
  const handleRefresh = () => {
    setLastUpdated(formatLastUpdated(new Date()));
    setLoadingMsg('Refreshing Live Financial Feed...');
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="app-container">
      {/* 1-Second Rising & Traversing Line Chart Loading Box */}
      <LoadingBox
        isLoading={isLoading}
        message={loadingMsg}
        freeze={isFreezeLoading}
        onFinish={() => setIsLoading(false)}
      />

      {/* Slide-out Navigation & Role Profile Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={handleTabChange}
      />

      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand-group">
            {/* Three lines menu button to toggle left sidebar */}
            <button
              className="hamburger-menu-btn"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              title="Open Navigation (Three lines)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Logo Emblem Icon + Brand Title */}
            <div className="logo">
              <img
                src="/assets/logo/emblem_icon.png"
                alt="LedgerFlow Emblem"
                className="logo-emblem-icon"
              />
              <div>
                <div className="logo-text">LedgerFlow</div>
                <div className="logo-sub">Financial Observability</div>
              </div>
            </div>
          </div>

          <div className="header-spacer" />

          {/* Top Bar Actions: ONLY Last Updated, Live, Theme Toggle, Refresh */}
          <div className="header-actions">
            {/* 1. Last Updated Button */}
            <div className="last-updated" title="Telemetry sync status">
              <span className="dot" />
              <span>{lastUpdated}</span>
            </div>

            {/* 2. Live Button with ONLY 'Live' written */}
            <div className="demo-badge" title="Real-time websocket feed active">
              <div className="demo-dot" />
              <span>Live</span>
            </div>

            {/* 3. Day / Night Theme Toggle Switch */}
            <ThemeToggle />

            {/* 4. One and Only Refresh Button of the Dashboard */}
            <button
              className="refresh-btn"
              onClick={handleRefresh}
              title="Refresh financial data"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        {activeTab === 'executive' && <ExecutiveTab refreshKey={refreshKey} />}
        {activeTab === 'cashflow' && <CashflowTab refreshKey={refreshKey} />}
        {activeTab === 'revenue' && <RevenueTab refreshKey={refreshKey} />}
        {activeTab === 'ops' && <OpsTab refreshKey={refreshKey} />}
        {activeTab === 'ar-aging' && <ArAgingTab refreshKey={refreshKey} />}
        {activeTab === 'live-pipeline' && <LivePipelineTab refreshKey={refreshKey} />}
      </main>
    </div>
  );
}

function AppGateway() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage onSuccess={() => {}} />;
  }

  return <MainDashboard />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppGateway />
      </AuthProvider>
    </ThemeProvider>
  );
}
