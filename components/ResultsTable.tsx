import React, { useState } from 'react';
import type { CrawledPage } from '../types';
import { ExportIcon } from './icons/ExportIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ResultsTableProps {
  results: CrawledPage[];
}

const getStatusBadgeClass = (status: number) => {
  if (status >= 200 && status < 300) return 'bg-green-500/20 text-green-300';
  if (status >= 400 && status < 500) return 'bg-red-500/20 text-red-300';
  if (status >= 300 && status < 400) return 'bg-yellow-500/20 text-yellow-300';
  return 'bg-slate-500/20 text-slate-300';
};

const DetailItem: React.FC<{ label: string; value?: string | number | string[] | null | boolean; isBoolean?: boolean }> = ({ label, value, isBoolean = false }) => {
    let displayValue: React.ReactNode = 'N/A';
    let valueClass = 'text-slate-300';

    if (isBoolean) {
        displayValue = value ? 'Yes' : 'No';
        valueClass = value ? 'text-red-400' : 'text-green-400';
    } else if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
            displayValue = value.length > 0 ? value.join(', ') : 'None';
        } else if (typeof value === 'number' && value === 0 && label !== 'Crawl Depth') {
            displayValue = '0';
        }
         else {
            displayValue = value.toString();
        }
    }
    
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
        valueClass = 'text-slate-500';
    }


  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm ${valueClass} break-words`}>{displayValue}</dd>
    </div>
  );
};

const DetailedRowContent: React.FC<{ page: CrawledPage }> = ({ page }) => (
    <div className="bg-slate-900/70 p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
        <dl className="space-y-4">
            <h3 className="font-semibold text-white text-base mb-2 border-b border-slate-700 pb-2">Indexing & Directives</h3>
            <DetailItem label="Canonical URL" value={page.canonicalUrl} />
            <DetailItem label="Redirect URL" value={page.redirectUrl} />
            <DetailItem label="Is NoIndex?" value={page.isNoIndex} isBoolean />
            <DetailItem label="Is NoFollow?" value={page.isNoFollow} isBoolean />
            <DetailItem label="Blocked by robots.txt?" value={page.isBlockedByRobotsTxt} isBoolean />
        </dl>
        <dl className="space-y-4">
            <h3 className="font-semibold text-white text-base mb-2 border-b border-slate-700 pb-2">On-Page Content</h3>
            <DetailItem label="Title" value={`${page.titleLength} chars - ${page.title}`} />
            <DetailItem label="Meta Description" value={`${page.metaDescriptionLength} chars - ${page.metaDescription}`} />
            <DetailItem label="H1 Tags" value={page.h1s} />
            <DetailItem label="H2 Tags" value={page.h2s} />
            <DetailItem label="Word Count" value={page.wordCount} />
            <DetailItem label="Duplicate Score" value={page.duplicateContentScore?.toFixed(2)} />
        </dl>
        <dl className="space-y-4">
            <h3 className="font-semibold text-white text-base mb-2 border-b border-slate-700 pb-2">Advanced & Technical</h3>
            <DetailItem label="Missing Alt Text on Images" value={page.missingAltTextImages} />
            <DetailItem label="Schema Types Detected" value={page.schemaTypes} />
            <DetailItem label="URL Parameters" value={page.urlParameters} />
        </dl>
        <div className="space-y-4">
          <h3 className="font-semibold text-white text-base mb-2 border-b border-slate-700 pb-2">Inlinks ({page.inlinks.length})</h3>
          <div className="max-h-48 overflow-y-auto pr-2">
            {page.inlinks.length > 0 ? (
                <ul className="space-y-3">
                    {page.inlinks.map((link, index) => (
                        <li key={index} className="text-sm">
                            <span className="font-mono text-cyan-400 break-all">{link.anchorText || '" "'}</span>
                            <span className="text-slate-500 mx-2">from</span>
                            <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-cyan-300 break-all">{link.sourceUrl}</a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-slate-500">No internal links to this page were found during the crawl.</p>
            )}
            </div>
        </div>
      </div>
    </div>
);


export const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const [expandedRowUrl, setExpandedRowUrl] = useState<string | null>(null);

  const handleRowClick = (url: string) => {
    setExpandedRowUrl(expandedRowUrl === url ? null : url);
  };

  const exportToCSV = () => {
    const headers = [
      'URL', 'Status', 'Crawl Depth', 'Response Time (ms)', 'Redirect URL', 'Canonical URL', 
      'isNoIndex', 'isNoFollow', 'isBlockedByRobotsTxt', 'Title', 'Title Length', 
      'Meta Description', 'Meta Description Length', 'H1s', 'H2s', 'Word Count', 
      'Duplicate Content Score', 'Missing Alt Text Images', 'Schema Types', 'URL Parameters', 'Inlinks'
    ];
    
    const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) return '""';
        let str = '';
        if (Array.isArray(field)) {
            // Special handling for inlinks array
            if (field.every(item => typeof item === 'object' && 'sourceUrl' in item)) {
                 str = field.map(link => `${link.sourceUrl} ("${link.anchorText}")`).join(' | ');
            } else {
                 str = field.join(' | ');
            }
        } else {
            str = String(field);
        }

        // If the string contains a comma, double quote, or newline, wrap it in double quotes.
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return `"${str}"`;
    };

    const csvRows = [
      headers.join(','),
      ...results.map(row => {
        const values = [
            escapeCsvField(row.url),
            row.status,
            row.crawlDepth,
            row.responseTimeMs,
            escapeCsvField(row.redirectUrl),
            escapeCsvField(row.canonicalUrl),
            row.isNoIndex,
            row.isNoFollow,
            row.isBlockedByRobotsTxt,
            escapeCsvField(row.title),
            row.titleLength,
            escapeCsvField(row.metaDescription),
            row.metaDescriptionLength,
            escapeCsvField(row.h1s),
            escapeCsvField(row.h2s),
            row.wordCount,
            row.duplicateContentScore,
            row.missingAltTextImages,
            escapeCsvField(row.schemaTypes),
            escapeCsvField(row.urlParameters),
            escapeCsvField(row.inlinks)
        ];
        return values.join(',');
      })
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'seo-crawl-results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
      <div className="p-4 sm:p-6 flex justify-between items-center border-b border-slate-700">
        <h2 className="text-xl font-bold text-white">Crawl Results ({results.length} pages)</h2>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-200 text-sm font-medium rounded-md hover:bg-slate-600 transition-colors"
        >
          <ExportIcon className="w-4 h-4" />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-800">
            <tr>
              <th scope="col" className="w-12 py-3.5 pl-4 pr-3 sm:pl-6"></th>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-300 sm:pl-6">URL</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-300">Status</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-300">Depth</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-300">Title</th>
              <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-300">Response (ms)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {results.map((page) => (
              <React.Fragment key={page.url}>
                <tr onClick={() => handleRowClick(page.url)} className="hover:bg-slate-700/30 transition-colors cursor-pointer">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-400 sm:pl-6">
                    <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${expandedRowUrl === page.url ? 'rotate-180' : ''}`} />
                  </td>
                  <td className="py-4 pl-4 pr-3 text-sm text-slate-300 sm:pl-6 max-w-sm truncate">
                    <a href={page.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-cyan-400">{page.url}</a>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(page.status)}`}>
                          {page.status}
                      </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300 text-center">{page.crawlDepth}</td>
                  <td className="px-3 py-4 text-sm text-slate-300 max-w-md truncate">{page.title || 'N/A'}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300 text-center">{page.responseTimeMs}</td>
                </tr>
                 {expandedRowUrl === page.url && (
                    <tr className="bg-slate-800/50">
                        <td colSpan={6}>
                           <DetailedRowContent page={page} />
                        </td>
                    </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
