import { useEffect, useRef, useState } from 'react';
import { BriefcaseBusiness, ExternalLink, KeyRound, LayoutDashboard, LogOut, Palette, Target, Users, type LucideIcon } from 'lucide-react';
import { Toaster } from 'sonner';
import AccountPage from './admin/account/AccountPage';
import DataExport from './admin/account/DataExport';
import ApplicationsPage from './admin/applications/ApplicationsPage';
import Dashboard, { type AdminTab } from './admin/Dashboard';
import PortfolioAdmin from './admin/portfolio/PortfolioAdmin';
import ContactsPage from './admin/contacts/ContactsPage';
import CompanyRadar from './CompanyRadar';
import { signOut } from './auth/session';
import './styles.css';

const nav: { id: AdminTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Panoramica', icon: LayoutDashboard },
  { id: 'applications', label: 'Candidature', icon: BriefcaseBusiness },
  { id: 'portfolio', label: 'Portfolio', icon: Palette },
  { id: 'contacts', label: 'Contatti', icon: Users },
  { id: 'companies', label: 'Company Radar', icon: Target },
  { id: 'account', label: 'Sicurezza', icon: KeyRound }
];

/** Private area: everything that can be created, edited and deleted lives here. */
export default function App() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const current = nav.find(item => item.id === tab)!;
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    document.title = `${current.label} · Portfolio - area privata`;
    // After choosing an area, keyboard and screen reader users land on its content, not back on the menu.
    if (firstRender.current) firstRender.current = false;
    else mainRef.current?.focus();
  }, [current.label]);
  return (
    <div className="app-shell">
      <a href="#contenuto" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-900">
        Vai al contenuto
      </a>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div><strong>Portfolio</strong><small>AREA PRIVATA</small></div>
        </div>
        <div className="workspace-label">GESTIONE</div>
        <nav aria-label="Aree di gestione">
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`} aria-label={item.label} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>
                <Icon size={18} aria-hidden="true" /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item" href="/" target="_blank" rel="noreferrer" aria-label="Vedi il sito (si apre in una nuova scheda)"><ExternalLink size={18} aria-hidden="true" /><span>Vedi il sito</span></a>
          <button className="nav-item" aria-label="Esci" onClick={signOut}><LogOut size={18} aria-hidden="true" /><span>Esci</span></button>
        </div>
      </aside>

      <main className="main" id="contenuto" ref={mainRef} tabIndex={-1} aria-label={current.label}>
        <header className="topbar">
          <div className="crumb">Gestione <span>/</span> {current.label}</div>
          <div className="avatar small" aria-hidden="true">AN</div>
        </header>
        <section className="content">
          {tab === 'overview' && <Dashboard onNavigate={setTab} />}
          {tab === 'applications' && <ApplicationsPage />}
          {tab === 'portfolio' && <PortfolioAdmin />}
          {tab === 'contacts' && <ContactsPage />}
          {tab === 'companies' && <CompanyRadar />}
          {tab === 'account' && (
            <div className="space-y-6">
              <AccountPage />
              <DataExport />
            </div>
          )}
        </section>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
