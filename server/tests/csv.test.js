import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../utils/csv.js';

const cols = [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }];

test('toCsv quotes commas, quotes and newlines', () => {
  const csv = toCsv(cols, [{ a: 'x,y', b: 'say "hi"\nthere' }]);
  assert.equal(csv, 'A,B\r\n"x,y","say ""hi""\nthere"');
});

test('toCsv neutralises spreadsheet formulas but keeps negative numbers', () => {
  const csv = toCsv(cols, [{ a: '=SUM(A1)', b: -72.5 }]);
  assert.equal(csv, "A,B\r\n'=SUM(A1),-72.5");
});

test('toCsv writes dates as ISO and null as empty', () => {
  const csv = toCsv(cols, [{ a: new Date('2026-01-02T03:04:05Z'), b: null }]);
  assert.equal(csv, 'A,B\r\n2026-01-02T03:04:05.000Z,');
});
