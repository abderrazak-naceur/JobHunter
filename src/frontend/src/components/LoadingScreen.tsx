type LoadingVariant = 'portfolio' | 'admin';

type LoadingScreenProps = {
  variant?: LoadingVariant;
};

/**
 * A focused, animated loading indicator shared by the public portfolio and
 * admin area. CSS-only so it appears immediately, even while lazy chunks load.
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
          padding: 24px;
          overflow: hidden;
          color: #172033;
          background:
            radial-gradient(ellipse at 50% 44%, rgba(219, 234, 254, .34), transparent 42%),
            #ffffff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .jh-loader {
          display: flex;
          width: min(100%, 320px);
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .jh-loader__symbol {
          position: relative;
          display: grid;
          width: 82px;
          height: 82px;
          place-items: center;
          margin-bottom: 28px;
        }
        .jh-loader__ring {
          position: absolute;
          inset: 0;
          border: 3px solid #e8eef8;
          border-top-color: #2563eb;
          border-right-color: #7dd3fc;
          border-radius: 50%;
          animation: jh-loader-spin .9s cubic-bezier(.55, .15, .45, .85) infinite;
          will-change: transform;
        }
        .jh-loader__core {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          border: 1px solid #e5edf8;
          border-radius: 19px;
          background: linear-gradient(145deg, #ffffff, #f3f7ff);
          box-shadow: 0 6px 22px rgba(37, 99, 235, .10), inset 0 1px 0 #ffffff;
          color: #1d4ed8;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -.04em;
        }
        .jh-loader__title {
          margin: 0;
          color: #172033;
          font-size: 15px;
          font-weight: 650;
          letter-spacing: -.02em;
        }
        .jh-loader__subtitle {
          margin: 8px 0 0;
          color: #8793a7;
          font-size: 12px;
          font-weight: 450;
          line-height: 1.6;
        }
        .jh-loader__progress {
          position: relative;
          width: 154px;
          height: 3px;
          margin-top: 25px;
          overflow: hidden;
          border-radius: 999px;
          background: #eaf0f8;
        }
        .jh-loader__progress::after {
          position: absolute;
          top: 0;
          bottom: 0;
          left: -38%;
          width: 38%;
          border-radius: inherit;
          background: linear-gradient(90deg, #60a5fa, #2563eb);
          content: "";
          animation: jh-loader-progress 1.45s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes jh-loader-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes jh-loader-progress {
          0% { transform: translateX(0); }
          100% { transform: translateX(365%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .jh-loader__ring, .jh-loader__progress::after {
            animation: none;
          }
          .jh-loader__ring {
            border-top-color: #2563eb;
            transform: rotate(35deg);
          }
          .jh-loader__progress::after {
            left: 0;
            width: 38%;
          }
        }
      `}</style>

      <div className="jh-loader" aria-hidden="true">
        <div className="jh-loader__symbol">
          <span className="jh-loader__ring" data-testid="loading-spinner" />
          <span className="jh-loader__core">ZN</span>
        </div>
        <p className="jh-loader__title">Un momento</p>
        <p className="jh-loader__subtitle">
          {isAdmin ? 'Sto aprendo la tua area riservata…' : 'Sto preparando il tuo portfolio…'}
        </p>
        <span className="jh-loader__progress" data-testid="loading-progress" />
      </div>
    </div>
  );
}
