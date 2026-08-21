import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeQuery, searchGoogleSheet } from './googleSheets.js';

test('normalizeQuery trims and lowercases user search text', () => {
  assert.equal(normalizeQuery('  Karim   '), 'karim');
});

test('searchGoogleSheet matches case-insensitive values and limits results to 20', () => {
  const rows = [
    { ID: '001', Name: 'Rahim', Phone: '01711111111', Course: 'Web Development', Status: 'Active', Payment: 'Paid' },
    { ID: '002', Name: 'Karim', Phone: '01822222222', Course: 'AI', Status: 'Pending', Payment: 'Unpaid' },
    { ID: '003', Name: 'Nadia', Phone: '01933333333', Course: 'ML', Status: 'Active', Payment: 'Paid' }
  ];

  const results = searchGoogleSheet('karim', rows);
  assert.deepEqual(results, [rows[1]]);

  const manyRows = Array.from({ length: 25 }, (_, index) => ({
    ID: String(index + 1),
    Name: `Person ${index + 1}`,
    Course: 'Web',
    Status: 'Active',
    Payment: 'Paid'
  }));

  const limitedResults = searchGoogleSheet('Person', manyRows);
  assert.equal(limitedResults.length, 20);
});

test('searchGoogleSheet returns empty array when no record matches', () => {
  const rows = [
    { ID: '001', Name: 'Rahim', Phone: '01711111111', Course: 'Web Development', Status: 'Active', Payment: 'Paid' }
  ];

  assert.deepEqual(searchGoogleSheet('Missing Student', rows), []);
});

test('required sample queries match the expected rows', () => {
  const rows = [
    { ID: '001', Name: 'Rahim', Phone: '01711111111', Course: 'Web Development', Status: 'Active', Payment: 'Paid' },
    { ID: '002', Name: 'Karim', Phone: '01822222222', Course: 'AI', Status: 'Pending', Payment: 'Unpaid' }
  ];

  assert.deepEqual(searchGoogleSheet('Karim', rows), [rows[1]]);
  assert.deepEqual(searchGoogleSheet('01711111111', rows), [rows[0]]);
  assert.deepEqual(searchGoogleSheet('ID 002', rows), [rows[1]]);
  assert.deepEqual(searchGoogleSheet("What is Karim's status?", rows), [rows[1]]);
  assert.deepEqual(searchGoogleSheet('What is the status of student with ID 001?', rows), [rows[0]]);
  assert.deepEqual(searchGoogleSheet('Missing Person', rows), []);
});
