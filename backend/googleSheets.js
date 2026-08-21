import crypto from 'node:crypto';

export const normalizeQuery = (query = '') => String(query ?? '').trim().toLowerCase();

export const getGoogleSheetConfig = () => ({
  spreadsheetId: process.env.GOOGLE_SHEET_ID?.trim() || '',
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '',
  privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim() || '',
  apiKey: process.env.GOOGLE_API_KEY?.trim() || ''
});

export const isGoogleSheetConfigured = () => {
  const { spreadsheetId, serviceAccountEmail, privateKey, apiKey } = getGoogleSheetConfig();
  return Boolean(spreadsheetId && (serviceAccountEmail && privateKey || apiKey));
};

const normalizeCellValue = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const searchStopWords = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'give', 'has', 'have',
  'how', 'is', 'me', 'of', 'please', 'show', 'student', 'students', 'tell',
  'the', 'their', 'what', 'which', 'who', 'with', 'id'
]);

const getSearchTerms = (query) => normalizeQuery(query)
  .replace(/[’']s\b/g, '')
  .replace(/[’']/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .split(/\s+/)
  .filter((term) => term.length > 1 && !searchStopWords.has(term));

export const searchGoogleSheet = (query, rows = []) => {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const searchTerms = getSearchTerms(normalizedQuery);
  const fieldMatch = normalizedQuery.match(/^([a-z]+)\s+(.+)$/);
  const fieldName = fieldMatch && rows.some((row) => row && typeof row === 'object'
    && Object.keys(row).some((key) => normalizeQuery(key) === fieldMatch[1]))
    ? fieldMatch[1]
    : '';
  const fieldValue = fieldName ? fieldMatch[2] : '';

  if (fieldName) {
    return rows.filter((row) => row && typeof row === 'object'
      && Object.entries(row).some(([key, value]) => normalizeQuery(key) === fieldName
        && normalizeQuery(normalizeCellValue(value)).includes(fieldValue)))
      .slice(0, 20);
  }

  const rankedRows = rows.map((row, index) => {
    if (!row || typeof row !== 'object') {
      return null;
    }

    const normalizedEntries = Object.entries(row).map(([key, value]) => ({
      key: normalizeQuery(key),
      value: normalizeQuery(normalizeCellValue(value))
    }));

    const exactMatch = normalizedEntries.some(({ key, value }) => {
      if (fieldName && key === fieldName && fieldValue) {
        return value.includes(fieldValue);
      }

      return value.includes(normalizedQuery);
    });

    if (exactMatch) {
      return { row, score: searchTerms.length + 1, index };
    }

    const score = searchTerms.reduce((total, term) => total + (normalizedEntries.some(({ value }) => value.includes(term)) ? 1 : 0), 0);
    return score > 0 ? { row, score, index } : null;
  }).filter(Boolean);

  return rankedRows
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 20)
    .map(({ row }) => row);
};

const convertSheetRows = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const headers = values[0].map((header) => String(header || '').trim()).filter(Boolean);
  if (!headers.length) {
    return [];
  }

  return values
    .slice(1)
    .map((row) => {
      const rowObject = {};
      headers.forEach((header, index) => {
        rowObject[header] = row[index] ?? '';
      });
      return rowObject;
    })
    .filter((row) => Object.values(row).some((value) => normalizeCellValue(value) !== ''));
};

const createJwt = ({ serviceAccountEmail, privateKey }) => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING,
    format: 'pem'
  });

  return `${header}.${payload}.${Buffer.from(signature).toString('base64url')}`;
};

const getAccessToken = async ({ serviceAccountEmail, privateKey }) => {
  const jwt = createJwt({ serviceAccountEmail, privateKey });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    const message = tokenData?.error_description || tokenData?.error || 'Google OAuth token request failed.';
    throw new Error(message);
  }

  return tokenData.access_token;
};

export const getGoogleSheetRows = async () => {
  const { spreadsheetId, serviceAccountEmail, privateKey, apiKey } = getGoogleSheetConfig();

  if (!spreadsheetId) {
    throw new Error('Google Sheets credentials are not configured. Please set GOOGLE_SHEET_ID in the backend .env file.');
  }

  if (serviceAccountEmail && privateKey) {
    const accessToken = await getAccessToken({ serviceAccountEmail, privateKey });

    const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/A:ZZ`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const sheetData = await sheetResponse.json();
    if (!sheetResponse.ok) {
      const message = sheetData?.error?.message || 'Google Sheets request failed.';
      throw new Error(message);
    }

    const values = Array.isArray(sheetData?.values) ? sheetData.values : [];
    return convertSheetRows(values);
  }

  if (apiKey) {
    const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/A:ZZ?key=${encodeURIComponent(apiKey)}`, {
      method: 'GET'
    });

    const sheetData = await sheetResponse.json();
    if (!sheetResponse.ok) {
      const message = sheetData?.error?.message || 'Google Sheets request failed.';
      throw new Error(message);
    }

    const values = Array.isArray(sheetData?.values) ? sheetData.values : [];
    return convertSheetRows(values);
  }

  throw new Error('Google Sheets credentials are not configured. Please set GOOGLE_SHEET_ID and either GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY or GOOGLE_API_KEY in the backend .env file.');
};
