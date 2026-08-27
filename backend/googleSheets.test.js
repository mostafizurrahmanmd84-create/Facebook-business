import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeQuery, searchGoogleSheet, searchGoogleSheetWithConfidence } from './googleSheets.js';

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

test('FAQ questions match their Question and Answer rows in English and Bangla', () => {
  const rows = [
    { Question: 'What is the delivery charge?', Answer: 'Delivery charge is ৳60 inside Dhaka and ৳120 outside Dhaka.' },
    { Question: 'Do you deliver outside Dhaka?', Answer: 'Yes, we deliver outside Dhaka.' },
    { Question: 'Can I pay with bKash?', Answer: 'Yes, bKash payment is accepted.' },
    { Question: 'How long will delivery take?', Answer: 'Delivery takes 2 to 5 business days.' },
    { Question: 'ডেলিভারি চার্জ কত?', Answer: 'ঢাকার ভিতরে ডেলিভারি চার্জ ৳৬০ এবং ঢাকার বাইরে ৳১২০।' }
  ];

  assert.equal(searchGoogleSheet('What is the delivery charge?', rows)[0].Answer, rows[0].Answer);
  assert.equal(searchGoogleSheet('How much is delivery?', rows)[0].Answer, rows[0].Answer);
  assert.equal(searchGoogleSheet('ডেলিভারি চার্জ কত?', rows)[0].Answer, rows[4].Answer);
  assert.equal(searchGoogleSheet('Do you deliver outside Dhaka?', rows)[0].Answer, rows[1].Answer);
  assert.equal(searchGoogleSheet('Can I pay by bKash?', rows)[0].Answer, rows[2].Answer);
  assert.equal(searchGoogleSheet('How long does delivery take?', rows)[0].Answer, rows[3].Answer);
});

test('confidence-aware FAQ search supports Banglish synonyms and rejects weak matches', () => {
  const rows = [{ Question: 'What is the delivery charge?', Answer: 'Delivery charge is confirmed.' }];
  const matched = searchGoogleSheetWithConfidence('delivery fee koto', rows);

  assert.equal(matched.results[0], rows[0]);
  assert.ok(matched.confidence >= 0.35);
  assert.deepEqual(searchGoogleSheetWithConfidence('unrelated topic', rows).results, []);
});

test('matches pluralized fee queries against charge rows without a false no-data result', () => {
  const rows = [{ Question: 'What is the delivery charge?', Answer: 'Delivery charge is ৳60 inside Dhaka.' }];
  const matched = searchGoogleSheetWithConfidence('delivery fees', rows);

  assert.equal(matched.results[0], rows[0]);
  assert.ok(matched.confidence > 0);
});
