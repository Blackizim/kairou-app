import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fortawesome/fontawesome-free/css/all.min.css';
import App from './App.jsx';
import './index.css';
import { Analytics } from '@vercel/analytics/react';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') && <Analytics />}
  </React.StrictMode>,
);
