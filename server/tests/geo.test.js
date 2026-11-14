import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, pointInPolygon } from '../utils/geo.js';

const square = [
  { lat: 1, lng: 1 }, { lat: 1, lng: 3 }, { lat: -1, lng: 3 }, { lat: -1, lng: 1 },
];

test('pointInPolygon: inside, outside and far away', () => {
  assert.equal(pointInPolygon(0, 2, square), true);
  assert.equal(pointInPolygon(0, 5, square), false);
  assert.equal(pointInPolygon(10, 2, square), false);
});

test('pointInPolygon: concave shape', () => {
  const L = [{ lat: 0, lng: 0 }, { lat: 0, lng: 4 }, { lat: 2, lng: 4 }, { lat: 2, lng: 2 }, { lat: 4, lng: 2 }, { lat: 4, lng: 0 }];
  assert.equal(pointInPolygon(1, 1, L), true);
  assert.equal(pointInPolygon(3, 1, L), true);
  assert.equal(pointInPolygon(3, 3, L), false); // the notch
});

test('haversineKm: zero distance and a known pair', () => {
  assert.equal(haversineKm({ lat: 10, lng: 20 }, { lat: 10, lng: 20 }), 0);
  // 1 degree of latitude is about 111.2 km
  const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(Math.abs(d - 111.19) < 0.3, `got ${d}`);
});
