import React, { useEffect, useState } from 'react';
import './LoadingBox.css';

interface LoadingBoxProps {
  isLoading: boolean;
  message?: string;
  onFinish?: () => void;
  freeze?: boolean;
}

export const LoadingBox: React.FC<LoadingBoxProps> = ({
  isLoading,
  message = 'Loading Financial Telemetry...',
  onFinish,
  freeze = false,
}) => {
  const [visible, setVisible] = useState(isLoading);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setAnimKey((k) => k + 1);
      if (freeze) return; // Keep visible for inspection
      const timer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, 1000); // Exact 1s animation duration
      return () => clearTimeout(timer);
    } else {
      const exitTimer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(exitTimer);
    }
  }, [isLoading, onFinish, freeze]);

  if (!visible && !isLoading) return null;

  return (
    <div className={`loading-overlay ${isLoading ? 'fade-in' : 'fade-out'}`} role="status" aria-live="polite">
      <div className="loading-card" key={animKey}>
        {/* Header with LedgerFlow emblem icon */}
        <div className="loading-card-header">
          <img
            src="/assets/logo/emblem_icon.png"
            alt="LedgerFlow"
            className="loading-emblem"
          />
          <div className="loading-brand">
            <span className="loading-brand-name">LedgerFlow</span>
            <span className="loading-brand-sub">Financial Observability</span>
          </div>
        </div>

        {/* Center 1s Traversing & Rising Line Chart Animation */}
        <div className="loading-chart-container">
          <svg
            className="loading-chart-svg"
            viewBox="0 0 240 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Primary line gradient matching logo: Cyan -> Electric Blue -> Indigo */}
              <linearGradient id="logoLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>

              {/* Area gradient under curve */}
              <linearGradient id="logoAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>

              {/* Glow filter for line and tip */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Subtle background grid lines */}
            <line x1="15" y1="25" x2="225" y2="25" className="loading-grid-line" />
            <line x1="15" y1="50" x2="225" y2="50" className="loading-grid-line" />
            <line x1="15" y1="75" x2="225" y2="75" className="loading-grid-line" />

            {/* Rising Line Area Fill */}
            <path
              className="loading-chart-area"
              d="M 15 82 C 45 78, 65 62, 95 64 C 125 66, 145 44, 175 36 C 195 30, 210 20, 225 15 L 225 82 Z"
              fill="url(#logoAreaGrad)"
            />

            {/* Traversing Forward and Rising Line Path */}
            <path
              className="loading-chart-line"
              d="M 15 82 C 45 78, 65 62, 95 64 C 125 66, 145 44, 175 36 C 195 30, 210 20, 225 15"
              stroke="url(#logoLineGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonGlow)"
            />

            {/* Dynamic rising data nodes */}
            <circle cx="15" cy="82" r="3" className="loading-node node-1" fill="#38bdf8" />
            <circle cx="95" cy="64" r="3" className="loading-node node-2" fill="#38bdf8" />
            <circle cx="175" cy="36" r="3" className="loading-node node-3" fill="#3b82f6" />

            {/* Pulsing beacon at the peak tip (rising right endpoint) */}
            <g className="loading-beacon-group">
              <circle cx="225" cy="15" r="7" className="loading-beacon-ring" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="225" cy="15" r="4" className="loading-beacon-center" fill="#ffffff" />
            </g>
          </svg>
        </div>

        {/* Message & Status */}
        <div className="loading-status">
          <span className="loading-text">{message}</span>
          <div className="loading-dots">
            <span className="dot dot-1"></span>
            <span className="dot dot-2"></span>
            <span className="dot dot-3"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

