type LoadingVariant = 'portfolio' | 'admin';

type LoadingScreenProps = {
  variant?: LoadingVariant;
};

/** Premium circular ZAK loading badge, rendered inline to avoid remote asset dependencies. */
export default function LoadingScreen({ variant = 'portfolio' }: LoadingScreenProps) {
  const isAdmin = variant === 'admin';
  const label = isAdmin ? 'Preparazione dell’area amministrativa' : 'Preparazione del portfolio';

  return (
    <div className="jh-loading" role="status" aria-label={label} aria-busy="true" data-variant={variant}>
      <style>{`
        .jh-loading, .jh-loading * { box-sizing: border-box; }
        .jh-loading {
          display: grid; min-height: 100svh; min-height: 100dvh; place-items: center;
          padding: 24px; overflow: hidden; color: #f8fbff;
          background: radial-gradient(ellipse at 50% 48%, #102c57 0%, #061329 42%, #020817 78%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          animation: jh-fade .5s ease-out both;
        }
        .jh-loader { width: min(100%, 390px); display: flex; flex-direction: column; align-items: center; text-align: center; }
        .jh-loader__badge {
          width: min(82vw, 340px); aspect-ratio: 1; display: grid; place-items: center;
          border-radius: 50%; position: relative; overflow: hidden;
          background: radial-gradient(circle at 32% 18%, #102e64 0%, #07152f 38%, #020817 76%);
          border: 2px solid rgba(0, 145, 255, .95);
          box-shadow: 0 0 12px #078bff, 0 0 38px rgba(0, 112, 255, .45), inset 0 0 34px rgba(0, 100, 255, .18);
          animation: jh-badge-in .7s cubic-bezier(.2,.75,.25,1) both;
        }
        .jh-loader__badge::before, .jh-loader__badge::after {
          content: ""; position: absolute; width: 125%; height: 42%; left: -13%;
          border-radius: 50%; pointer-events: none; filter: blur(1px);
        }
        .jh-loader__badge::before { top: -19%; transform: rotate(-28deg); background: linear-gradient(110deg, transparent 15%, rgba(0,105,255,.68), rgba(0,210,255,.12) 70%, transparent); }
        .jh-loader__badge::after { bottom: -23%; transform: rotate(-28deg); background: linear-gradient(110deg, transparent 15%, rgba(0,92,255,.55), rgba(0,210,255,.1) 70%, transparent); }
        .jh-loader__content { width: 78%; position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
        .jh-loader__wordmark { display: block; width: 100%; height: auto; overflow: visible; filter: drop-shadow(0 4px 12px rgba(0,0,0,.35)); }
        .jh-loader__brand { margin: 7px 0 0; color: #e8f2ff; font-size: clamp(8px, 2.3vw, 11px); font-weight: 600; letter-spacing: .32em; white-space: nowrap; }
        .jh-loader__rule { width: 100%; display: flex; align-items: center; gap: 12px; margin: 0 0 27px; }
        .jh-loader__rule::before, .jh-loader__rule::after { content: ""; height: 1px; flex: 1; background: linear-gradient(90deg, transparent, rgba(206,229,255,.85)); }
        .jh-loader__rule::after { transform: rotate(180deg); }
        .jh-loader__progress { width: 100%; height: 5px; border: 1px solid rgba(135,183,255,.6); border-radius: 99px; overflow: hidden; background: rgba(2,10,27,.7); box-shadow: 0 0 12px rgba(0,124,255,.18); }
        .jh-loader__progress span { display: block; width: 42%; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#0878ff,#12caff); box-shadow: 0 0 12px #00aaff; animation: jh-progress 1.7s ease-in-out infinite; }
        .jh-loader__status { margin: 14px 0 0; color: #dceaff; font-size: clamp(12px, 3.2vw, 16px); font-weight: 400; letter-spacing: .02em; }
        @keyframes jh-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes jh-badge-in { from { opacity: 0; transform: scale(.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes jh-progress { 0% { transform: translateX(-115%); } 55% { transform: translateX(135%); } 100% { transform: translateX(280%); } }
        @media (prefers-reduced-motion: reduce) { .jh-loading, .jh-loader__badge, .jh-loader__progress span { animation: none; } }
      `}</style>

      <div className="jh-loader" aria-hidden="true">
        <div className="jh-loader__badge" data-testid="loading-spinner">
          <div className="jh-loader__content">
            <svg className="jh-loader__wordmark" viewBox="0 0 320 112" role="img" aria-label="Logo ZAK">
              <defs>
                <linearGradient id="jh-zak-silver" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="72%" stopColor="#e8f1ff" />
                  <stop offset="100%" stopColor="#9eb9dc" />
                </linearGradient>
                <linearGradient id="jh-zak-blue" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0878ff" />
                  <stop offset="100%" stopColor="#00d4ff" />
                </linearGradient>
              </defs>
              <g fill="url(#jh-zak-silver)" fontFamily="Arial, sans-serif" fontSize="104" fontWeight="800" letterSpacing="-8">
                <text x="4" y="91">Z</text><text x="102" y="91">A</text><text x="213" y="91">K</text>
              </g>
              <path d="M153 61 L170 31 L187 61 L174 61 L170 54 L166 61 Z" fill="url(#jh-zak-blue)" />
            </svg>
            <p className="jh-loader__brand">DEVELOPER PORTFOLIO</p>
            <div className="jh-loader__rule" />
            <div className="jh-loader__progress" data-testid="loading-dots"><span /></div>
            <p className="jh-loader__status">{isAdmin ? 'Preparazione area riservata…' : 'Caricamento…'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
