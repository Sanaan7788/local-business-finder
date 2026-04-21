import { Business } from '../../../types/business.types';

// ---------------------------------------------------------------------------
// Outreach Email Prompt
//
// Generates a personalised cold outreach email to the business owner based
// on the improvement opportunities found during website analysis.
// Tone: concise, human, helpful — not salesy. No jargon.
// ---------------------------------------------------------------------------

export function buildOutreachEmailPrompt(business: Business): { systemPrompt: string; userPrompt: string } {
  const improvements = business.websiteAnalysis?.improvements ?? [];
  const score = business.websiteAnalysis?.score ?? null;
  const scoreReason = business.websiteAnalysis?.scoreReason ?? null;

  // Pick top 3–4 most impactful improvements to keep the email short
  const topImprovements = improvements.slice(0, 4);

  return {
    systemPrompt:
      'You write short, genuine cold outreach emails on behalf of a web developer reaching out to local business owners. ' +
      'Your tone is warm, direct, and helpful — like a person, not a marketing template. ' +
      'Never use phrases like "I hope this email finds you well", "leverage", "synergy", "cutting-edge", or any corporate jargon. ' +
      'Keep the email under 180 words. Get to the point quickly. ' +
      'The email should make the business owner feel you actually looked at their website — because you did. ' +
      'Always respond with valid JSON only. No explanation, no markdown, no code fences.',

    userPrompt:
      `Write a cold outreach email to the owner of this business about improving their website.\n\n` +
      `Business name: ${business.name}\n` +
      `Category: ${business.category}\n` +
      `Website: ${business.websiteUrl ?? '(no website yet)'}\n` +
      (score !== null ? `Current website score: ${score}/10\n` : '') +
      (scoreReason ? `Score reason: ${scoreReason}\n` : '') +
      `\nTop issues found on their website:\n` +
      topImprovements.map((imp, i) => `${i + 1}. ${imp}`).join('\n') +
      `\n\nInstructions:\n` +
      `- Open by referencing the business specifically (name + what they do)\n` +
      `- Mention 2–3 specific issues you noticed on their site (from the list above) — be concrete, not vague\n` +
      `- Briefly explain why fixing these matters for their customers\n` +
      `- End with one clear, low-pressure call to action (e.g. a quick call or reply)\n` +
      `- Sign off as "Alex" (no last name, no title)\n` +
      `- Keep it under 180 words\n\n` +
      `Return JSON in this exact shape:\n` +
      `{\n` +
      `  "subject": "Short, specific email subject line (under 10 words, no clickbait)",\n` +
      `  "body": "The full email body — plain text, no markdown"\n` +
      `}`,
  };
}

export function parseOutreachEmail(raw: string): { subject: string; body: string } {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.subject !== 'string') throw new Error('subject field missing');
  if (typeof parsed.body !== 'string') throw new Error('body field missing');
  return {
    subject: parsed.subject.trim(),
    body: parsed.body.trim(),
  };
}
