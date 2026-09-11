import React from 'react';
import ReactDOM from 'react-dom/client';
// Registers every Chart.js controller/plugin (doughnut, arc, tooltip, legend…).
// The classic dashboard shipped the UMD bundle, which auto-registered all of
// these; importing the chart dir keeps the same behavior in the bundled build.
import 'chart.js/auto';
import App from './App';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);