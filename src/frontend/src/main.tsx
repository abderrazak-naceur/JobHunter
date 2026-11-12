import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import PortfolioPage from './portfolio/PortfolioPage';
import { resolveView } from './routing';

// The private area is a separate chunk: visitors of the public page never download it.
const AdminRoot = lazy(() => import('./AdminRoot'));

const view = resolveView(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {view === 'admin'
      ? <Suspense fallback={<p role="status" style={{ padding: '2rem' }}>Caricamento...</p>}><AdminRoot /></Suspense>
      : <PortfolioPage />}
  </React.StrictMode>
);
