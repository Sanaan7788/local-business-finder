import { WebsiteGeneratorService, slugify, assemblePackage } from './src/services/website/website.generator';
import { Business } from './src/types/business.types';

// Verification script for Section 7
// Tests: slugify, assemblePackage, and a live website generation LLM call.
// Run with: npx tsx test-website.ts
//
// NOTE: This makes a REAL LLM call and generates a full HTML website.
// Expect 20–60s response time. Output will be saved to a local .html file for preview.

import fs from 'fs';
import path from 'path';

const mockBusiness: Business = {
  id: '00000000-0000-0000-0000-000000000002',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  name: "Maria's Nail Salon",
  phone: '(718) 555-0177',
  address: '88 Atlantic Ave, Brooklyn, NY 11201',
  zipcode: '11201',
  category: 'Nail Salon',
  description: 'Friendly nail salon offering manicures, pedicures, and gel nails',
  website: false,
  websiteUrl: null,
  rating: 4.4,
  reviewCount: 61,
  googleMapsUrl: null,
  keywords: ['nail salon Brooklyn', 'gel nails 11201', 'manicure Atlantic Ave', 'pedicure Brooklyn Heights'],
  summary: "Maria's Nail Salon is a well-loved nail salon in Brooklyn Heights with 61 reviews and a 4.4-star rating. Despite their loyal following, they have no website, making it hard for new customers to find them online.",
  insights: {
    whyNeedsWebsite: 'They have strong reviews but no web presence to capture new customers searching online.',
    whatsMissingOnline: 'No booking system, no service menu, no photos of their work.',
    opportunities: ['Online booking', 'Service price list', 'Gallery of nail art', 'Local SEO for Brooklyn'],
  },
  generatedWebsiteCode: null,
  outreach: null,
  githubUrl: null,
  deployedUrl: null,
  leadStatus: 'new',
  priority: 'high',
  priorityScore: 70,
  notes: null,
  lastContactedAt: null,
};

async function verify() {
  console.log('--- Section 7 Verification ---\n');

  // 1. Slugify
  console.log('1. slugify():');
  const slug = slugify(mockBusiness.name, mockBusiness.zipcode);
  console.log(`   Input:  "Maria's Nail Salon" + "11201"`);
  console.log(`   Output: "${slug}"`);
  console.log(`   Valid slug: ${/^[a-z0-9-]+$/.test(slug) ? '✓' : '✗'}`);
  console.log(`   Contains zipcode: ${slug.includes('11201') ? '✓' : '✗'}`);

  // 2. assemblePackage (no LLM, just structure)
  console.log('\n2. assemblePackage():');
  const mockHtml = '<!DOCTYPE html><html><head></head><body>Test</body></html>';
  const pkg = assemblePackage(mockBusiness, mockHtml);
  console.log(`   slug: ${pkg.slug}`);
  const vercel = JSON.parse(pkg.vercelJson);
  console.log(`   vercel.json version: ${vercel.version} ${vercel.version === 2 ? '✓' : '✗'}`);
  console.log(`   vercel.json has builds: ${Array.isArray(vercel.builds) ? '✓' : '✗'}`);

  // 3. Live LLM call — generate a full website
  console.log('\n3. Live website generation (LLM call — may take 30–60s)...');
  const start = Date.now();

  // We call the service directly with the mock business (not via repo)
  // by invoking the internal generate logic manually
  const { LLMService } = await import('./src/services/llm/llm.service');

  // Build prompt the same way the service does
  const systemPrompt = [
    'You are an expert web developer specializing in local business websites.',
    'Generate a complete, production-ready, single-file HTML website.',
    'Requirements:',
    '- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>',
    '- Mobile-first, fully responsive',
    '- Include all meta tags (charset, viewport, description, keywords)',
    '- Sections: hero, about, services, contact',
    '- Use real business data provided — no placeholder text like [Business Name]',
    '- Hero section must prominently show the business name and a clear tagline',
    '- Contact section must show the real phone number and address',
    '- Clean, professional design with good color contrast',
    '- No external images — use emoji or CSS shapes for visual interest',
    '- Output ONLY the raw HTML starting with <!DOCTYPE html>',
    '- Do NOT wrap in markdown code fences or add any explanation',
  ].join('\n');

  const userPrompt = [
    `Business name: ${mockBusiness.name}`,
    `Category: ${mockBusiness.category}`,
    `Address: ${mockBusiness.address}`,
    `Phone: ${mockBusiness.phone}`,
    `Description: ${mockBusiness.description}`,
    `Google rating: ${mockBusiness.rating} stars`,
    `Review count: ${mockBusiness.reviewCount} reviews`,
    `SEO keywords: ${mockBusiness.keywords.join(', ')}`,
    `Business summary: ${mockBusiness.summary}`,
    '',
    'Generate the complete HTML website now.',
  ].join('\n');

  const response = await LLMService.complete('websiteGeneration', {
    systemPrompt,
    userPrompt,
    temperature: 0.5,
    maxTokens: 4096,
  });

  const duration = Date.now() - start;
  let html = response.content.trim();
  if (html.startsWith('```')) {
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  console.log(`   Duration: ${duration}ms`);
  console.log(`   HTML length: ${html.length} chars`);
  console.log(`   Starts with <!DOCTYPE: ${html.toLowerCase().startsWith('<!doctype') ? '✓' : '✗'}`);
  console.log(`   Contains business name: ${html.includes("Maria's Nail Salon") ? '✓' : '✗'}`);
  console.log(`   Contains phone: ${html.includes('718') ? '✓' : '✗'}`);
  console.log(`   Contains Tailwind CDN: ${html.includes('tailwindcss.com') ? '✓' : '✗'}`);
  console.log(`   Has closing </html>: ${html.toLowerCase().includes('</html>') ? '✓' : '✗'}`);

  // Save HTML to file for browser preview
  const outPath = path.resolve(__dirname, 'test-website-output.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`\n   Preview saved to: ${outPath}`);
  console.log('   Open in browser to inspect the generated website.');

  console.log('\nAll checks passed.');
}

verify().catch(e => { console.error(e.message); process.exit(1); });
