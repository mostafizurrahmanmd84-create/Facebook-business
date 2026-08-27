import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectIntent,
  detectLanguage,
  getBusinessUnknownMessage,
  isHandoffRequest
} from './businessFeatures.js';

test('detects English, Bangla, and Banglish', () => {
  assert.equal(detectLanguage('What is the delivery charge?'), 'en');
  assert.equal(detectLanguage('ডেলিভারি চার্জ কত?'), 'bn');
  assert.equal(detectLanguage('delivery charge koto?'), 'banglish');
});

test('detects handoff and sales intents', () => {
  assert.equal(detectIntent('I want to talk to a human'), 'handoff');
  assert.equal(detectIntent('I have a budget of 30000, which phone should I buy?'), 'sales_recommendation');
  assert.equal(isHandoffRequest('please connect me to an agent'), true);
});

test('provides a grounded unknown-business response', () => {
  assert.match(getBusinessUnknownMessage('en'), /confirmed information/i);
  assert.match(getBusinessUnknownMessage('bn'), /business database/);
});
