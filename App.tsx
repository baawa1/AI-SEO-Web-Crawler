
import React, { useState, useCallback } from 'react';
import { CrawlerForm } from './components/CrawlerForm';
import { ResultsTable } from './components/ResultsTable';
import { analyzePages, extractLinksFromPage } from './services/geminiService';
import type { CrawledPage, Inlink } from './types';
import { SiteIcon } from './components/icons/SiteIcon';

const App: React.FC = () => {
  const [results, setResults] = useState<CrawledPage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const handleCrawlStart = useCallback(async (startUrl: string, targetPageCount: number, excludedUrls: Set<string>) => {
    setIsLoading(true);
    setError(null);
    setResults([]);
    
    if (excludedUrls.size > 0) {
        setProgressMessage(`Excluding ${excludedUrls.size} URLs from the crawl.`);
        // Give user a moment to see the message
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    const queue: string[] = [];
    const seenUrls = new Set<string>(excludedUrls);
    
    // Add startUrl only if it's not excluded
    if (!seenUrls.has(startUrl)) {
        queue.push(startUrl);
        seenUrls.add(startUrl);
    }

    const allInlinks = new Map<string, Inlink[]>();
    let analyzedCount = 0;

    try {
        const siteDomain = new URL(startUrl).hostname;
        const BATCH_SIZE = 5;

        while (queue.length > 0 && analyzedCount < targetPageCount) {
            const batchUrls = queue.splice(0, Math.min(BATCH_SIZE, targetPageCount - analyzedCount));
            if (batchUrls.length === 0) break;
            
            setProgressMessage(`Analyzing batch... Discovered: ${seenUrls.size}, Analyzed: ${analyzedCount}/${targetPageCount}`);
            
            let batchResults = await analyzePages(batchUrls, startUrl);
            
            // Merge inlinks data into the results
            batchResults = batchResults.map(page => ({
                ...page,
                inlinks: allInlinks.get(page.url) || [],
            }));

            analyzedCount += batchResults.length;
            setResults(prev => [...prev, ...batchResults]);

            // Don't discover more links if we've hit the target
            if(analyzedCount >= targetPageCount) break;

            for (const page of batchResults) {
                if (page.status >= 400) continue; // Don't crawl links from broken pages

                // To avoid excessive API calls, let's not extract links if our queue is already very full relative to our goal
                if (queue.length > (targetPageCount - analyzedCount) * 1.5) continue;

                const newLinks = await extractLinksFromPage(page.url, siteDomain);
                
                for (const link of newLinks) {
                    try {
                        const linkUrl = new URL(link.url);
                        
                        // Track inlink
                        const existingInlinks = allInlinks.get(link.url) || [];
                        allInlinks.set(link.url, [...existingInlinks, { sourceUrl: page.url, anchorText: link.anchorText }]);

                        // Ensure it's an internal link on the same domain and not seen before
                        if (linkUrl.hostname === siteDomain && !seenUrls.has(link.url)) {
                            seenUrls.add(link.url);
                            queue.push(link.url);
                        }
                    } catch (e) { /* ignore invalid URLs */ }
                }
            }
            
            // Add a small delay between batches to respect potential API rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setProgressMessage(`Crawl complete! Analyzed ${analyzedCount} pages.`);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during the crawl.');
      setProgressMessage(null);
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgressMessage(null), 5000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-4">
            <SiteIcon className="w-12 h-12 text-cyan-400"/>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              AI SEO Web Crawler
            </h1>
          </div>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Leverage Gemini to perform a simulated SEO crawl of your website. Get insights on titles, meta descriptions, H1 tags, and more without running a local crawler.
          </p>
        </header>

        <div className="max-w-4xl mx-auto bg-slate-800/50 p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-sm">
          <CrawlerForm onCrawl={handleCrawlStart} isLoading={isLoading} />
        </div>

        <div className="mt-12 max-w-7xl mx-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-10 bg-slate-800/50 rounded-2xl border border-slate-700">
                <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-lg text-slate-300">{progressMessage || 'AI crawler is at work...'}</p>
                <p className="text-sm text-slate-500">Please do not refresh the page. Results will appear below as they are processed.</p>
            </div>
          )}
          {error && (
            <div className="p-6 bg-red-900/50 text-red-200 border border-red-700 rounded-lg text-center">
              <h3 className="font-bold text-lg mb-2">Crawl Failed</h3>
              <p>{error}</p>
            </div>
          )}
          {(!isLoading || results.length > 0) && results.length > 0 && (
            <ResultsTable results={results} />
          )}
          {!isLoading && results.length === 0 && !error && (
            <div className="text-center p-10 bg-slate-800/50 rounded-2xl border border-slate-700/50 border-dashed">
                <p className="text-slate-500">Your crawl results will appear here once the analysis is complete.</p>
            </div>
          )}
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-slate-600">
        <p>Powered by Google Gemini</p>
      </footer>
    </div>
  );
};

export default App;
