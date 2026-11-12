import { lazy, Suspense } from 'react';
import AdminGate from './auth/AdminGate';

// The dashboard (and its large stylesheet and Preline bundle) is downloaded only after signing in.
const App = lazy(() => import('./App'));

export default function AdminRoot() {
  return (
    <AdminGate>
      <Suspense fallback={<p role="status" style={{ padding: '2rem' }}>Caricamento...</p>}>
        <App />
      </Suspense>
    </AdminGate>
  );
}
