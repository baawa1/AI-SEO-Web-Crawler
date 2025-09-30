
import React, { useState, useRef } from 'react';
import { RocketIcon } from './icons/RocketIcon';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import { UploadIcon } from './icons/UploadIcon';
import { ClearIcon } from './icons/ClearIcon';


interface CrawlerFormProps {
  onCrawl: (startUrl: string, maxPages: number, excludedUrls: Set<string>) => void;
  isLoading: boolean;
}

export const CrawlerForm: React.FC<CrawlerFormProps> = ({ onCrawl, isLoading }) => {
  const [url, setUrl] = useState<string>('https://developers.google.com/search/docs/fundamentals/seo-starter-guide');
  const [maxPages, setMaxPages] = useState<number>(250);
  const [error, setError] = useState<string>('');
  const [excludedUrls, setExcludedUrls] = useState<Set<string>>(new Set());
  const [exclusionFile, setExclusionFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const urls = new Set<string>();
        const lines = content.split(/[\r\n]+/);

        lines.forEach(line => {
          let urlToProcess = line.trim();
          // For CSVs from this app's export, the URL is the first field and may be quoted
          if (file.type === 'text/csv' && urlToProcess.includes(',')) {
            urlToProcess = urlToProcess.split(',')[0];
          }
          // Remove potential quotes
          urlToProcess = urlToProcess.replace(/^"|"$/g, '');

          if (urlToProcess.startsWith('http')) {
            try {
              // Validate URL format
              new URL(urlToProcess);
              urls.add(urlToProcess);
            } catch (_) {
              // Ignore invalid URLs in the file
            }
          }
        });
        setExcludedUrls(urls);
        setExclusionFile(file);
      };
      reader.readAsText(file);
    }
     // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const clearExclusionFile = () => {
    setExcludedUrls(new Set());
    setExclusionFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    if (!url) {
      setError('Please enter a valid URL to start crawling.');
      return;
    }

    try {
        new URL(url);
    } catch (_) {
        setError('The entered URL is not valid. Please include http:// or https://');
        return;
    }
    
    onCrawl(url, maxPages, excludedUrls);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2">
          Starting URL
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-shadow"
          disabled={isLoading}
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      <div>
          <label htmlFor="maxPages" className="block text-sm font-medium text-slate-300 mb-2">
            Target Page Count ({maxPages})
          </label>
          <input
            type="range"
            id="maxPages"
            min="10"
            max="5000"
            step="50"
            value={maxPages}
            onChange={(e) => setMaxPages(Number(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            disabled={isLoading}
          />
           <p className="text-xs text-slate-500 mt-1">Note: Very large crawls can be slow, resource-intensive, and may incur significant API costs. Use with caution.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Exclude URLs (Optional)
        </label>
        <div className="flex items-center gap-4">
            <input
              type="file"
              id="exclusionFile"
              ref={fileInputRef}
              accept=".txt,.csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            <label htmlFor="exclusionFile" className={`flex-grow inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-center rounded-md border transition-colors ${isLoading ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 cursor-pointer'}`}>
              <UploadIcon className="w-4 h-4" />
              Upload .txt or .csv
            </label>
        </div>
        {exclusionFile && (
             <div className="mt-3 flex items-center justify-between p-3 bg-slate-700/50 rounded-md text-sm">
                <p className="text-slate-300">
                    <span className="font-medium">{exclusionFile.name}</span> - {excludedUrls.size} URLs will be excluded.
                </p>
                <button type="button" onClick={clearExclusionFile} disabled={isLoading} className="text-slate-400 hover:text-white disabled:opacity-50">
                    <ClearIcon className="w-5 h-5" />
                </button>
            </div>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-md shadow-lg hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <LoadingSpinnerIcon className="w-5 h-5" />
              Crawling...
            </>
          ) : (
            <>
              <RocketIcon className="w-5 h-5" />
              Start Crawl
            </>
          )}
        </button>
      </div>
    </form>
  );
};
