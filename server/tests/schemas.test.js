import test from 'node:test';
import assert from 'node:assert/strict';
import { entrySchema, locationSchema, geofenceSchema, nearbyQuery } from '../utils/schemas.js';

const base = { regNumber: ' mh43-ab 1234 ', type: 'Car', driverName: 'Rahul Patil', driverContact: '+91 98765 43210' };

test('entry: registration number is normalised', () => {
  const r = entrySchema.parse(base);
  assert.equal(r.regNumber, 'MH43AB1234');
  assert.equal(r.model, '');
});

test('entry: rejects bad plate, type, contact and out-of-range GPS', () => {
  assert.equal(entrySchema.safeParse({ ...base, regNumber: 'A!' }).success, false);
  assert.equal(entrySchema.safeParse({ ...base, type: 'Spaceship' }).success, false);
  assert.equal(entrySchema.safeParse({ ...base, driverContact: 'call me' }).success, false);
  assert.equal(entrySchema.safeParse({ ...base, location: { lat: 91, lng: 0 } }).success, false);
  assert.equal(entrySchema.safeParse({ ...base, location: { lat: 19, lng: 72.8 } }).success, true);
});

test('location: validates id and coordinates', () => {
  const id = 'a'.repeat(24);
  assert.equal(locationSchema.safeParse({ vehicleId: id, lat: 10, lng: 200 }).success, false);
  assert.equal(locationSchema.safeParse({ vehicleId: 'nope', lat: 10, lng: 20 }).success, false);
  assert.equal(locationSchema.safeParse({ vehicleId: id, lat: 10, lng: 20, accuracy: 12, speed: null }).success, true);
});

test('geofence needs at least 3 points', () => {
  const two = [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }];
  assert.equal(geofenceSchema.safeParse({ name: 'Yard', polygon: two }).success, false);
  assert.equal(geofenceSchema.safeParse({ name: 'Yard', polygon: [...two, { lat: 3, lng: 1 }] }).success, true);
});

test('nearby query coerces strings and applies the default radius', () => {
  const r = nearbyQuery.parse({ lat: '19.1', lng: '72.9' });
  assert.deepEqual(r, { lat: 19.1, lng: 72.9, radiusKm: 5 });
  assert.equal(nearbyQuery.safeParse({ lat: '19.1', lng: '72.9', radiusKm: '500' }).success, false);
});
