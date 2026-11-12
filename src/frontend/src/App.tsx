import { useEffect, useState } from 'react';
import CompanyRadar from './CompanyRadar';
import './styles.css';
import { signOut } from './auth/session';
import { LogOut, BriefcaseBusiness, ChartNoAxesCombined, ChevronDown, CircleUserRound, FileText, GraduationCap, LayoutDashboard, Plus, Settings, Sparkles, Target, CalendarDays, ExternalLink } from 'lucide-react';
type Tab = 'overview' | 'portfolio' | 'opportunities' | 'companies' | 'academy' | 'admin';
const nav = [
 {id:'overview' as const,label:'Panoramica',icon:LayoutDashboard},
 {id:'portfolio' as const,label:'Il mio portfolio',icon:CircleUserRound},
 {id:'opportunities' as const,label:'Opportunità',icon:BriefcaseBusiness},
 {id:'companies' as const,label:'Company Radar',icon:Target},
 {id:'academy' as const,label:'Academy',icon:GraduationCap},
 {id:'admin' as const,label:'Amministrazione',icon:Settings}
];
export default function App(){
 const [tab,setTab]=useState<Tab>('portfolio');
 useEffect(() => { let active = true; import('preline/non-auto').then(({ HSStaticMethods }) => { if (active) HSStaticMethods.autoInit(); }).catch(error => console.error('Preline initialization failed:', error)); return () => { active = false; }; }, [tab]);
 return <div className="app-shell"><aside className="sidebar">
  <div className="brand"><div className="brand-mark">P</div><div><strong>Portfolio</strong><small>AREA PRIVATA</small></div></div>
  <div className="workspace-label">WORKSPACE</div>
  <nav>{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav-item ${tab===item.id?'active':''}`} onClick={()=>setTab(item.id)}><Icon size={18}/><span>{item.label}</span>{item.id==='admin'&&<span className="nav-tag">ADMIN</span>}</button>})}</nav>
  <div className="sidebar-bottom"><button className="nav-item" onClick={signOut}><LogOut size={18}/><span>Esci</span></button><div className="profile-mini"><div className="avatar">ZN</div><div><strong>Il mio account</strong><small>Spazio personale</small></div><ChevronDown size={15}/></div></div>
 </aside><main className="main"><header className="topbar"><div className="crumb">Workspace <span>/</span> {nav.find(x=>x.id===tab)?.label}</div><div className="avatar small">ZN</div></header>
 <section className="content">{tab==='companies' ? <CompanyRadar/> : <><div className="welcome-row"><div><div className="eyebrow">IL TUO PROSSIMO CAPITOLO PROFESSIONALE</div><h1>{tab==='portfolio'?'Il mio portfolio':nav.find(x=>x.id===tab)?.label}</h1><p>Gestisci la tua identità professionale e prepara il prossimo passo della tua carriera.</p></div><button className="primary"><Plus size={17}/> Completa il profilo</button></div>
 <div className="profile-hero"><div className="hero-main"><div className="avatar hero-avatar">ZN</div><div><div className="status"><span/> PROFILO IN COSTRUZIONE</div><h2>Senior .NET Developer</h2><p className="hero-sub">C# · ASP.NET Core · React · SQL Server · Cloud</p><div className="hero-meta"><span><Target size={15}/> Milano e dintorni</span><span><BriefcaseBusiness size={15}/> Remote / Hybrid</span></div></div></div><div className="hero-score"><div className="score-ring"><strong>65%</strong></div><span>Profilo completato</span><button className="text-button" onClick={()=>setTab('admin')}>Completa ora <ExternalLink size={13}/></button></div></div>
 <div className="section-heading"><div><h3>Panoramica professionale</h3><p>Le informazioni principali del tuo percorso.</p></div><button className="outline">Modifica profilo</button></div>
 <div className="stats-grid"><div className="stat-card"><div className="stat-icon violet"><BriefcaseBusiness size={19}/></div><span>Esperienza</span><strong>10+ anni</strong><small>Esperienza professionale</small></div><div className="stat-card"><div className="stat-icon blue"><ChartNoAxesCombined size={19}/></div><span>RAL obiettivo</span><strong>€40–50k+</strong><small>Range modificabile</small></div><div className="stat-card"><div className="stat-icon green"><GraduationCap size={19}/></div><span>Competenze</span><strong>12</strong><small>Da valorizzare nel profilo</small></div><div className="stat-card"><div className="stat-icon orange"><CalendarDays size={19}/></div><span>Prossimi passi</span><strong>3 attività</strong><small>Completa il tuo portfolio</small></div></div>
 <div className="two-columns"><div className="panel"><div className="panel-head"><div><h3>Competenze principali</h3><p>Le tecnologie da mettere in evidenza.</p></div><button className="text-button" onClick={()=>setTab('admin')}>Gestisci</button></div><div className="skills">{['C# / .NET','ASP.NET Core','React / TypeScript','SQL Server','PostgreSQL','Docker','Azure','REST API'].map(s=><span key={s}>{s}</span>)}</div></div>
 <div className="panel"><div className="panel-head"><div><h3>Career Coach</h3><p>Il prossimo passo per crescere.</p></div><Sparkles size={19} className="sparkle"/></div><div className="coach-box"><div className="coach-icon"><Sparkles size={18}/></div><div><strong>Costruisci il tuo percorso</strong><p>Carica una Job Description per individuare competenze richieste e argomenti da approfondire.</p><button className="text-button" onClick={()=>setTab('academy')}>Esplora Academy <ExternalLink size={13}/></button></div></div></div></div>
 <div className="section-heading lower"><div><h3>Esperienze professionali</h3><p>Il percorso che racconta il tuo valore.</p></div><button className="outline"><Plus size={15}/> Aggiungi esperienza</button></div><div className="panel experience"><div className="timeline-dot"/><div><strong>Esperienza professionale</strong><p>Inserisci azienda, ruolo, periodo e risultati principali.</p><span className="muted">Sezione pronta per la compilazione</span></div><FileText size={19} className="muted-icon"/></div><footer>Portfolio <span>·</span> Il tuo spazio per la prossima opportunità.</footer>
 </> }</section></main></div>
}