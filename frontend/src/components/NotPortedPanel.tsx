import { TABS } from '../lib/tabs';

interface Props {
  tabId: string;
}

export default function NotPortedPanel({ tabId }: Props) {
  const tab = TABS.find((t) => t.id === tabId);
  return (
    <div className="card animate-in">
      <div className="card-header">
        <div className="card-icon blue">{tab?.icon ?? '📄'}</div>
        <span className="card-title">{tab?.label ?? tabId}</span>
        <span className="card-subtitle">not ported to React yet</span>
      </div>
      <div className="card-body">
        <div className="empty-state">
          <div className="empty-state-icon">🚧</div>
          <div className="empty-state-title">This tab is still on the classic dashboard</div>
          <div className="empty-state-desc">
            The React migration has landed the app shell and the AR Aging tab. This view is a
            placeholder while the remaining tabs are ported — open the classic dashboard to see
            it live now.
          </div>
          <a
            className="tab-btn active"
            href="/legacy"
            style={{ width: 'fit-content' }}
          >
            Open classic dashboard ↗
          </a>
        </div>
      </div>
    </div>
  );
}