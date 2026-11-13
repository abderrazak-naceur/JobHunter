type LoadingVariant = 'portfolio' | 'admin';

type LoadingScreenProps = {
  variant?: LoadingVariant;
};

const skeletonRows = [0, 1, 2, 3];

/**
 * Lightweight, accessible loading placeholder shared by the public portfolio
 * and the private dashboard. It deliberately uses CSS only: no images,
 * external requests or extra dependencies are needed before lazy chunks load.
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
          --jh-surface: #ffffff;
          --jh-muted: #eef2f7;
          --jh-border: #e8edf4;
          --jh-blue: #2563eb;
          min-height: 100svh;
          padding: clamp(16px, 3vw, 40px);
          background: #f8fafc;
          color: #172033;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow: hidden;
        }
        .jh-loading__shimmer {
          display: block;
          border-radius: 999px;
          background: linear-gradient(100deg, #edf1f6 20%, #f8fafc 38%, #e8edf4 56%);
          background-size: 240% 100%;
          animation: jh-loading-shimmer 1.7s ease-in-out infinite;
        }
        @keyframes jh-loading-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        .jh-loading__surface { width: min(100%, 1320px); margin: 0 auto; }
        .jh-loading__public-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 24px; min-height: 64px; margin-bottom: clamp(24px, 4vw, 48px);
        }
        .jh-loading__brand { display: flex; align-items: center; gap: 12px; }
        .jh-loading__brand-mark {
          width: 40px; height: 40px; border-radius: 13px;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          border: 1px solid #dbeafe;
        }
        .jh-loading__brand-name { width: 112px; height: 12px; }
        .jh-loading__nav { display: flex; align-items: center; gap: 12px; }
        .jh-loading__nav-item { width: 70px; height: 10px; }
        .jh-loading__hero {
          display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr);
          align-items: center; gap: clamp(24px, 5vw, 72px);
          min-height: 410px; padding: clamp(24px, 5vw, 68px);
          border: 1px solid #e3eaf4; border-radius: 30px;
          background: linear-gradient(120deg, #eff6ff 0%, #ffffff 58%, #f8fbff 100%);
          box-shadow: 0 18px 55px rgba(15, 23, 42, .045);
        }
        .jh-loading__copy { min-width: 0; }
        .jh-loading__eyebrow { width: 112px; height: 10px; margin-bottom: 24px; }
        .jh-loading__headline { width: min(100%, 430px); height: clamp(28px, 4.4vw, 54px); margin-bottom: 13px; border-radius: 12px; }
        .jh-loading__headline--short { width: min(76%, 330px); margin-bottom: 24px; }
        .jh-loading__body { width: min(100%, 490px); height: 11px; margin-bottom: 11px; }
        .jh-loading__body--short { width: min(76%, 350px); }
        .jh-loading__chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
        .jh-loading__chip { width: 112px; height: 31px; border-radius: 999px; }
        .jh-loading__actions { display: flex; gap: 12px; margin-top: 30px; }
        .jh-loading__action { width: 132px; height: 43px; border-radius: 8px; }
        .jh-loading__action--secondary { width: 148px; background: #f1f5f9; }
        .jh-loading__visual { display: flex; justify-content: center; align-items: center; min-width: 0; }
        .jh-loading__portrait {
          width: min(100%, 310px); aspect-ratio: 1; border-radius: 34px;
          border: 9px solid #ffffff; background: linear-gradient(135deg, #e8eef8, #f7f9fc);
          box-shadow: 0 24px 55px rgba(37, 99, 235, .12);
        }
        .jh-loading__cards {
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px; margin-top: 22px;
        }
        .jh-loading__card {
          min-height: 112px; padding: 22px; border: 1px solid var(--jh-border);
          border-radius: 20px; background: #ffffff;
          box-shadow: 0 8px 24px rgba(15, 23, 42, .025);
        }
        .jh-loading__card-title { width: 42%; height: 12px; margin-bottom: 18px; }
        .jh-loading__card-line { width: 78%; height: 9px; margin-bottom: 9px; }
        .jh-loading__card-line--short { width: 56%; }

        .jh-loading__admin-shell {
          display: grid; grid-template-columns: 232px minmax(0, 1fr);
          width: min(100%, 1440px); min-height: calc(100svh - clamp(32px, 6vw, 80px));
          margin: 0 auto; overflow: hidden;
          border: 1px solid #e8edf4; border-radius: 24px; background: #ffffff;
          box-shadow: 0 24px 70px rgba(15, 23, 42, .045);
        }
        .jh-loading__sidebar { padding: 28px 18px; border-right: 1px solid #edf1f6; }
        .jh-loading__admin-brand { display: flex; align-items: center; gap: 11px; margin-bottom: 48px; }
        .jh-loading__admin-mark { width: 36px; height: 36px; border-radius: 11px; background: #dbeafe; }
        .jh-loading__admin-brand-name { width: 94px; height: 11px; }
        .jh-loading__admin-nav { display: grid; gap: 13px; }
        .jh-loading__admin-nav-item { height: 36px; border-radius: 9px; background: #f8fafc; }
        .jh-loading__admin-main { min-width: 0; }
        .jh-loading__admin-topbar {
          display: flex; align-items: center; justify-content: space-between;
          height: 68px; padding: 0 clamp(20px, 4vw, 48px); border-bottom: 1px solid #edf1f6;
        }
        .jh-loading__breadcrumb { width: 150px; height: 10px; }
        .jh-loading__admin-avatar { width: 32px; height: 32px; border-radius: 50%; background: #dbeafe; }
        .jh-loading__admin-content { max-width: 1160px; margin: 0 auto; padding: clamp(22px, 4vw, 42px); }
        .jh-loading__welcome-title { width: min(48%, 250px); height: 25px; margin-bottom: 12px; border-radius: 8px; }
        .jh-loading__welcome-subtitle { width: min(65%, 350px); height: 10px; margin-bottom: 27px; }
        .jh-loading__admin-hero {
          display: flex; align-items: center; justify-content: space-between; gap: 20px;
          min-height: 130px; padding: 24px; border: 1px solid #dbeafe; border-radius: 16px;
          background: linear-gradient(110deg, #eff6ff, #ffffff 72%);
        }
        .jh-loading__admin-hero-copy { flex: 1; }
        .jh-loading__admin-hero-line { width: min(52%, 230px); height: 12px; margin-bottom: 13px; }
        .jh-loading__admin-hero-line--long { width: min(78%, 340px); height: 10px; }
        .jh-loading__admin-hero-score { width: 58px; height: 58px; border-radius: 50%; border: 5px solid #dbeafe; }
        .jh-loading__stats {
          display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px; margin-top: 18px;
        }
        .jh-loading__stat { min-height: 108px; padding: 16px; border: 1px solid #e8edf4; border-radius: 13px; background: #fff; }
        .jh-loading__stat-icon { width: 31px; height: 31px; margin-bottom: 14px; border-radius: 9px; background: #eff6ff; }
        .jh-loading__stat-line { width: 72%; height: 9px; margin-bottom: 9px; }
        .jh-loading__admin-panels {
          display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px; margin-top: 14px;
        }
        .jh-loading__panel { min-height: 150px; padding: 20px; border: 1px solid #e8edf4; border-radius: 13px; background: #fff; }
        .jh-loading__panel-title { width: 48%; height: 12px; margin-bottom: 22px; }
        .jh-loading__panel-line { width: 85%; height: 9px; margin-bottom: 12px; }
        .jh-loading__panel-line--short { width: 64%; }

        @media (max-width: 760px) {
          .jh-loading__hero { grid-template-columns: minmax(0, 1fr); }
          .jh-loading__visual { display: none; }
          .jh-loading__cards { grid-template-columns: minmax(0, 1fr); }
          .jh-loading__cards .jh-loading__card:nth-child(n+3) { display: none; }
          .jh-loading__admin-shell { grid-template-columns: 68px minmax(0, 1fr); }
          .jh-loading__sidebar { padding: 22px 12px; }
          .jh-loading__admin-brand { justify-content: center; }
          .jh-loading__admin-brand-name, .jh-loading__admin-nav-item span { display: none; }
          .jh-loading__admin-nav-item { height: 34px; }
          .jh-loading__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .jh-loading__admin-panels { grid-template-columns: minmax(0, 1fr); }
        }
        @media (max-width: 480px) {
          .jh-loading__nav { display: none; }
          .jh-loading__hero { padding: 24px; min-height: 0; }
          .jh-loading__admin-content { padding: 18px 14px; }
          .jh-loading__admin-hero { min-height: 104px; padding: 16px; }
          .jh-loading__admin-hero-score { width: 44px; height: 44px; }
          .jh-loading__stats { gap: 8px; }
          .jh-loading__stat { min-height: 96px; padding: 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .jh-loading__shimmer { animation: none; background: #eef2f7; }
        }
      `}</style>

      {isAdmin ? (
        <div className="jh-loading__admin-shell" aria-hidden="true">
          <aside className="jh-loading__sidebar">
            <div className="jh-loading__admin-brand">
              <span className="jh-loading__admin-mark" />
              <span className="jh-loading__shimmer jh-loading__admin-brand-name" />
            </div>
            <div className="jh-loading__admin-nav">
              {skeletonRows.concat([4, 5]).map(row => (
                <span className="jh-loading__shimmer jh-loading__admin-nav-item" key={row} />
              ))}
            </div>
          </aside>
          <main className="jh-loading__admin-main">
            <header className="jh-loading__admin-topbar">
              <span className="jh-loading__shimmer jh-loading__breadcrumb" />
              <span className="jh-loading__admin-avatar" />
            </header>
            <section className="jh-loading__admin-content">
              <span className="jh-loading__shimmer jh-loading__welcome-title" />
              <span className="jh-loading__shimmer jh-loading__welcome-subtitle" />
              <div className="jh-loading__admin-hero">
                <div className="jh-loading__admin-hero-copy">
                  <span className="jh-loading__shimmer jh-loading__admin-hero-line" />
                  <span className="jh-loading__shimmer jh-loading__admin-hero-line jh-loading__admin-hero-line--long" />
                </div>
                <span className="jh-loading__admin-hero-score" />
              </div>
              <div className="jh-loading__stats">
                {skeletonRows.map(row => (
                  <div className="jh-loading__stat" key={row}>
                    <span className="jh-loading__shimmer jh-loading__stat-icon" />
                    <span className="jh-loading__shimmer jh-loading__stat-line" />
                    <span className="jh-loading__shimmer jh-loading__stat-line" />
                  </div>
                ))}
              </div>
              <div className="jh-loading__admin-panels">
                {[0, 1].map(row => (
                  <div className="jh-loading__panel" key={row}>
                    <span className="jh-loading__shimmer jh-loading__panel-title" />
                    <span className="jh-loading__shimmer jh-loading__panel-line" />
                    <span className="jh-loading__shimmer jh-loading__panel-line jh-loading__panel-line--short" />
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      ) : (
        <main className="jh-loading__surface" aria-hidden="true">
          <header className="jh-loading__public-header">
            <div className="jh-loading__brand">
              <span className="jh-loading__brand-mark" />
              <span className="jh-loading__shimmer jh-loading__brand-name" />
            </div>
            <div className="jh-loading__nav">
              {skeletonRows.slice(0, 3).map(row => (
                <span className="jh-loading__shimmer jh-loading__nav-item" key={row} />
              ))}
            </div>
          </header>
          <section className="jh-loading__hero">
            <div className="jh-loading__copy">
              <span className="jh-loading__shimmer jh-loading__eyebrow" />
              <span className="jh-loading__shimmer jh-loading__headline" />
              <span className="jh-loading__shimmer jh-loading__headline jh-loading__headline--short" />
              <span className="jh-loading__shimmer jh-loading__body" />
              <span className="jh-loading__shimmer jh-loading__body jh-loading__body--short" />
              <div className="jh-loading__chips">
                {[0, 1].map(row => <span className="jh-loading__shimmer jh-loading__chip" key={row} />)}
              </div>
              <div className="jh-loading__actions">
                <span className="jh-loading__shimmer jh-loading__action" />
                <span className="jh-loading__shimmer jh-loading__action jh-loading__action--secondary" />
              </div>
            </div>
            <div className="jh-loading__visual">
              <div className="jh-loading__portrait" />
            </div>
          </section>
          <section className="jh-loading__cards">
            {skeletonRows.slice(0, 3).map(row => (
              <div className="jh-loading__card" key={row}>
                <span className="jh-loading__shimmer jh-loading__card-title" />
                <span className="jh-loading__shimmer jh-loading__card-line" />
                <span className="jh-loading__shimmer jh-loading__card-line jh-loading__card-line--short" />
              </div>
            ))}
          </section>
        </main>
      )}
    </div>
  );
}
