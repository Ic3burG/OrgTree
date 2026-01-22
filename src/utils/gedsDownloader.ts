/**
 * Utility for processing GEDS URLs and extracting data
 */
export const UrlProcessor = {
  parseUrls(text: string): string[] {
    if (!text) return [];
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.startsWith('http'));
  },

  extractNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const dn = urlObj.searchParams.get('dn');
      if (dn) {
        // Decode base64 and extract a meaningful name from Common Name (CN)
        const decoded = window.atob(dn);
        // Match CN= followed by characters that are either escaped commas (\,) or not commas
        const cnMatch = decoded.match(/CN=((?:\\.|[^,])+)/);
        if (cnMatch) {
          return cnMatch[1]!.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
        }
      }
    } catch (e) {
      console.error('Failed to extract name from URL:', url, e);
    }
    return `geds_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  },
};

/**
 * GEDS Data Fetcher with scraping logic
 */
export const GedsFetcher = {
  async getXmlLinkFromPage(pageUrl: string): Promise<string> {
    let fetchUrl = pageUrl;

    // Use proxy for local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (fetchUrl.includes('geds-sage.gc.ca')) {
        fetchUrl = fetchUrl.replace('https://geds-sage.gc.ca', '/api-geds');
      }
    }

    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(`Failed to load page: ${response.status}`);
      const html = await response.text();

      // Parse HTML to find the XML export link
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Look for the image with specific alt text or a link containing "XML"
      const img = doc.querySelector('img[alt="Export information to XML"]');
      let xmlUrl = '';

      if (img) {
        // Check if wrapped in an anchor tag
        const parentLink = img.closest('a');
        if (parentLink) {
          xmlUrl = parentLink.href;
        } else {
          const onclick = img.getAttribute('onclick');
          if (onclick) {
            // Extract URL from onclick attribute
            // Example: window.location.assign('?pgid=026&dn=...')
            const match = onclick.match(/['"]([^'"]+)['"]/);
            if (match) {
              // It's a relative URL, likely starting with ?pgid=...
              xmlUrl = new URL(match[1]!, 'https://geds-sage.gc.ca/en/GEDS').href;
            }
          }
        }
      }

      if (!xmlUrl) {
        // Fallback: look for any link with "XML" text
        const links = Array.from(doc.querySelectorAll('a'));
        const xmlLink = links.find(
          a => a.innerText.toUpperCase().includes('XML') || a.href.toUpperCase().includes('XML')
        );
        if (xmlLink) xmlUrl = xmlLink.href;
      }

      if (!xmlUrl) throw new Error('Could not find XML download link on page.');

      return xmlUrl;
    } catch (err) {
      console.error('Scraping failed:', err);
      throw new Error(
        `Failed to find XML link: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  },

  async fetchXml(url: string): Promise<string> {
    // First step: Scrape the page to get the true XML URL
    const realXmlUrl = await this.getXmlLinkFromPage(url);

    // Second step: Download the actual XML file
    let fetchUrl = realXmlUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (fetchUrl.includes('geds-sage.gc.ca')) {
        fetchUrl = fetchUrl.replace('https://geds-sage.gc.ca', '/api-geds');
      }
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  },
};
