import React from 'react';
import { useTheme } from '../lib/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={`Toggle day or night theme. Currently ${isDark ? 'Night (Dark)' : 'Day (Light)'}`}
      title={isDark ? 'Switch to Day mode (pure white)' : 'Switch to Night mode (pitch black)'}
    >
      <span className="theme-toggle-track">
        {/* Sun Icon (Day) */}
        <span className={`theme-toggle-icon sun-icon ${!isDark ? 'active' : ''}`} aria-hidden="true">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.15" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        </span>

        {/* Sliding Thumb */}
        <span className={`theme-toggle-thumb ${isDark ? 'dark' : 'light'}`} />

        {/* Moon Icon (Night) */}
        <span className={`theme-toggle-icon moon-icon ${isDark ? 'active' : ''}`} aria-hidden="true">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </span>
      </span>

      <span className="theme-toggle-label">
        {isDark ? 'Night' : 'Day'}
      </span>
    </button>
  );
};

export default ThemeToggle;

