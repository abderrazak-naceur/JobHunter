import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import LoadingScreen from './components/LoadingScreen';
import { resolveView } from './routing';

// The private area is a separate chunk: visitors of the public page never download it.
const AdminRoot = lazy(() => import('./AdminRoot'));
const PortfolioRoute = lazy(() => import('./portfolio/PortfolioRoute'));
const BlogPages = lazy(() => import('./portfolio/BlogPage'));

const view = resolveView(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {view === 'admin'
      ? <Suspense fallback={<LoadingScreen variant="admin" />}><AdminRoot /></Suspense>
       : view === 'blog'
        ? <Suspense fallback={<LoadingScreen variant="portfolio" />}><BlogPages /></Suspense>
        : view === 'blog-post'
          ? <Suspense fallback={<LoadingScreen variant="portfolio" />}><BlogPages /></Suspense>
          : <Suspense fallback={<LoadingScreen variant="portfolio" />}><PortfolioRoute /></Suspense>}
  </React.StrictMode>
);
