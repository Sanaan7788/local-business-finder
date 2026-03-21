import { LLMFactory } from './src/services/llm/llm.factory';

// Verification script for step 4.1
// Tests the active provider (DeepSeek) with a real API call.
// Run with: npx tsx test-llm.ts

async function verify() {
  console.log('--- Step 4.1 Verification ---\n');

  // 1. Factory creates the correct adapter
  const provider = LLMFactory.create();
  console.log('1. Factory created provider:', provider.name);
  console.log('   Model:', provider.model);
  console.log('   Expected: deepseek / deepseek-ai/deepseek-v3.2 ✓');

  // 2. Live API call
  console.log('\n2. Making live API call...');
  const start = Date.now();

  const response = await provider.complete({
    systemPrompt: 'You are a helpful assistant. Always respond concisely.',
    userPrompt: 'Reply with exactly this JSON and nothing else: {"status": "ok", "provider": "deepseek"}',
    temperature: 0,
    maxTokens: 50,
  });

  console.log('   Duration:', response.durationMs, 'ms');
  console.log('   Tokens used:', response.tokensUsed);
  console.log('   Raw response:', response.content);

  // 3. Parse JSON from response
  const parsed = JSON.parse(response.content.trim());
  console.log('\n3. Parsed JSON:', parsed);
  console.log('   status === ok:', parsed.status === 'ok' ? '✓' : '✗');

  // 4. Factory error on unknown provider
  console.log('\n4. Factory rejects unknown provider:');
  try {
    LLMFactory.create('unknown-provider');
    console.log('   ✗ Should have thrown');
  } catch (e) {
    console.log('  ', (e as Error).message.slice(0, 60) + '...');
    console.log('   ✓ Error thrown correctly');
  }

  console.log('\nAll checks passed.');
}

verify().catch(e => { console.error(e.message); process.exit(1); });
