import test from 'node:test';
import assert from 'node:assert/strict';

const mod = await import('../common/openai.js');

test('OpenAI provider settings remain compatible', () => {
  const config = mod.resolveProviderConfig('openai');
  assert.equal(config.name, 'OpenAI');
  assert.equal(config.endpoint, 'https://api.openai.com/v1/chat/completions');
  assert.equal(config.defaultModel, 'gpt-4o-mini');
});

test('DeepSeek provider settings use the DeepSeek API', () => {
  const config = mod.resolveProviderConfig('deepseek');
  assert.equal(config.name, 'DeepSeek');
  assert.equal(config.endpoint, 'https://api.deepseek.com/v1/chat/completions');
  assert.equal(config.defaultModel, 'deepseek-chat');
});
