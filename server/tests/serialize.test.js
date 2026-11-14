import test from 'node:test';
import assert from 'node:assert/strict';
import { dateRange, escapeRegex, publicVehicle } from '../utils/serialize.js';

test('dateRange: date-only values use the client timezone and include the end day', () => {
  // IST: Date#getTimezoneOffset() === -330
  const r = dateRange('2026-03-01', '2026-03-01', -330);
  assert.equal(r.$gte.toISOString(), '2026-02-28T18:30:00.000Z');
  assert.equal(r.$lt.toISOString(), '2026-03-01T18:30:00.000Z');
});

test('dateRange: ISO timestamps pass through and bad input is ignored', () => {
  const r = dateRange('2026-03-01T10:00:00.000Z', undefined);
  assert.equal(r.$gte.toISOString(), '2026-03-01T10:00:00.000Z');
  assert.equal(dateRange('nonsense', undefined), null);
  assert.equal(dateRange(undefined, undefined), null);
});

test('escapeRegex escapes metacharacters', () => {
  assert.equal(escapeRegex('a.b*c'), 'a\\.b\\*c');
});

test('publicVehicle strips internal fields', () => {
  const v = publicVehicle({ _id: '1', regNumber: 'AB1234', geofenceState: { x: true }, __v: 0 });
  assert.deepEqual(v, { _id: '1', regNumber: 'AB1234' });
});
