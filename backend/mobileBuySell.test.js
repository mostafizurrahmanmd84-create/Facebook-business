import test from 'node:test';
import assert from 'node:assert/strict';

import { formatMobileProductRows, searchMobileBuySellProducts } from './googleSheets.js';

const rows = [
  { Date: '2026-08-01', 'Brand + Model': 'iPhone 15', 'Storage + RAM': '128GB + 8GB', 'Physical Condition': 'Excellent', Price: '৳73,000', 'Product Stock': 'In Stock' },
  { Date: '2026-08-02', 'Brand + Model': 'Samsung Galaxy A25 5G', 'Storage + RAM': '128GB + 8GB', 'Physical Condition': 'Excellent', Price: '29,500', 'Product Stock': 'Low Stock' },
  { Date: '2026-08-03', 'Brand + Model': 'Samsung Galaxy A15', 'Storage + RAM': '128GB + 6GB', 'Physical Condition': 'Good', Price: '20,500', 'Product Stock': 'In Stock' }
];

const rangeRows = [
  { 'Brand + Model': 'Below Range', 'Storage + RAM': '128GB + 4GB', 'Physical Condition': 'Good', Price: '৳19,999', 'Product Stock': 'In Stock' },
  { 'Brand + Model': 'Upper Match', 'Storage + RAM': '256GB + 8GB', 'Physical Condition': 'Excellent', Price: '৳ 50,000', 'Product Stock': 'In Stock' },
  { 'Brand + Model': 'Lower Match', 'Storage + RAM': '128GB + 8GB', 'Physical Condition': 'Excellent', Price: '20,000', 'Product Stock': 'In Stock' },
  { 'Brand + Model': 'Middle Match', 'Storage + RAM': '256GB + 8GB', 'Physical Condition': 'Good', Price: '৳35,000', 'Product Stock': 'Low Stock' },
  { 'Brand + Model': 'Above Range', 'Storage + RAM': '512GB + 12GB', 'Physical Condition': 'New', Price: '50,001', 'Product Stock': 'In Stock' }
];

test('searches mobile products by model and price range', () => {
  assert.deepEqual(searchMobileBuySellProducts('iPhone 15 এর দাম কত?', rows), [rows[0]]);
  assert.deepEqual(searchMobileBuySellProducts('৩০ হাজার টাকার মধ্যে কোন ফোন আছে?', rows), [rows[2], rows[1]]);
  assert.deepEqual(searchMobileBuySellProducts('৩০-৫০ হাজারের Samsung', rows), []);
});

test('searches mobile products by RAM, stock, condition, and all products', () => {
  assert.deepEqual(searchMobileBuySellProducts('8GB RAM-এর ফোন দেখাও', rows), [rows[0], rows[1]]);
  assert.deepEqual(searchMobileBuySellProducts('কোন ফোন Low Stock?', rows), [rows[1]]);
  assert.deepEqual(searchMobileBuySellProducts('Excellent condition-এর ফোনগুলো দেখাও', rows), [rows[0], rows[1]]);
  assert.deepEqual(searchMobileBuySellProducts('এই database-এর সব mobile দেখাও', rows), rows);
});

test('filters inclusive multilingual price ranges and sorts matches by price', () => {
  const expected = [rangeRows[2], rangeRows[3], rangeRows[1]];
  assert.deepEqual(searchMobileBuySellProducts('20k thake 50k mode ki ki phone hobe?', rangeRows), expected);
  assert.deepEqual(searchMobileBuySellProducts('২০ হাজার থেকে ৫০ হাজার টাকার মধ্যে কোন কোন ফোন আছে?', rangeRows), expected);
  assert.deepEqual(searchMobileBuySellProducts('20k to 50k phones', rangeRows), expected);
  assert.deepEqual(searchMobileBuySellProducts('show phones between 20000 and 50000', rangeRows), expected);
  assert.deepEqual(searchMobileBuySellProducts('20k-50k er moddhe phone gula dekhao', rangeRows), expected);
});

test('supports one-sided price limits', () => {
  assert.deepEqual(searchMobileBuySellProducts('50000 er moddhe ki ki phone ache?', rangeRows), [rangeRows[0], rangeRows[2], rangeRows[3], rangeRows[1]]);
  assert.deepEqual(searchMobileBuySellProducts('30000 er upor phone gula dekhao', rangeRows), [rangeRows[3], rangeRows[1], rangeRows[4]]);
});

test('formats mobile product results with the required English field labels', () => {
  assert.deepEqual(formatMobileProductRows([rows[0]]), [{
    'Brand + Model': 'iPhone 15',
    'Storage + RAM': '128GB + 8GB',
    'Physical Condition': 'Excellent',
    Price: '৳73,000',
    'Product Stock': 'In Stock'
  }]);
});