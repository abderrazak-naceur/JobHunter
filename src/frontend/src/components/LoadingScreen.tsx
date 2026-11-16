type LoadingVariant = 'portfolio' | 'admin';

type LoadingScreenProps = {
  variant?: LoadingVariant;
};

/**
 * Branded, lightweight loading screen shared by the public portfolio and admin area.
 * The mark is inline SVG, so the first paint never depends on an API or remote image.
 */
export default function LoadingScreen({ variant = 'portfolio' }: LoadingScreenProps) {
  const isAdmin = variant === 'admin';
  const label = isAdmin ? 'Preparazione dell’area amministrativa' : 'Preparazione del portfolio';

  return (
    <div
      className="jh-loading"
      role="status"
      aria-label={label}
      aria-busy="true"
      data-variant={variant}
    >
      <style>{`
        .jh-loading, .jh-loading * { box-sizing: border-box; }
        .jh-loading {
          display: grid;
          min-height: 100svh;
          min-height: 100dvh;
          place-items: center;
          padding: 28px 20px;
          overflow: hidden;
          color: #142033;
          background:
            radial-gradient(ellipse at 50% 43%, rgba(219, 234, 254, .42), transparent 43%),
            #fff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          animation: jh-loading-appear .45s ease-out both;
        }
        .jh-loader {
          display: flex;
          width: min(100%, 540px);
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: jh-loader-rise .65s cubic-bezier(.2,.75,.25,1) both;
        }
        .jh-loader__symbol {
          display: block;
          width: 184px;
          height: 184px;
          margin: 0 0 24px;
          overflow: visible;
          filter: drop-shadow(0 12px 24px rgba(37, 99, 235, .08));
        }
        .jh-loader__track {
          fill: none;
          stroke: #e8eef7;
          stroke-width: 7;
        }
        .jh-loader__orbit {
          transform-origin: 100px 100px;
          animation: jh-loader-spin 1.8s cubic-bezier(.5,.05,.5,.95) infinite;
          will-change: transform;
        }
        .jh-loader__orbit-arc {
          fill: none;
          stroke: url(#jh-loader-blue);
          stroke-width: 7;
          stroke-linecap: round;
          stroke-dasharray: 150 540;
        }
        .jh-loader__orbit-dot {
          fill: #fff;
          stroke: #bfdbfe;
          stroke-width: 1.5;
        }
        .jh-loader__swoosh {
          fill: none;
          stroke: url(#jh-loader-swoosh);
          stroke-width: 5;
          stroke-linecap: round;
        }
        .jh-loader__wordmark {
          fill: #142033;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: 43px;
          font-weight: 850;
          letter-spacing: -3.2px;
        }
        .jh-loader__brand {
          margin: 0 0 13px;
          color: #8a96a8;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .24em;
        }
        .jh-loader__title {
          margin: 0;
          color: #142033;
          font-size: clamp(21px, 2.8vw, 27px);
          font-weight: 700;
          letter-spacing: -.04em;
          line-height: 1.25;
        }
        .jh-loader__subtitle {
          margin: 9px 0 0;
          color: #7d8999;
          font-size: 14px;
          font-weight: 450;
          line-height: 1.55;
        }
        .jh-loader__progress {
          width: 116px;
          height: 3px;
          margin-top: 28px;
          overflow: hidden;
          border-radius: 999px;
          background: #eaf0f8;
        }
        .jh-loader__progress span {
          display: block;
          width: 42%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #8cbcff, #1677f8);
          animation: jh-loader-progress 1.55s ease-in-out infinite;
        }
        @keyframes jh-loading-appear {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes jh-loader-rise {
          from { opacity: 0; transform: translateY(10px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes jh-loader-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes jh-loader-progress {
          0% { transform: translateX(-115%); }
          55% { transform: translateX(135%); }
          100% { transform: translateX(280%); }
        }
        @media (max-width: 480px) {
          .jh-loader__symbol {
            width: 164px;
            height: 164px;
            margin-bottom: 21px;
          }
          .jh-loader__subtitle {
            max-width: 290px;
            font-size: 13px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .jh-loading, .jh-loader, .jh-loader__orbit, .jh-loader__progress span {
            animation: none;
          }
        }
      `}</style>

      <div className="jh-loader" aria-hidden="true">
        <svg
          className="jh-loader__symbol"
          data-testid="loading-spinner"
          viewBox="0 0 200 200"
          role="img"
          aria-label="Logo ZAK animato"
        >
          <defs>
            <linearGradient id="jh-loader-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8cbcff" />
              <stop offset="55%" stopColor="#1677f8" />
              <stop offset="100%" stopColor="#0d5ed7" />
            </linearGradient>
            <linearGradient id="jh-loader-swoosh" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1677f8" />
              <stop offset="58%" stopColor="#8b9aab" />
              <stop offset="100%" stopColor="#1677f8" />
            </linearGradient>
          </defs>

          <circle className="jh-loader__track" cx="100" cy="100" r="86" />
          <g className="jh-loader__orbit">
            <circle className="jh-loader__orbit-arc" cx="100" cy="100" r="86" />
            <circle className="jh-loader__orbit-dot" cx="100" cy="14" r="4.2" />
          </g>

          <path
            className="jh-loader__swoosh"
            d="M49 119 C63 145 119 145 151 91 C168 62 148 54 126 65"
          />
          <text className="jh-loader__wordmark" x="100" y="113" textAnchor="middle">
            ZAK
          </text>
        </svg>

        <p className="jh-loader__brand">ZAK NACEUR · PORTFOLIO</p>
        <p className="jh-loader__title">Preparazione in corso…</p>
        <p className="jh-loader__subtitle">
          {isAdmin ? 'Sto preparando la tua area riservata' : 'Sto caricando il tuo portfolio'}
        </p>
        <div className="jh-loader__progress" data-testid="loading-dots">
          <span />
        </div>
      </div>
    </div>
  );
}
