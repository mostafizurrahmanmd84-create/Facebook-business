import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearUnansweredQuestions,
  listUnansweredQuestions,
  recordUnansweredQuestion,
  updateUnansweredQuestion
} from './feedbackStore.js';

test.beforeEach(() => clearUnansweredQuestions());

test('records and updates unanswered questions', () => {
  const item = recordUnansweredQuestion({ sessionId: 'web:test', question: 'Can I exchange my phone?', language: 'en', confidence: 0.1 });
  assert.equal(listUnansweredQuestions().length, 1);
  assert.equal(updateUnansweredQuestion(item.id, { status: 'reviewed' }).status, 'reviewed');
});
