const unansweredQuestions = [];

export const recordUnansweredQuestion = ({ sessionId = '', channel = 'unknown', question, language = 'en', intent = 'general', confidence = 0, response = '', handoffRequired = false }) => {
  const item = {
    id: `${Date.now()}-${unansweredQuestions.length + 1}`,
    createdAt: new Date().toISOString(),
    sessionId,
    channel,
    question: String(question || ''),
    language,
    intent,
    confidence,
    response,
    handoffRequired,
    status: 'open'
  };
  unansweredQuestions.push(item);
  return item;
};

export const listUnansweredQuestions = () => unansweredQuestions.map((item) => ({ ...item }));

export const updateUnansweredQuestion = (id, patch) => {
  const item = unansweredQuestions.find((entry) => entry.id === id);
  if (!item) return null;
  Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  return { ...item };
};

export const clearUnansweredQuestions = () => unansweredQuestions.splice(0, unansweredQuestions.length);