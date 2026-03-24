import { Page, Locator } from 'playwright';
import { RawBusiness } from '../../types/business.types';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Selectors — confirmed against live Google Maps DOM (March 2026)
// Update this block if Maps changes its markup.
// ---------------------------------------------------------------------------

const SEL = {
  // List view (card)
  card:             '.Nv2PK',
  cardName:         '.fontHeadlineSmall',
  cardRating:       '.MW4etd',
  cardStarAria:     'span[aria-label*="stars"]',
  cardRows:         '.W4Efsd',

  // Detail panel — primary selectors (current Maps markup)
  detailName:       'h1.DUwDvf, h1[class*="DUwDvf"]',
  detailCategory:   '.DkEaL, [jsaction*="category"]',
  // Address: data-item-id is stable across redesigns
  detailAddress:    '[data-item-id="address"]',
  // Phone: data-tooltip is stable; also try aria-label containing "phone"
  detailPhone:      'button[data-tooltip="Copy phone number"], button[aria-label*="phone" i], [data-item-id^="phone"]',
  // Website: data-item-id="authority" is stable
  detailWebsite:    'a[data-item-id="authority"]',
  // Rating: try multiple known class names
  detailRating:     '.F7nice, [aria-label*="stars"] + span, .ceNzKf',
  // Review count
  detailReviews:    '.UY7F9, [aria-label*="review" i] span, .RDApEe',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanText(raw: string | null): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim();
}

function parseRating(text: string): number | null {
  const match = text.match(/(\d+\.\d+|\d+)/);
  return match ? parseFloat(match[1]) : null;
}

