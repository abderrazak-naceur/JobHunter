import { useEffect, useState } from 'react';
import { resolveAssetUrl } from '../services/apiConfig';
import { fetchPortfolio } from '../services/portfolioApi';

type LoadingVariant = 'portfolio' | 'admin';

type LoadingScreenProps = {
  variant?: LoadingVariant;
};

/**
 * A compact, animated loading pictogram shared by the public portfolio and
 * admin area. The owner's published photo sits in the middle of the spinner.
 */
export default function LoadingScreen({ variant = 'portfolio' }: LoadingScreenProps) {
  const isAdmin = variant === 'admin';
  const label = isAdmin ? 'Preparazione dell’area amministrativa' : 'Preparazione del portfolio';
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    let active = true;

    fetchPortfolio()
      .then(content => {
        if (active) setPhotoUrl(content.photoUrl ?? null);
      })
      .catch(() => {
        // The animated icon remains usable when the API or profile photo is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const showPhoto = Boolean(photoUrl) && !photoFailed;

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
            radial-gradient(ellipse at 50% 44%, rgba(226, 232, 240, .58), transparent 43%),
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
          width: 92px;
          height: 92px;
          place-items: center;
          margin-bottom: 25px;
        }
        .jh-loader__spinner {
          position: absolute;
          inset: 0;
          animation: jh-loader-spin 1.05s steps(12, end) infinite;
          will-change: transform;
        }
        .jh-loader__spinner span {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 11px;
          border-radius: 999px;
          background: #9ca3af;
        }
        .jh-loader__avatar {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          overflow: hidden;
          border: 2px solid #ffffff;
          border-radius: 50%;
          background: #f3f4f6;
          box-shadow: 0 3px 14px rgba(15, 23, 42, .12);
        }
        .jh-loader__avatar img {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          object-fit: cover;
        }
        .jh-loader__avatar-fallback {
          width: 27px;
          height: 27px;
          color: #9ca3af;
        }
        .jh-loader__title {
          margin: 0;
          color: #202938;
          font-size: 15px;
          font-weight: 650;
          letter-spacing: -.02em;
        }
        .jh-loader__subtitle {
          margin: 8px 0 0;
          color: #8b95a5;
          font-size: 12px;
          font-weight: 450;
          line-height: 1.6;
        }
        @keyframes jh-loader-spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .jh-loader__spinner { animation: none; }
        }
      `}</style>

      <div className="jh-loader" aria-hidden="true">
        <div className="jh-loader__symbol">
          <div className="jh-loader__spinner" data-testid="loading-spinner">
            {Array.from({ length: 12 }, (_, index) => (
              <span
                key={index}
                style={{
                  transform: `translate(-50%, -50%) rotate(${index * 30}deg) translateY(-36px)`,
                  opacity: 1 - index * 0.055,
                  backgroundColor: index < 2 ? '#6b7280' : '#aeb6c2'
                }}
              />
            ))}
          </div>
          <span className="jh-loader__avatar">
            {showPhoto ? (
              <img
                src={resolveAssetUrl(photoUrl!)}
                alt=""
                data-testid="loading-profile-photo"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <svg className="jh-loader__avatar-fallback" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
                <path d="M4 20c.8-3.7 3.8-5.7 8-5.7s7.2 2 8 5.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            )}
          </span>
        </div>
        <p className="jh-loader__title">Un momento</p>
        <p className="jh-loader__subtitle">
          {isAdmin ? 'Sto aprendo la tua area riservata…' : 'Sto preparando il tuo portfolio…'}
        </p>
      </div>
    </div>
  );
}
