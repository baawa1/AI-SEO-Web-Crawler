export interface Inlink {
  sourceUrl: string;
  anchorText: string;
}

export interface CrawledPage {
  // Core
  url: string;
  status: number;
  
  // Crawl & Architecture
  crawlDepth: number;
  redirectUrl: string | null;
  canonicalUrl: string | null;
  isNoIndex: boolean;
  isNoFollow: boolean;
  isBlockedByRobotsTxt: boolean;
  inlinks: Inlink[];

  // On-Page Content
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  h1s: string[];
  h2s: string[];
  wordCount: number;
  duplicateContentScore: number; // 0.0 to 1.0

  // Advanced & Technical
  missingAltTextImages: number;
  schemaTypes: string[]; // e.g., ["Product", "Review"]
  urlParameters: string[];
  responseTimeMs: number;
}
