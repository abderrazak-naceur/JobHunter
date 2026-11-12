import { useEffect, useState } from 'react';
import { fetchPortfolio } from '../services/portfolioApi';
import { portfolio as fallbackContent, type PortfolioContent } from './content';
import PortfolioPage from './PortfolioPage';

/**
 * Loads the published content from the API. While waiting (a sleeping server can take a while to wake up)
 * it shows a neutral message rather than someone else's placeholder data; if the API fails, the bundled
 * fallback is shown so the page is never blank.
 */
export default function PortfolioRoute() {
  const [content, setContent] = useState<PortfolioContent | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPortfolio(controller.signal)
      .then(setContent)
      .catch(error => {
        if (controller.signal.aborted) return;
        console.error('Portfolio content unavailable, using fallback:', error);
        setContent(fallbackContent);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (content) document.title = `${content.name} — ${content.role}`;
  }, [content]);

  if (!content) {
    return <p role="status" style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>Caricamento...</p>;
  }
  return <PortfolioPage content={content} />;
}
