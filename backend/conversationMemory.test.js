import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_MEMORY_MESSAGES,
  clearConversationMemory,
  getConversationState,
  getConversationMemory,
  getMessagesForReply,
  saveConversationMessages,
  updateConversationState
} from './conversationMemory.js';

test.beforeEach(() => {
  clearConversationMemory();
});

test('keeps only the latest 20 messages and reserves room for the current message', () => {
  const messages = Array.from({ length: MAX_MEMORY_MESSAGES + 5 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    content: `Message ${index + 1}`
  }));

  saveConversationMessages('session-a', messages);

  assert.equal(getConversationMemory('session-a').length, MAX_MEMORY_MESSAGES);
  assert.equal(getConversationMemory('session-a')[0].content, 'Message 6');
  assert.equal(getMessagesForReply('session-a', { role: 'user', content: 'New message' }).length, MAX_MEMORY_MESSAGES);
});

test('keeps memory separate for different sessions', () => {
  saveConversationMessages('session-a', [{ role: 'user', content: 'Rahim' }]);
  saveConversationMessages('session-b', [{ role: 'user', content: 'Karim' }]);

  assert.equal(getConversationMemory('session-a')[0].content, 'Rahim');
  assert.equal(getConversationMemory('session-b')[0].content, 'Karim');
});

test('keeps human takeover state separate per session', () => {
  updateConversationState('session-a', { humanMode: true, handoffRequired: true });

  assert.equal(getConversationState('session-a').humanMode, true);
  assert.equal(getConversationState('session-b').humanMode, false);
});