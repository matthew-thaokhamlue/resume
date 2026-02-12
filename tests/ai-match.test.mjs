import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fillPromptTemplate,
  buildProviderUrl,
  composePromptFromTemplate,
  buildAskInstruction,
  shouldUseClipboardFallback,
} from '../assets/js/ai-match.js';

test('fillPromptTemplate replaces known placeholders', () => {
  const template = [
    'Name: {{FULL_NAME}}',
    'Role: {{ROLE}}',
    'Summary: {{SUMMARY}}',
    'Portfolio: {{PORTFOLIO}}',
    'Ask: {{ASK}}',
  ].join('\n');

  const result = fillPromptTemplate(template, {
    FULL_NAME: 'Matthew Thaokhamlue',
    ROLE: 'Senior Product Manager',
    SUMMARY: 'AI/ML and SaaS product leader',
    PORTFOLIO: 'Labforward, LabTwin, Thryve',
    ASK: 'Assess fit and ask hard interview questions.',
  });

  assert.equal(result.includes('{{FULL_NAME}}'), false);
  assert.match(result, /Matthew Thaokhamlue/);
  assert.match(result, /Senior Product Manager/);
  assert.match(result, /Labforward, LabTwin, Thryve/);
});

test('buildProviderUrl builds query links for supported providers', () => {
  const prompt = 'Line 1 + Line 2';
  assert.equal(
    buildProviderUrl('chatgpt', prompt),
    `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  );
  assert.equal(
    buildProviderUrl('claude', prompt),
    `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  );
  assert.equal(
    buildProviderUrl('gemini', prompt),
    `https://gemini.google.com/app?prompt=${encodeURIComponent(prompt)}`,
  );
});

test('buildProviderUrl returns grok base URL as best-effort fallback', () => {
  const prompt = 'Any prompt';
  assert.equal(buildProviderUrl('grok', prompt), 'https://grok.com/');
});

test('composePromptFromTemplate injects JD-aware ask block when JD is provided', () => {
  const template = [
    'Candidate: {{FULL_NAME}}',
    'Role: {{ROLE}}',
    'Summary: {{SUMMARY}}',
    '{{PORTFOLIO}}',
    'Task: {{ASK}}',
  ].join('\n');

  const result = composePromptFromTemplate(template, {
    jobDescription: 'Own product roadmap, partner with engineering, drive measurable outcomes.',
  });

  assert.match(result, /Matthew Thaokhamlue/);
  assert.match(result, /Senior Product Manager/);
  assert.match(result, /Labforward/);
  assert.match(result, /LabTwin/);
  assert.match(result, /Thryve/);
  assert.match(result, /job description/i);
  assert.match(result, /Own product roadmap/i);
  assert.equal(result.includes('{{ASK}}'), false);
});

test('buildAskInstruction builds experience-only fallback ask when JD is missing', () => {
  const ask = buildAskInstruction({
    jobDescription: '',
    fallbackScope: 'experience',
  });

  assert.match(ask, /no job description was provided/i);
  assert.match(ask, /experience/i);
  assert.doesNotMatch(ask, /portfolio deep-dive only/i);
});

test('buildAskInstruction builds portfolio-only fallback ask when JD is missing', () => {
  const ask = buildAskInstruction({
    jobDescription: '',
    fallbackScope: 'portfolio',
  });

  assert.match(ask, /no job description was provided/i);
  assert.match(ask, /portfolio deep-dive only/i);
});

test('shouldUseClipboardFallback enables fallback for every provider in v1', () => {
  assert.equal(shouldUseClipboardFallback('chatgpt'), true);
  assert.equal(shouldUseClipboardFallback('claude'), true);
  assert.equal(shouldUseClipboardFallback('gemini'), true);
  assert.equal(shouldUseClipboardFallback('grok'), true);
});
