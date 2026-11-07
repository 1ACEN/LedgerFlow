import React, { useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { TABS, TabDef } from '../lib/tabs';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

function getTabIcon(tabId: string) {
  switch (tabId) {
    case 'executive':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
      );
    case 'cashflow':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case 'revenue':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      );
    case 'ops':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="14" x2="23" y2="14" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="14" x2="4" y2="14" />
        </svg>
      );
    case 'ar-aging':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'live-pipeline':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    default:
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
}) => {
  const { user, logout } = useAuth();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when sidebar drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter ONLY accessible pages for the current role
  // All pages visible strictly for admin; for others, only allowed tabs are visible
  const accessibleTabs: TabDef[] = user?.role.id === 'admin'
    ? TABS
    : TABS.filter((tab) => user?.role.allowedTabs.includes(tab.id));

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    onClose();
  };

  const handleSwitchRole = () => {
    onClose();
    logout();
  };

  return (
    <div className="sidebar-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <aside
        className="sidebar-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Navigation & User Sidebar"
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img
              src="/assets/logo/emblem_icon.png"
              alt="LedgerFlow Emblem"
              className="sidebar-emblem"
            />
            <div>
              <div className="sidebar-brand-name">LedgerFlow</div>
              <div className="sidebar-brand-sub">Financial Observability</div>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            title="Close navigation (Esc)"
            aria-label="Close sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* User Identity Profile Card */}
        {user && (
          <div className="sidebar-user-card">
            <div className="sidebar-user-top">
              <div
                className="sidebar-avatar"
                style={{
                  backgroundColor: `${user.role.badgeColor}20`,
                  color: user.role.badgeColor,
                  borderColor: `${user.role.badgeColor}45`,
                }}
              >
                {user.avatar}
              </div>
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name">{user.displayName}</span>
                <span className="sidebar-user-title">{user.role.title}</span>
              </div>
            </div>

            <div className="sidebar-user-badge-row">
              <span
                className="sidebar-role-pill"
                style={{
                  backgroundColor: `${user.role.badgeColor}15`,
                  color: user.role.badgeColor,
                  borderColor: `${user.role.badgeColor}35`,
                }}
              >
                {user.role.badge}
              </span>
              <span className="sidebar-scope-pill">
                {user.role.id === 'admin'
                  ? 'All 6 Modules Active'
                  : `${accessibleTabs.length} Authorized Modules`}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Section — ONLY Accessible Pages for this Role */}
        <div className="sidebar-nav-section">
          <div className="sidebar-section-title">
            <span>ACCESSIBLE MODULES</span>
            <span className="sidebar-count-chip">{accessibleTabs.length}</span>
          </div>

          <nav className="sidebar-nav-list">
            {accessibleTabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleTabClick(tab.id)}
                >
                  <span className="sidebar-nav-icon">{getTabIcon(tab.id)}</span>
                  <span className="sidebar-nav-label">{tab.label}</span>
                  {isActive && <span className="sidebar-active-indicator" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Spacer */}
        <div className="sidebar-spacer" />

        {/* Sidebar Footer Actions: API Docs & Switch Role */}
        <div className="sidebar-footer">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-action-btn"
            title="Open FastAPI documentation in new tab"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>API Docs</span>
            <span className="sidebar-external-arrow">↗</span>
          </a>

          <button
            className="sidebar-action-btn switch-role"
            onClick={handleSwitchRole}
            title="Sign in with a different position or role"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <polyline points="17 11 19 13 23 9" />
            </svg>
            <span>Switch Role</span>
          </button>
        </div>
      </aside>
    </div>
  );
};

