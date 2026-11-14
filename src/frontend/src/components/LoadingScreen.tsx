type LoadingVariant = 'portfolio' | 'admin';

type LoadingScreenProps = {
  variant?: LoadingVariant;
};

/**
 * Branded loading screen shared by the public portfolio and admin area.
 * The ZAK mark is rendered as inline SVG, so it is available immediately
 * without waiting for the portfolio API or a remote image.
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
          place-items: center;
          padding: 28px 20px;
          overflow: hidden;
          color: #142033;
          background:
            radial-gradient(ellipse at 50% 43%, rgba(235, 241, 249, .52), transparent 43%),
            #ffffff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .jh-loader {
          display: flex;
          width: min(100%, 540px);
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .jh-loader__symbol {
          display: block;
          width: 196px;
          height: 196px;
          margin: 0 0 27px;
          overflow: visible;
        }
        .jh-loader__track {
          fill: none;
          stroke: #e7edf3;
          stroke-width: 8;
        }
        .jh-loader__orbit {
          transform-origin: 100px 100px;
          animation: jh-loader-spin 1.65s linear infinite;
          will-change: transform;
        }
        .jh-loader__orbit-arc {
          fill: none;
          stroke: url(#jh-loader-blue);
          stroke-width: 8;
          stroke-linecap: round;
          stroke-dasharray: 145 540;
        }
        .jh-loader__orbit-dot {
          fill: #ffffff;
          stroke: #dbeafe;
          stroke-width: 1.5;
        }
        .jh-loader__swoosh {
          fill: none;
          stroke: url(#jh-loader-swoosh);
          stroke-width: 5.5;
          stroke-linecap: round;
        }
        .jh-loader__wordmark {
          fill: #142033;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          font-size: 43px;
          font-weight: 850;
          letter-spacing: -3.2px;
        }
        .jh-loader__title {
          margin: 0;
          color: #142033;
          font-size: clamp(21px, 2.8vw, 28px);
          font-weight: 700;
          letter-spacing: -.035em;
          line-height: 1.25;
        }
        .jh-loader__subtitle {
          margin: 10px 0 0;
          color: #7d8999;
          font-size: 16px;
          font-weight: 450;
          line-height: 1.55;
        }
        .jh-loader__dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          margin-top: 27px;
        }
        .jh-loader__dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #d5dde7;
          animation: jh-loader-pulse 1.1s ease-in-out infinite;
        }
        .jh-loader__dots span:nth-child(2) {
          background: #1677f8;
          animation-delay: .16s;
        }
        .jh-loader__dots span:nth-child(3) {
          animation-delay: .32s;
        }
        @keyframes jh-loader-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes jh-loader-pulse {
          0%, 60%, 100% { opacity: .48; transform: scale(.82); }
          30% { opacity: 1; transform: scale(1.08); }
        }
        @media (max-width: 480px) {
          .jh-loader__symbol {
            width: 168px;
            height: 168px;
            margin-bottom: 24px;
          }
          .jh-loader__subtitle {
            max-width: 290px;
            font-size: 14px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .jh-loader__orbit,
          .jh-loader__dots span {
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

        <p className="jh-loader__title">Preparazione in corso…</p>
        <p className="jh-loader__subtitle">
          {isAdmin ? 'Sto preparando la tua area riservata' : 'Sto caricando il tuo portfolio'}
        </p>
        <div className="jh-loader__dots" data-testid="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
