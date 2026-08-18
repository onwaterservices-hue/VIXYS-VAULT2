import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const isWebSocketError = (err: any) => {
    if (!err) return false;
    // Handle raw Event objects from WebSockets (like isTrusted: true error events)
    if (err instanceof Event && (err.target instanceof WebSocket || String(err.target?.constructor?.name).toLowerCase().includes('websocket'))) {
      return true;
    }
    const str = String(
      err?.message ||
      err?.reason ||
      err?.stack ||
      err?.type ||
      err?.description ||
      err || ''
    ).toLowerCase();
    return (
      str.includes('websocket') ||
      str.includes('vite') ||
      str.includes('closed without opened') ||
      str.includes('hmr') ||
      str.includes('failed to connect') ||
      str.includes('ws')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isWebSocketError(event.reason) || isWebSocketError(event.promise) || isWebSocketError(event)) {
      event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isWebSocketError(event.error) || isWebSocketError(event.message) || isWebSocketError(event)) {
      event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

