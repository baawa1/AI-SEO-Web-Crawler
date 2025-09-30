
import { GoogleGenAI, Type } from "@google/genai";
import type { CrawledPage } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleApiError = (error: unknown, context: string): never => {
    console.error(`Error in ${context}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('JSON')) {
            throw new Error(`The AI returned an invalid data format during ${context}. Please try again.`);
        }
        throw new Error(`Failed during ${context}. Gemini API Error: ${error.message}`);
    }
    throw new Error(`An unknown error occurred in ${context} while communicating with the Gemini API.`);
};

const linkExtractionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            url: { type: Type.STRING, description: "The full, absolute URL of the link." },
            anchorText: { type: Type.STRING, description: "The clickable text of the link. Trim whitespace." },
        },
        required: ["url", "anchorText"],
    },
};

export const extractLinksFromPage = async (pageUrl: string, siteDomain: string): Promise<{ url: string; anchorText: string }[]> => {
    const prompt = `
        Act as a link extraction bot. Your task is to find all unique, internal links on a single web page and their corresponding anchor text.
        - Page to Scan: ${pageUrl}
        - Site Domain: ${siteDomain}
        
        Rules:
        1. Find all \`<a>\` tags on the page.
        2. For each link, provide the absolute URL and the clean anchor text.
        3. Convert relative URLs (e.g., "/path") to absolute ones (e.g., "https://${siteDomain}/path").
        4. Only return URLs that are on the exact same domain: "${siteDomain}". Do NOT include subdomains or external links.
        5. Do NOT include links to files (e.g., .pdf, .jpg) or anchor links (#section). Only include web pages.
        6. Clean the anchor text: remove extra whitespace. If the anchor is an image, use its alt text or "Image Link". If no text, use "N/A".
        
        Your final output must be ONLY a single JSON array of objects, each with a "url" and "anchorText" key. Do not include duplicates. If no links are found, return an empty array.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: linkExtractionSchema,
                temperature: 0.0,
            },
        });
        const text = response.text.trim();
        return JSON.parse(text) as { url: string; anchorText: string }[];
    } catch (error) {
        handleApiError(error, `link extraction for ${pageUrl}`);
    }
};


const analysisSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: "The full URL of the crawled page." },
      status: { type: Type.INTEGER, description: "Simulated HTTP status code (e.g., 200, 301, 404)." },
      crawlDepth: { type: Type.INTEGER, description: "Clicks from the start URL (homepage is 0)." },
      redirectUrl: { type: Type.STRING, description: "The final destination URL if the page is a redirect. Null otherwise." },
      canonicalUrl: { type: Type.STRING, description: "The canonical URL specified in the <link> tag. Null if not present." },
      isNoIndex: { type: Type.BOOLEAN, description: "True if the page has a 'noindex' directive." },
      isNoFollow: { type: Type.BOOLEAN, description: "True if the page has a 'nofollow' directive." },
      isBlockedByRobotsTxt: { type: Type.BOOLEAN, description: "True if the URL is disallowed by the site's robots.txt file." },
      title: { type: Type.STRING, description: "The content of the page's <title> tag." },
      titleLength: { type: Type.INTEGER, description: "The character count of the page title." },
      metaDescription: { type: Type.STRING, description: "The content of the meta description. 'N/A' if not present." },
      metaDescriptionLength: { type: Type.INTEGER, description: "The character count of the meta description." },
      h1s: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of all H1 tag contents." },
      h2s: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of all H2 tag contents." },
      wordCount: { type: Type.INTEGER, description: "Estimated word count of the main content." },
      duplicateContentScore: { type: Type.NUMBER, description: "Estimated content similarity score (0.0=unique, 1.0=identical) compared to other pages on the site." },
      missingAltTextImages: { type: Type.INTEGER, description: "Count of <img> tags missing the 'alt' attribute." },
      schemaTypes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of detected Schema.org types (e.g., 'Product', 'Review')." },
      urlParameters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of query parameters found in the URL (e.g., 'sort=price')." },
      responseTimeMs: { type: Type.INTEGER, description: "Simulated server response time in milliseconds." },
    },
    required: [
      "url", "status", "crawlDepth", "redirectUrl", "canonicalUrl", "isNoIndex", "isNoFollow", 
      "isBlockedByRobotsTxt", "title", "titleLength", "metaDescription", "metaDescriptionLength",
      "h1s", "h2s", "wordCount", "duplicateContentScore", "missingAltTextImages", "schemaTypes",
      "urlParameters", "responseTimeMs"
    ],
  },
};

export const analyzePages = async (urls: string[], siteContextUrl: string): Promise<CrawledPage[]> => {
    if (urls.length === 0) {
        return [];
    }
    const prompt = `
      Act as an expert SEO website crawler and technical SEO analyst.
      Your task is to perform a comprehensive, simulated analysis for the following list of URLs. These URLs are all from the website that starts at ${siteContextUrl}.
      
      URLS TO ANALYZE:
      ${urls.join('\n')}

      Data Extraction Requirements for Each Page:
      For each URL provided, you must extract the following information. Be meticulous. If a page would realistically be a 404 or redirect, simulate that behavior.

      - **Core & Crawl Metrics**:
          - \`url\`: The exact URL you are analyzing from the list.
          - \`status\`: The simulated HTTP status code (e.g., 200, 301, 404, 500).
          - \`crawlDepth\`: A plausible estimate of clicks from the homepage.
          - \`responseTimeMs\`: A plausible, simulated server response time in milliseconds.

      - **Indexing & Directives**:
          - \`redirectUrl\`: The final redirect destination, or null.
          - \`canonicalUrl\`: The URL from the \`<link rel="canonical">\` tag, or null if absent.
          - \`isNoIndex\`: True if a 'noindex' directive is found.
          - \`isNoFollow\`: True if a 'nofollow' directive is found.
          - \`isBlockedByRobotsTxt\`: Simulate checking the site's robots.txt for the given URL path.

      - **On-Page Content**:
          - \`title\`: The full text of the \`<title>\` tag. If missing, use "N/A".
          - \`titleLength\`: The character count of the title.
          - \`metaDescription\`: The full text of the \`<meta name="description">\` tag. Use "N/A" if missing.
          - \`metaDescriptionLength\`: The character count of the meta description.
          - \`h1s\`: A list of all texts from \`<h1>\` tags.
          - \`h2s\`: A list of all texts from \`<h2>\` tags.
          - \`wordCount\`: An estimated word count for the main page content.
          - \`duplicateContentScore\`: Your best estimate of content similarity to other pages on the site, from 0.0 (unique) to 1.0 (identical).

      - **Advanced & Technical**:
          - \`missingAltTextImages\`: The total count of \`<img>\` tags that are missing an 'alt' attribute.
          - \`schemaTypes\`: A list of key Schema.org types found (e.g., "Product", "Review", "Article").
          - \`urlParameters\`: A list of any query parameters present in the URL string.

      Your final output must be ONLY a single JSON array of objects, one object for each URL, strictly conforming to the provided schema. Do not include any other text, explanations, or markdown formatting. The array must contain exactly ${urls.length} objects.
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          temperature: 0.1,
        },
      });
  
      const text = response.text.trim();
      // We cast here, but the inlinks property will be added in App.tsx
      const data = JSON.parse(text) as Omit<CrawledPage, 'inlinks'>[];
      return data.map(p => ({ ...p, inlinks: [] }));
  
    } catch (error) {
        handleApiError(error, 'page analysis');
    }
  };
