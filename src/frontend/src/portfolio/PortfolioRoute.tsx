import { useEffect, useState } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import { fetchPortfolio } from '../services/portfolioApi';
import { portfolio as fallbackContent, type PortfolioContent } from './content';
import PortfolioPage from './PortfolioPage';

/**
 * Loads the published content from the API. While waiting (a sleeping server can take a while to wake up)
 * it shows a neutral skeleton matching the public page; if the API fails, the bundled
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
    return <LoadingScreen variant="portfolio" />;
  }
  return <PortfolioPage content={content} />;
}
