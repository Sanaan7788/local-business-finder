import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// WebsiteExtractor
//
// Fetches a business website and extracts structured data from its HTML:
// name, phone, address, category, description.
//
// Strategy (in order of reliability):
//   1. JSON-LD structured data (schema.org LocalBusiness)
//   2. OpenGraph / meta tags
//   3. Heuristic text patterns (phone regex, address-like strings)
// ---------------------------------------------------------------------------

export interface ExtractedWebsiteData {
  name: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  description: string | null;
  websiteUrl: string;
}

export class WebsiteExtractor {
  /**
   * Fetch the given URL and extract business info from HTML.
   * Returns null if the page could not be fetched.
   */
  async extract(url: string): Promise<ExtractedWebsiteData | null> {
    let html: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LocalBusinessBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn('WebsiteExtractor: non-OK response', { url, status: response.status });
        return null;
      }
      html = await response.text();
    } catch (err) {
      logger.warn('WebsiteExtractor: fetch failed', { url, error: (err as Error).message });
      return null;
    }

    const result: ExtractedWebsiteData = {
      name: null,
      phone: null,
      address: null,
      category: null,
      description: null,
      websiteUrl: url,
    };

    // --- 1. JSON-LD structured data ---
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const entries = Array.isArray(data) ? data : [data];
        for (const entry of entries) {
          const type = entry['@type'] ?? '';
          // Accept any LocalBusiness subtype
          if (typeof type === 'string' && (type.includes('LocalBusiness') || type.includes('Business') || type.includes('Organization') || type.includes('Store') || type.includes('Restaurant') || type.includes('Service'))) {
            if (entry.name && !result.name) result.name = String(entry.name).trim();
            if (entry.telephone && !result.phone) result.phone = String(entry.telephone).trim();
            if (entry.description && !result.description) result.description = String(entry.description).trim().slice(0, 500);
            if ((entry['@type']) && !result.category) result.category = String(entry['@type']).replace(/([A-Z])/g, ' $1').trim();
            if (entry.address && !result.address) {
              const addr = entry.address;
              if (typeof addr === 'string') {
                result.address = addr.trim();
              } else if (typeof addr === 'object') {
                const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode]
                  .filter(Boolean);
                result.address = parts.join(', ');
              }
            }
          }
        }
      } catch {
        // invalid JSON-LD, skip
      }
    }

    // --- 2. OpenGraph / meta tags ---
    if (!result.name) {
      const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
      if (og) result.name = og[1].trim();
    }
    if (!result.name) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        // Strip common suffixes like " | Home" or " - Official Site"
        result.name = titleMatch[1].replace(/\s*[\|–\-]\s*.+$/, '').trim();
      }
    }
    if (!result.description) {
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,}?)["']/i);
      if (metaDesc) result.description = metaDesc[1].trim().slice(0, 500);
    }
    if (!result.description) {
      const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{10,}?)["']/i);
      if (ogDesc) result.description = ogDesc[1].trim().slice(0, 500);
    }

    // --- 3. Heuristic phone extraction ---
    if (!result.phone) {
      const phoneMatch = html.match(/(?:tel:|phone:|call us)[:\s]*([+\d\s\-().]{7,20})/i)
        ?? html.match(/\b(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})\b/);
      if (phoneMatch) result.phone = phoneMatch[1].trim();
    }

    logger.debug('WebsiteExtractor: extraction complete', {
      url,
      name: result.name,
      phone: result.phone,
      address: result.address,
      category: result.category,
    });

    return result;
  }
}
