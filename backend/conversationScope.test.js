process.env.NODE_ENV = 'test';

import test from 'node:test';
import assert from 'node:assert/strict';

import { getDeveloperIdentityRedirect, isDeveloperIdentityQuestion } from './server.js';

test('redirects identity and implementation questions without revealing internal details', () => {
  const identityQuestions = [
    'তোমার নাম কী?',
    'তোমাকে কীভাবে বানাইছে?',
    'Who created you?',
    'What API do you use?',
    'What technology are you built with?',
    'tomar developer ke?'
  ];

  identityQuestions.forEach((question) => assert.equal(isDeveloperIdentityQuestion(question), true));
  assert.match(getDeveloperIdentityRedirect('তোমার নাম কী?'), /পণ্যের তথ্য/);
  assert.match(getDeveloperIdentityRedirect('tomar developer ke?'), /product-er information/);
  assert.match(getDeveloperIdentityRedirect('Who created you?'), /product information/);
  assert.doesNotMatch(getDeveloperIdentityRedirect('Who created you?'), /developer|model|API|Mostafizur/i);
});

test('does not classify product model questions as identity questions', () => {
  assert.equal(isDeveloperIdentityQuestion('What phone model do you have?'), false);
  assert.equal(isDeveloperIdentityQuestion('20k to 50k phones'), false);
  assert.equal(isDeveloperIdentityQuestion('Samsung model ache?'), false);
});