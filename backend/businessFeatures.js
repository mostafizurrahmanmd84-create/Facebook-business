const banglishTerms = ['koto', 'parbo', 'korbo', 'chai', 'ache', 'ase', 'dam', 'diben', ' korte', ' korte'];

export const detectLanguage = (text = '') => {
  const value = String(text);
  if (/[\u0980-\u09FF]/.test(value)) return 'bn';
  if (banglishTerms.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(value))) return 'banglish';
  return 'en';
};

export const detectIntent = (text = '') => {
  const value = String(text).toLowerCase();
  if (/human|agent|person|representative|মানুষ|এজেন্ট|কথা বলতে চাই|অভিযোগ|refund|রিফান্ড|angry|রাগ/.test(value)) return 'handoff';
  if (/buy|স কিন|কিনতে|recommend|কোন ফোন|which phone|should i|budget|বাজেট/.test(value)) return 'sales_recommendation';
  if (/price|দাম|কত|stock|স্টক|available|ফোন|phone|iphone|samsung|delivery|payment|bkash|চার্জ/.test(value)) return 'business_search';
  return 'general';
};

export const isHandoffRequest = (text = '') => /human|agent|talk to (a )?person|representative|মানুষ|এজেন্ট|কাস্টমার কেয়ার|অভিযোগ|refund dispute|payment problem|রিফান্ড|রাগ|angry|frustrated/i.test(String(text));

export const getHandoffMessage = (language) => language === 'bn'
  ? 'বুঝতে পারছি। আমি আপনার কথোপকথনটি একজন support team member-এর জন্য mark করে রাখলাম।'
  : language === 'banglish'
    ? 'Bujhte parchi. Apnar kothopokothon-ti ekjon support team member-er jonno mark kore rakhlam.'
    : "I understand. I’ve marked this conversation for a support team member.";

export const getHumanModeMessage = (language) => language === 'bn'
  ? 'এই conversation-টি বর্তমানে একজন human agent handle করছেন।'
  : language === 'banglish'
    ? 'Ei conversation-ti ekhon ekjon human agent handle korchen.'
    : 'This conversation is currently being handled by a human agent.';

export const getBusinessUnknownMessage = (language) => language === 'bn'
  ? 'দুঃখিত, এই তথ্যটি বর্তমানে আমাদের business database-এ নেই।'
  : language === 'banglish'
    ? 'Dukkhito, ei tothyo-ti ekhon amader business database-e nei.'
    : "I’m sorry, I don't have confirmed information about that right now. Our support team can help you with the latest details.";