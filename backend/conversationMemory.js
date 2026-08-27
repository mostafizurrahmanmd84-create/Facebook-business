export const MAX_MEMORY_MESSAGES = 10;

const conversationMemory = new Map();
const conversationStates = new Map();

const normalizeMessage = (message) => ({
  role: message.role === 'assistant' ? 'assistant' : 'user',
  content: String(message.content || '')
});

export const getConversationMemory = (sessionId) => {
  if (!sessionId) return [];
  return [...(conversationMemory.get(sessionId) || [])];
};

export const listConversationSessions = () => [...conversationMemory.entries()].map(([sessionId, messages]) => ({
  sessionId,
  messages: [...messages]
}));

export const getConversationSession = (sessionId) => ({
  sessionId,
  messages: getConversationMemory(sessionId),
  state: getConversationState(sessionId)
});

export const getMessagesForReply = (sessionId, currentMessage) => [
  ...getConversationMemory(sessionId).slice(-(MAX_MEMORY_MESSAGES - 1)),
  normalizeMessage(currentMessage)
];

export const saveConversationMessages = (sessionId, messages) => {
  if (!sessionId) return;
  const normalizedMessages = messages
    .map(normalizeMessage)
    .filter((message) => message.content.trim());
  conversationMemory.set(sessionId, normalizedMessages.slice(-MAX_MEMORY_MESSAGES));
};

export const clearConversationMemory = () => {
  conversationMemory.clear();
  conversationStates.clear();
};

export const getConversationState = (sessionId) => ({
  humanMode: false,
  handoffRequired: false,
  language: 'en',
  lastIntent: 'general',
  ...(conversationStates.get(sessionId) || {})
});

export const updateConversationState = (sessionId, patch) => {
  if (!sessionId) return getConversationState(sessionId);
  const nextState = { ...getConversationState(sessionId), ...patch };
  conversationStates.set(sessionId, nextState);
  return nextState;
};

export const listConversationStates = () => [...conversationStates.entries()].map(([sessionId, state]) => ({ sessionId, ...state }));