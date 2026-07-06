import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { logger, errorLogger } from './utils/logger';

logger.info('Application starting', { file: 'src/main.tsx', function: 'startup' });

window.addEventListener('error', (event) => {
  errorLogger.error('Uncaught error', {
    file: 'src/main.tsx',
    function: 'window.onerror',
    message: event.message,
    stack: event.error?.stack,
    url: window.location.href,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorLogger.error('Unhandled promise rejection', {
    file: 'src/main.tsx',
    function: 'window.onunhandledrejection',
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
    url: window.location.href,
  });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
