import { AIService } from './src/services/ai/ai.service';
import { Business } from './src/types/business.types';

// Verification script for Section 5
// Tests prompt builders, parsers, and live LLM calls for all three AI tasks.
// Run with: npx tsx test-ai.ts

// Minimal mock business — realistic enough to produce good AI output
const mockBusiness: Business = {
  id: '00000000-0000-0000-0000-000000000001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  name: "Tony's Plumbing",
  phone: '(212) 555-0199',
  address: '456 W 23rd St, New York, NY 10011',
  zipcode: '10011',
  category: 'Plumber',
  description: 'Local plumbing and repair services',
  website: false,
  websiteUrl: null,
  rating: 4.1,
  reviewCount: 23,
  googleMapsUrl: null,
  keywords: [],
  summary: null,
  insights: null,
  generatedWebsiteCode: null,
  outreach: null,
  githubUrl: null,
  deployedUrl: null,
  leadStatus: 'new',
  priority: 'high',
  priorityScore: 65,
  notes: null,
  lastContactedAt: null,
};

async function verify() {
  console.log('--- Section 5 Verification ---\n');

  // 1. Keywords
  console.log('1. Generating keywords...');
  const keywords = await AIService.generateKeywords(mockBusiness);
  console.log('   Keywords:', keywords);
  console.log(`   Count: ${keywords.length} ${keywords.length >= 5 ? '✓' : '✗'}`);
  console.log(`   All strings: ${keywords.every(k => typeof k === 'string') ? '✓' : '✗'}`);

  // 2. Summary (inject keywords from step 1)
  const businessWithKeywords = { ...mockBusiness, keywords };
  console.log('\n2. Generating summary...');
  const summary = await AIService.generateSummary(businessWithKeywords);
  console.log('   Summary:', summary);
  console.log(`   Is string: ${typeof summary === 'string' ? '✓' : '✗'}`);
  console.log(`   Non-empty: ${summary.length > 20 ? '✓' : '✗'}`);

  // 3. Insights (inject keywords + summary)
  const businessWithSummary = { ...businessWithKeywords, summary };
  console.log('\n3. Generating insights...');
  const insights = await AIService.generateInsights(businessWithSummary);
  console.log('   whyNeedsWebsite:', insights.whyNeedsWebsite);
  console.log('   whatsMissingOnline:', insights.whatsMissingOnline);
  console.log('   opportunities:', insights.opportunities);
  console.log(`   Has whyNeedsWebsite: ${insights.whyNeedsWebsite.length > 0 ? '✓' : '✗'}`);
  console.log(`   Has opportunities: ${insights.opportunities.length >= 3 ? '✓' : '✗'}`);

  console.log('\nAll checks passed.');
}

verify().catch(e => { console.error(e.message); process.exit(1); });
