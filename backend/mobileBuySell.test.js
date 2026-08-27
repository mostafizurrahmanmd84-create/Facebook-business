import test from 'node:test';
import assert from 'node:assert/strict';

import { searchMobileBuySellProducts } from './googleSheets.js';

const rows = [
  { Date: '2026-08-01', 'Brand + Model': 'iPhone 15', 'Storage + RAM': '128GB + 8GB', 'Physical Condition': 'Excellent', Price: '৳73,000', 'Product Stock': 'In Stock' },
  { Date: '2026-08-02', 'Brand + Model': 'Samsung Galaxy A25 5G', 'Storage + RAM': '128GB + 8GB', 'Physical Condition': 'Excellent', Price: '29,500', 'Product Stock': 'Low Stock' },
  { Date: '2026-08-03', 'Brand + Model': 'Samsung Galaxy A15', 'Storage + RAM': '128GB + 6GB', 'Physical Condition': 'Good', Price: '20,500', 'Product Stock': 'In Stock' }
];

test('searches mobile products by model and price range', () => {
  assert.deepEqual(searchMobileBuySellProducts('iPhone 15 এর দাম কত?', rows), [rows[0]]);
  assert.deepEqual(searchMobileBuySellProducts('৩০ হাজার টাকার মধ্যে কোন ফোন আছে?', rows), [rows[1], rows[2]]);
  assert.deepEqual(searchMobileBuySellProducts('৩০-৫০ হাজারের Samsung', rows), []);
});

test('searches mobile products by RAM, stock, condition, and all products', () => {
  assert.deepEqual(searchMobileBuySellProducts('8GB RAM-এর ফোন দেখাও', rows), [rows[0], rows[1]]);
  assert.deepEqual(searchMobileBuySellProducts('কোন ফোন Low Stock?', rows), [rows[1]]);
  assert.deepEqual(searchMobileBuySellProducts('Excellent condition-এর ফোনগুলো দেখাও', rows), [rows[0], rows[1]]);
  assert.deepEqual(searchMobileBuySellProducts('এই database-এর সব mobile দেখাও', rows), rows);
});