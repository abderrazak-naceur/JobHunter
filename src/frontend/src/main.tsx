import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import PortfolioPage from './portfolio/PortfolioPage';
import { resolveView } from './routing';

// The admin area (and its heavy styles/Preline bundle) is only downloaded on /admin.
const AdminApp = lazy(() => import('./App'));

const view = resolveView(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {view === 'admin'
      ? <Suspense fallback={<p role="status" style={{ padding: '2rem' }}>Caricamento...</p>}><AdminApp /></Suspense>
      : <PortfolioPage />}
  </React.StrictMode>
);