function parseReviewCount(text: string): number | null {
  // Formats seen: "(1,362)"  "1,362"  "(3.4K)"
  const cleaned = text.replace(/[()]/g, '').replace(/,/g, '').trim();
  if (cleaned.endsWith('K') || cleaned.endsWith('k')) {
    return Math.round(parseFloat(cleaned) * 1000);
  }
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

function parsePhone(text: string): string | null {
  // Keep only digits, spaces, dashes, parens, plus
  const cleaned = text.replace(/[^\d\s\-().+]/g, '').trim();
  return cleaned.length > 6 ? cleaned : null;
}

// ---------------------------------------------------------------------------
// MapsExtractor
//
// Two extraction modes:
//   1. extractFromCard()  — fast, reads visible card text (list view)
//      Gets: name, rating, category, address snippet, description snippet
//
//   2. extractFromDetail() — full, reads the detail panel after clicking
//      Gets: phone, website URL, full address, review count, category
//
// Typical flow per business:
//   const partial = await extractor.extractFromCard(page, index);
//   await nav.openListing(page, index);
//   const full = await extractor.extractFromDetail(page, partial, zipcode);
//   await nav.goBackToResults(page);
// ---------------------------------------------------------------------------

export class MapsExtractor {

  // Extract lightweight data from the card in the list view.
  // Does NOT require clicking — reads the already-visible card.
  async extractFromCard(page: Page, index: number): Promise<CardData | null> {
    const cards = page.locator(SEL.card);
    const card = cards.nth(index);

    try {
      const name = cleanText(await card.locator(SEL.cardName).first().textContent().catch(() => null));
      if (!name) return null;

      // Rating from aria-label: "4.3 stars"
      const starEl = card.locator(SEL.cardStarAria).first();
      const starAria = await starEl.getAttribute('aria-label').catch(() => null);
      const rating = starAria ? parseRating(starAria) : null;

      // The .W4Efsd rows contain: category · price · address, description, hours · phone
      const rows = await card.locator(SEL.cardRows).allTextContents();
      const rowsClean = rows.map(cleanText).filter(Boolean);

      // Find the row that contains the category — it has '·' but does NOT start
      // with a digit (rating rows start with digits like "4.6(2,068)")
      const categoryRow = rowsClean.find(r =>
        r.includes('·') && !r.match(/^\d/)
      ) ?? '';
      const parts = categoryRow.split('·').map(s => s.trim()).filter(Boolean);
      const category = parts[0] ?? '';
      const addressSnippet = parts[parts.length - 1] ?? '';

      // Description is a row without '·', not a number, not a phone, not hours
      const description = rowsClean.find(r =>
        !r.includes('·') &&
        !r.match(/^\d+(\.\d+)?$/) &&   // skip pure numeric strings like "4.6"
        !r.match(/^\(\d{3}\)/) &&       // skip phone numbers
        !r.match(/Open|Close|AM|PM/i) && // skip hours
        r.length > 5                    // skip very short strings
      ) ?? null;

      const googleMapsUrl = await this.getCardUrl(card);

      return { name, rating, category, addressSnippet, description, googleMapsUrl };
    } catch (err) {
      logger.warn('extractFromCard failed', { index, error: (err as Error).message });
      return null;
    }
  }

  // Extract full data from the detail panel (requires the panel to be open).
  async extractFromDetail(
    page: Page,
    partial: CardData,
    zipcode: string,
  ): Promise<RawBusiness | null> {
    try {
      // Name — use h1 in detail panel as the authoritative source
      const name = cleanText(
        await page.locator(SEL.detailName).first().textContent().catch(() => partial.name)
      ) || partial.name;

      // Category
      const category = cleanText(
        await page.locator(SEL.detailCategory).first().textContent().catch(() => partial.category)
      ) || partial.category;

      // Address — try aria-label first ("Address: 123 Main St"), then text content
      const addressEl = page.locator(SEL.detailAddress).first();
      const addressRaw = cleanText(
        await addressEl.getAttribute('aria-label').catch(() => null) ??
        await addressEl.textContent().catch(() => null)
      ).replace(/^Address:\s*/i, '');
      const address = addressRaw || partial.addressSnippet;

      // Phone — try aria-label ("Phone: (123) 456-7890"), then text content
      const phone = await this.extractPhone(page);

      // Website
      const websiteEl = page.locator(SEL.detailWebsite).first();
      const websiteHref = await websiteEl.getAttribute('href').catch(() => null);
      const hasWebsite = Boolean(websiteHref);

      // Rating — try text content of rating element
      const ratingText = cleanText(
        await page.locator(SEL.detailRating).first().textContent().catch(() => null)
      );
      const ratingMatch = ratingText.match(/^([\d.]+)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : partial.rating;

      // Review count
      const reviewsText = cleanText(
        await page.locator(SEL.detailReviews).first().textContent().catch(() => null)
      );
      const reviewCount = reviewsText ? parseReviewCount(reviewsText) : null;

      // Use the canonical Maps URL from the current page if we navigated there directly
      const canonicalUrl = partial.googleMapsUrl ?? page.url();

      return {
        name,
        phone,
        address,
        zipcode,
        category,
        description: partial.description,
        website: hasWebsite,
        websiteUrl: websiteHref ?? null,
        rating,
        reviewCount,
        googleMapsUrl: canonicalUrl,
      };
    } catch (err) {
      logger.warn('extractFromDetail failed', { name: partial.name, error: (err as Error).message });
      return null;
    }
  }

  // Try multiple strategies to find the phone number
  private async extractPhone(page: Page): Promise<string | null> {
    // Strategy 1: button with "Copy phone number" tooltip
    const btn = page.locator('button[data-tooltip="Copy phone number"]').first();
    const tooltipAria = await btn.getAttribute('aria-label').catch(() => null);
    if (tooltipAria) {
      const p = parsePhone(tooltipAria.replace(/^Phone:\s*/i, ''));
      if (p) return p;
    }
    const btnText = await btn.textContent().catch(() => null);
    if (btnText) {
      const p = parsePhone(btnText);
      if (p) return p;
    }

    // Strategy 2: any element with aria-label containing "phone"
    const phoneEl = page.locator('[aria-label*="phone" i]').first();
    const phoneAria = await phoneEl.getAttribute('aria-label').catch(() => null);
    if (phoneAria) {
      const p = parsePhone(phoneAria.replace(/^Phone:\s*/i, ''));
      if (p) return p;
    }

    // Strategy 3: data-item-id starting with "phone"
    const phoneItem = page.locator('[data-item-id^="phone"]').first();
    const phoneItemText = await phoneItem.textContent().catch(() => null);
    if (phoneItemText) {
      const p = parsePhone(phoneItemText);
      if (p) return p;
    }

    return null;
  }

  // Get the Google Maps place URL from the card's anchor tag
  private async getCardUrl(card: Locator): Promise<string | null> {
    const anchor = card.locator('a[href*="/maps/place/"]').first();
    return anchor.getAttribute('href').catch(() => null);
  }
}

// Intermediate shape from the card — not a full RawBusiness yet
export interface CardData {
  name: string;
  rating: number | null;
  category: string;
  addressSnippet: string;
  description: string | null;
  googleMapsUrl: string | null;
}
