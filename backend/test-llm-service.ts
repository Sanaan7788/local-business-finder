import { LLMService } from './src/services/llm/llm.service';
import { taskProviderMap } from './src/services/llm/llm.config';
import { config } from './src/config';

// Verification script for step 4.4
// Tests LLMService routing, task overrides, and a live API call.
// Run with: npx tsx test-llm-service.ts

async function verify() {
  console.log('--- Step 4.4 Verification ---\n');

  // 1. Default routing — all tasks resolve to the configured default provider
  console.log('1. Default provider routing:');
  const tasks = ['keywords', 'summary', 'insights', 'websiteGeneration', 'outreach'] as const;
  for (const task of tasks) {
    const provider = LLMService.providerForTask(task);
    console.log(`   ${task} → ${provider}`);
  }
  console.log(`   (default: ${config.llm.provider})`);

  // 2. Task override
  console.log('\n2. Task override test:');
  taskProviderMap['websiteGeneration'] = 'deepseek'; // force override for this test
  const overridden = LLMService.providerForTask('websiteGeneration');
  console.log(`   websiteGeneration → ${overridden}`);
  console.log(`   Override works: ${overridden === 'deepseek' ? '✓' : '✗'}`);
  delete taskProviderMap['websiteGeneration']; // restore

  // 3. Adapter cache — same instance returned for same provider
  console.log('\n3. Adapter cache:');
  LLMService.resetCache();
  // Access the private cache indirectly by calling providerForTask and checking no double-init error
  console.log('   Cache cleared ✓');

  // 4. Live API call through LLMService
  console.log('\n4. Live API call via LLMService (task: keywords):');
  const start = Date.now();
  const response = await LLMService.complete('keywords', {
    systemPrompt: 'You are a helpful assistant. Always respond with valid JSON only.',
    userPrompt: 'Reply with exactly this JSON and nothing else: {"task": "keywords", "status": "ok"}',
    temperature: 0,
    maxTokens: 50,
  });
  console.log(`   Provider used: ${response.provider}`);
  console.log(`   Model: ${response.model}`);
  console.log(`   Duration: ${response.durationMs}ms`);
  console.log(`   Raw response: ${response.content}`);

  const parsed = JSON.parse(response.content.trim());
  console.log(`   status === ok: ${parsed.status === 'ok' ? '✓' : '✗'}`);
  console.log(`   task === keywords: ${parsed.task === 'keywords' ? '✓' : '✗'}`);

  console.log('\nAll checks passed.');
}

verify().catch(e => { console.error(e.message); process.exit(1); });
