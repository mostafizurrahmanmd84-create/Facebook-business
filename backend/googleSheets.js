import crypto from 'node:crypto';

export const normalizeQuery = (query = '') => String(query ?? '').trim().toLowerCase();

export const getGoogleSheetConfig = () => ({
  mobileBuySellSpreadsheetId: process.env.MOBILE_BUY_SELL_SPREADSHEET_ID?.trim() || '',
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '',
  privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim() || '',
  apiKey: process.env.GOOGLE_API_KEY?.trim() || ''
});

export const isGoogleSheetConfigured = () => {
  const { mobileBuySellSpreadsheetId, serviceAccountEmail, privateKey, apiKey } = getGoogleSheetConfig();
  return Boolean(mobileBuySellSpreadsheetId && ((serviceAccountEmail && privateKey) || apiKey));
};

const normalizeCellValue = (value) => value === null || value === undefined ? '' : String(value).trim();
const searchStopWords = new Set(['a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'give', 'has', 'have', 'how', 'is', 'me', 'of', 'please', 'show', 'student', 'students', 'tell', 'the', 'their', 'what', 'which', 'who', 'with', 'id']);
const searchSynonyms = new Map([
  ['fee', 'charge'], ['koto', 'how much'], ['dam', 'price'], ['diben', 'give'],
  ['parbo', 'can'], ['baire', 'outside'], ['bairе', 'outside'], ['bhitore', 'inside'],
  ['delivery', 'delivery'], ['payment', 'pay']
]);
const getSearchTerms = (query) => normalizeQuery(query).replace(/[’']s\b/g, '').replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter((term) => term.length > 1 && !searchStopWords.has(term));
const addQueryVariants = (term) => {
  const variants = new Set([term]);
  const singular = term.replace(/ies$/, 'y').replace(/sses$/, 'ss').replace(/es$/, '').replace(/s$/, '');
  if (singular && singular !== term) variants.add(singular);
  const plural = term.endsWith('y') ? `${term.slice(0, -1)}ies` : `${term}s`;
  if (plural && plural !== term) variants.add(plural);
  const synonym = searchSynonyms.get(term) || searchSynonyms.get(singular);
  if (synonym) {
    synonym.split(/\s+/).forEach((word) => word && variants.add(word));
  }
  return [...variants];
};
const getExpandedSearchTerms = (query) => [...new Set(getSearchTerms(query).flatMap((term) => addQueryVariants(term)))];
export const isAllRowsQuery = (query) => /\ball\b|\bevery(?:thing|one|body)?\b|\bfull\b|\bcomplete\b|\bentire\b|সব|সকল|সম্পূর্ণ|ডাটাবেস|database/i.test(normalizeQuery(query));

const normalizeDigits = (value) => String(value || '').replace(/[০-৯]/g, (digit) => '০১২৩৪৫৬৭৮৯'.indexOf(digit));
const normalizeMobileText = (value) => normalizeDigits(value)
  .toLowerCase()
  .replace(/হাজারের/g, 'হাজার')
  .replace(/আইফোন/g, 'iphone')
  .replace(/স্যামসাং/g, 'samsung')
  .replace(/গ্যালাক্সি/g, 'galaxy')
  .replace(/প্রো/g, 'pro')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const canonicalHeader = (value) => normalizeMobileText(value).replace(/[^a-z0-9]/g, '');

const getColumnValue = (row, aliases) => {
  const canonicalAliases = aliases.map(canonicalHeader);
  const entry = Object.entries(row || {}).find(([key]) => canonicalAliases.includes(canonicalHeader(key)));
  return entry ? normalizeCellValue(entry[1]) : '';
};

const getMobileFields = (row) => ({
  date: getColumnValue(row, ['date']),
  model: getColumnValue(row, ['brandmodel', 'brand+model', 'brandandmodel']),
  ram: getColumnValue(row, ['storageram', 'storage+ram', 'storageandram']),
  condition: getColumnValue(row, ['physicalcondition', 'condition']),
  price: getColumnValue(row, ['price']),
  stock: getColumnValue(row, ['productstock', 'stock', 'availability'])
});

export const formatMobileProductRows = (rows = []) => rows.map((row) => {
  const fields = getMobileFields(row);
  return {
    'Brand + Model': fields.model,
    'Storage + RAM': fields.ram,
    'Physical Condition': fields.condition,
    Price: fields.price,
    'Product Stock': fields.stock
  };
});

const parsePrice = (value) => {
  const normalized = normalizeDigits(value).replace(/,/g, '');
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const parsePriceAmount = (value) => {
  const normalized = normalizeDigits(value).replace(/,/g, '').toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(হাজার|thousand|k)?/);
  if (!match) return null;
  const amount = Number(match[1]);
  return match[2] ? amount * 1000 : amount;
};

const getPriceRange = (query) => {
  const normalized = normalizeDigits(query).toLowerCase();
  const amountPattern = /\d+(?:[,.]\d+)?\s*(?:হাজার(?:ের)?|thousand|k)?/g;
  const amountMatches = [...normalized.matchAll(amountPattern)];
  const amounts = amountMatches.map((match) => parsePriceAmount(match[0])).filter(Number.isFinite);
  const rangeConnector = /-|–|—|\b(?:to|between|thake|theke|moddhe|modhe|mode)\b|থেকে|মধ্যে/;
  if (amounts.length >= 2 && rangeConnector.test(normalized)) {
    const rangeUnit = amountMatches.slice(0, 2).map((match) => match[0]).find((value) => /(?:হাজার|thousand|k)/i.test(value));
    const normalizedAmounts = amounts.slice(0, 2).map((amount, index) => {
      const matchedValue = amountMatches[index][0];
      return rangeUnit && !/(?:হাজার|thousand|k)/i.test(matchedValue) ? amount * 1000 : amount;
    });
    return { min: normalizedAmounts[0], max: normalizedAmounts[1] };
  }
  if (amounts.length && ['under', 'below', 'within', 'less than', 'er moddhe', 'er modhe', 'er mode', 'এর মধ্যে', 'মধ্যে', 'কম'].some((term) => normalized.includes(term))) return { max: amounts[0] };
  if (amounts.length && ['above', 'over', 'more than', 'er upor', 'er opor', 'এর উপরে', 'এর ওপর', 'এর বেশি'].some((term) => normalized.includes(term))) return { min: amounts[0] };
  return null;
};

export const searchMobileBuySellProducts = (query, rows = []) => {
  const normalizedQuery = normalizeMobileText(query);
  if (!normalizedQuery) return [];
  const priceRange = getPriceRange(query);
  const ramMatches = [...normalizedQuery.matchAll(/(\d+)\s*gb(?:\s*ram)?/g)].map((match) => match[1]);
  const wantsAll = normalizedQuery.includes('all') || normalizedQuery.includes('every') || normalizedQuery.includes('সব') || normalizedQuery.includes('সকল') || normalizedQuery.includes('database') || normalizedQuery.includes('ডাটাবেস');
  const stockTerms = normalizedQuery.includes('out of stock') || normalizedQuery.includes('স্টক নেই')
    ? ['out of stock']
    : normalizedQuery.includes('low stock') || normalizedQuery.includes('লো স্টক')
      ? ['low stock']
      : normalizedQuery.includes('in stock') || normalizedQuery.includes('available') || normalizedQuery.includes('স্টকে') || normalizedQuery.includes('স্টক এ')
        ? ['in stock', 'available']
        : [];
  const conditionTerms = ['excellent', 'good', 'new', 'used', 'like new'].filter((term) => normalizedQuery.includes(term));
    const ignoredTerms = new Set(['a', 'all', 'an', 'and', 'are', 'available', 'above', 'below', 'between', 'buy', 'can', 'condition', 'database', 'details', 'detail', 'do', 'does', 'every', 'for', 'full', 'give', 'good', 'has', 'have', 'how', 'in', 'is', 'less', 'like', 'low', 'mobile', 'model', 'more', 'new', 'of', 'out', 'phone', 'phones', 'phoneগুলো', 'ফোন', 'ফোনগুলো', 'মোবাইল', 'মোবাইলগুলো', 'price', 'ram', 'show', 'stock', 'tell', 'the', 'this', 'thousand', 'to', 'under', 'used', 'what', 'which', 'within', 'er', 'thake', 'theke', 'moddhe', 'modhe', 'mode', 'upar', 'upor', 'opor', 'ki', 'hobe', 'gula', 'ache', 'dekhao', 'সব', 'সম্পূর্ণ', 'দাও', 'দেখাও', 'দাম', 'কত', 'আছে', 'এর', 'মধ্যে', 'কোন', 'হাজার', 'টাকা', 'টাকার', 'টি', 'থেকে']);
    conditionTerms.forEach((term) => ignoredTerms.add(term));
  const terms = normalizedQuery.split(/\s+/).filter((term) => term.length > 1 && !ignoredTerms.has(term) && !/^\d+(?:[,.]\d+)?(?:gb|k)?$/.test(term) && !/^(?:হাজার|হাজারের|টাকা|টাকার|এর|মধ্যে|কোন|আছে|ফোন|ফোনগুলো|মোবাইল|মোবাইলগুলো|দেখাও|দাও|দাম|কত|সম্পূর্ণ|সব|টি|থেকে)$/.test(term));
  const modelTerms = terms.filter((term) => /[a-z0-9]/.test(term));

  const matches = rows.map((row, index) => {
    if (!row || typeof row !== 'object') return null;
    const fields = getMobileFields(row);
    const modelText = normalizeMobileText(fields.model);
    const allText = normalizeMobileText(Object.values(row).join(' '));
    const price = parsePrice(fields.price);
    const stockText = normalizeMobileText(fields.stock);
    const conditionText = normalizeMobileText(fields.condition);
    if (priceRange && (price === null || (priceRange.min !== undefined && price < priceRange.min) || (priceRange.max !== undefined && price > priceRange.max))) return null;
    if (ramMatches.length && !ramMatches.every((ram) => new RegExp(`(?:^|\\s)${ram}gb(?:$|\\s)`).test(normalizeMobileText(fields.ram)))) return null;
    if (stockTerms.length && !stockTerms.some((term) => stockText.includes(term))) return null;
    if (conditionTerms.length && !conditionTerms.some((term) => conditionText.includes(term))) return null;
    if (!wantsAll && modelTerms.length && !modelTerms.every((term) => modelText.includes(term))) return null;
    return { row, score: modelTerms.reduce((score, term) => score + (modelText.includes(term) ? 2 : allText.includes(term) ? 1 : 0), 0), index };
  }).filter(Boolean);

  return matches.sort((left, right) => {
    if (!priceRange) return right.score - left.score || left.index - right.index;
    const leftPrice = parsePrice(getMobileFields(left.row).price);
    const rightPrice = parsePrice(getMobileFields(right.row).price);
    if (leftPrice === null) return rightPrice === null ? left.index - right.index : 1;
    if (rightPrice === null) return -1;
    return leftPrice - rightPrice || left.index - right.index;
  }).map(({ row }) => row);
};

export const searchGoogleSheet = (query, rows = []) => {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) return [];
  if (isAllRowsQuery(normalizedQuery)) return rows.filter((row) => row && typeof row === 'object' && Object.values(row).some((value) => normalizeCellValue(value) !== ''));
  const searchTerms = getExpandedSearchTerms(normalizedQuery);
  const fieldMatch = normalizedQuery.match(/^([a-z]+)\s+(.+)$/);
  const fieldName = fieldMatch && rows.some((row) => row && typeof row === 'object' && Object.keys(row).some((key) => normalizeQuery(key) === fieldMatch[1])) ? fieldMatch[1] : '';
  if (fieldName) return rows.filter((row) => row && Object.entries(row).some(([key, value]) => normalizeQuery(key) === fieldName && normalizeQuery(normalizeCellValue(value)).includes(fieldMatch[2]))).slice(0, 20);
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object') return null;
    const values = Object.values(row).map((value) => normalizeQuery(normalizeCellValue(value)));
    const exactMatch = values.some((value) => value.includes(normalizedQuery));
    const score = exactMatch ? searchTerms.length + 1 : searchTerms.reduce((total, term) => total + (values.some((value) => value.includes(term)) ? 1 : 0), 0);
    return score > 0 ? { row, score, index } : null;
  }).filter(Boolean).sort((left, right) => right.score - left.score || left.index - right.index).slice(0, 20).map(({ row }) => row);
};

export const searchGoogleSheetWithConfidence = (query, rows = []) => {
  const normalizedQuery = normalizeQuery(query);
  const searchTerms = getExpandedSearchTerms(normalizedQuery);
  if (!normalizedQuery || !rows.length || !searchTerms.length) return { results: [], confidence: 0, matchedFields: [] };
  const ranked = rows.map((row, index) => {
    const entries = Object.entries(row || {});
    const matchedFields = entries.filter(([, value]) => searchTerms.some((term) => normalizeQuery(normalizeCellValue(value)).includes(term))).map(([key]) => key);
    const questionEntry = entries.find(([key]) => normalizeQuery(key) === 'question');
    const questionText = normalizeQuery(questionEntry?.[1] || '');
    const questionMatches = searchTerms.filter((term) => questionText.includes(term)).length;
    const valueMatches = searchTerms.filter((term) => entries.some(([, value]) => normalizeQuery(normalizeCellValue(value)).includes(term))).length;
    const score = questionMatches * 2 + valueMatches;
    return { row, score, matchedFields, index };
  }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score || left.index - right.index);
  if (!ranked.length) return { results: [], confidence: 0, matchedFields: [] };
  const confidence = Math.min(1, ranked[0].score / Math.max(2, searchTerms.length * 1.5));
  return confidence >= 0.35
    ? { results: ranked.slice(0, 20).map(({ row }) => row), confidence, matchedFields: ranked[0].matchedFields }
    : { results: [], confidence, matchedFields: ranked[0].matchedFields };
};

export const convertSheetRows = (values) => {
  if (!Array.isArray(values) || values.length === 0) return [];
  const headers = values[0].map((header, index) => ({ name: String(header || '').trim(), index })).filter(({ name }) => name);
  if (!headers.length) return [];
  return values.slice(1).map((row) => {
    const rowObject = {};
    headers.forEach(({ name, index }) => { rowObject[name] = row[index] ?? ''; });
    return rowObject;
  }).filter((row) => Object.values(row).some((value) => normalizeCellValue(value) !== ''));
};

const createJwt = ({ serviceAccountEmail, privateKey }) => {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const payload = encode({ iss: serviceAccountEmail, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign({ key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING, format: 'pem' });
  return `${header}.${payload}.${Buffer.from(signature).toString('base64url')}`;
};

const getAccessToken = async ({ serviceAccountEmail, privateKey }) => {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: createJwt({ serviceAccountEmail, privateKey }) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error_description || data?.error || 'Google OAuth token request failed.');
  return data.access_token;
};

export const getGoogleSheetRows = async (requestedSpreadsheetId) => {
  const { serviceAccountEmail, privateKey, apiKey } = getGoogleSheetConfig();
  const selectedSpreadsheetId = requestedSpreadsheetId?.trim() || '';
  if (!selectedSpreadsheetId) throw new Error('Mobile Buy/Sell Google Sheet is not configured. Please set MOBILE_BUY_SELL_SPREADSHEET_ID in the backend .env file.');
  const accessToken = serviceAccountEmail && privateKey ? await getAccessToken({ serviceAccountEmail, privateKey }) : '';
  const query = accessToken ? '' : `?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(selectedSpreadsheetId)}/values/A:ZZ${query}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Google Sheets request failed.');
  return convertSheetRows(Array.isArray(data?.values) ? data.values : []);
};

const sheetRowsCache = new Map();

export const getCachedGoogleSheetRows = async (spreadsheetId) => {
  const selectedSpreadsheetId = String(spreadsheetId || '').trim();
  if (!selectedSpreadsheetId) return [];
  const configuredTtlMs = Number(process.env.GOOGLE_SHEETS_CACHE_TTL_MS || 0);
  const ttlMs = Number.isFinite(configuredTtlMs) && configuredTtlMs > 0 ? configuredTtlMs : 0;
  const cached = sheetRowsCache.get(selectedSpreadsheetId);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  if (cached?.promise) return cached.promise;

  const promise = getGoogleSheetRows(selectedSpreadsheetId)
    .then((rows) => {
      sheetRowsCache.set(selectedSpreadsheetId, { rows, expiresAt: Date.now() + ttlMs });
      return rows;
    })
    .catch((error) => {
      sheetRowsCache.delete(selectedSpreadsheetId);
      throw error;
    });
  sheetRowsCache.set(selectedSpreadsheetId, { promise, expiresAt: 0 });
  return promise;
};

export const clearGoogleSheetRowsCache = () => {
  sheetRowsCache.clear();
};
