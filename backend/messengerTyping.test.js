process.env.NODE_ENV = 'test';
process.env.PAGE_ACCESS_TOKEN = 'test-page-token';

import test from 'node:test';
import assert from 'node:assert/strict';

import { updateConversationState } from './conversationMemory.js';
import {
  normalizeMessengerReactionEvent,
  processMessengerWebhookEvent,
  sendMessengerSenderAction,
  sendMessengerReplyWithTyping
} from './server.js';

test('sendMessengerSenderAction sends the correct Messenger sender_action payload', async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      status: 200,
      text: async () => ''
    };
  };

  await sendMessengerSenderAction('user-123', 'typing_on');

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /me\/messages\?access_token=/);
  assert.equal(requests[0].options.method, 'POST');
  const payload = JSON.parse(requests[0].options.body);
  assert.deepEqual(payload, {
    recipient: { id: 'user-123' },
    sender_action: 'typing_on'
  });
});

test('sendMessengerReplyWithTyping sends typing_off before the final response', async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      status: 200,
      text: async () => ''
    };
  };

  const output = await sendMessengerReplyWithTyping({
    senderPsid: 'user-456',
    getReply: async () => 'Hello there'
  });

  assert.equal(output, 'Hello there');
  assert.equal(requests.length, 3);

  const typingOn = JSON.parse(requests[0].options.body);
  const typingOff = JSON.parse(requests[1].options.body);
  const finalMessage = JSON.parse(requests[2].options.body);

  assert.deepEqual(typingOn, {
    recipient: { id: 'user-456' },
    sender_action: 'typing_on'
  });
  assert.deepEqual(typingOff, {
    recipient: { id: 'user-456' },
    sender_action: 'typing_off'
  });
  assert.deepEqual(finalMessage, {
    recipient: { id: 'user-456' },
    message: { text: 'Hello there' }
  });
});

test('normalizes a Facebook Like reaction event', () => {
  const normalized = normalizeMessengerReactionEvent({
    sender: { id: 'sender-1' },
    recipient: { id: 'page-9' },
    timestamp: 1712345678900,
    reaction: {
      reaction: 'LIKE',
      action: 'react',
      mid: 'mid.123'
    }
  });

  assert.deepEqual(normalized, {
    senderPsid: 'sender-1',
    recipientId: 'page-9',
    messageId: 'mid.123',
    reaction: 'like',
    action: 'react',
    timestamp: 1712345678900,
    rawEvent: {
      sender: { id: 'sender-1' },
      recipient: { id: 'page-9' },
      timestamp: 1712345678900,
      reaction: {
        reaction: 'LIKE',
        action: 'react',
        mid: 'mid.123'
      }
    }
  });
});

test('processes Facebook Like reactions through the AI flow and ignores duplicates', async () => {
  process.env.PAGE_ACCESS_TOKEN = 'test-page-token';
  const calls = [];

  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        choices: [{ message: { content: 'ধন্যবাদ! 👍 কীভাবে সাহায্য করতে পারি?' } }]
      })
    };
  };

  const event = {
    sender: { id: 'sender-2' },
    recipient: { id: 'page-9' },
    timestamp: 1712345678901,
    reaction: {
      reaction: 'LIKE',
      action: 'react',
      mid: 'mid.456'
    }
  };

  const firstResult = await processMessengerWebhookEvent(event);
  const secondResult = await processMessengerWebhookEvent(event);

  assert.equal(firstResult.handled, true);
  assert.equal(firstResult.eventType, 'reaction');
  assert.equal(secondResult, null);
  assert.equal(calls.length, 4);
  assert.equal(calls.some((call) => /api\.openai\.com|api\.groq\.com|api\.cohere\.com/.test(call.url)), true);
  assert.equal(calls.filter((call) => /me\/messages\?access_token=/.test(call.url)).length, 3);
});

test('does not auto-reply to a Like reaction while human mode is active', async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        choices: [{ message: { content: 'ignored' } }]
      })
    };
  };

  updateConversationState('messenger:human-user', { humanMode: true });

  const result = await processMessengerWebhookEvent({
    sender: { id: 'human-user' },
    recipient: { id: 'page-9' },
    timestamp: 1712345678902,
    reaction: {
      reaction: 'LIKE',
      action: 'react',
      mid: 'mid.789'
    }
  });

  assert.equal(result.handled, true);
  assert.equal(result.skippedReason, 'humanMode');
  assert.equal(calls.length, 0);
});
