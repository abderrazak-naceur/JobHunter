import { useState } from 'react';
import { ExternalLink, LogOut, Palette, Target, type LucideIcon } from 'lucide-react';
import { Toaster } from 'sonner';
import PortfolioAdmin from './admin/portfolio/PortfolioAdmin';
import CompanyRadar from './CompanyRadar';
import { signOut } from './auth/session';
import './styles.css';

type Tab = 'portfolio' | 'companies';

const nav: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'portfolio', label: 'Portfolio', icon: Palette },
  { id: 'companies', label: 'Company Radar', icon: Target }
];

/** Private area: everything that can be created, edited and deleted lives here. */
export default function App() {
  const [tab, setTab] = useState<Tab>('portfolio');
  const current = nav.find(item => item.id === tab)!;

  return (
    <div className="app-shell">
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
              <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}>
                <Icon size={18} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item" href="/" target="_blank" rel="noreferrer"><ExternalLink size={18} /><span>Vedi il sito</span></a>
          <button className="nav-item" onClick={signOut}><LogOut size={18} /><span>Esci</span></button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">Gestione <span>/</span> {current.label}</div>
          <div className="avatar small" aria-hidden="true">AN</div>
        </header>
        <section className="content">
          {tab === 'portfolio' && <PortfolioAdmin />}
          {tab === 'companies' && <CompanyRadar />}
        </section>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
