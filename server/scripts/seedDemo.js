/**
 * Loads SIMULATED demo data. Every demo document has isDemo: true.
 *  - Re-running replaces earlier demo data (no duplicates) and never touches real records.
 *  - `npm run seed:demo:clean` removes demo data only.
 * Demo GPS points are stored with source "SIMULATED" and the UI labels them as such.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Vehicle from '../models/Vehicle.js';
import VehicleEntry from '../models/VehicleEntry.js';
import LocationHistory from '../models/LocationHistory.js';
import Geofence from '../models/Geofence.js';
import GeofenceEvent from '../models/GeofenceEvent.js';
import Alert from '../models/Alert.js';
import { getMaxParkingMinutes } from '../services/settingsService.js';
import { pointInPolygon } from '../utils/geo.js';

const C = { lat: Number(process.env.DEMO_CENTER_LAT) || 19.076, lng: Number(process.env.DEMO_CENTER_LNG) || 72.8777 };
const MIN = 60000;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr, i) => arr[i % arr.length];

const people = ['Rahul Patil', 'Sanjay Deshmukh', 'Amit Kulkarni', 'Priya Nair', 'Vikram Singh', 'Neha Joshi', 'Suresh Pawar', 'Anita More', 'Rohan Mehta', 'Kiran Shinde', 'Deepak Gawade', 'Meera Iyer', 'Imran Shaikh', 'Pooja Sawant', 'Manoj Yadav', 'Sunita Rane', 'Arjun Bhosale', 'Farhan Khan'];
const models = { Car: ['Maruti Swift', 'Hyundai Creta', 'Tata Nexon', 'Honda City'], Bike: ['Honda Activa', 'Royal Enfield Classic'], Truck: ['Tata 407', 'Ashok Leyland Dost'], Van: ['Mahindra Bolero Pickup', 'Maruti Eeco'], Bus: ['Eicher Skyline'] };
const types = ['Car', 'Truck', 'Bike', 'Van', 'Car', 'Bus', 'Car', 'Bike', 'Truck', 'Car', 'Van', 'Car', 'Bike', 'Truck', 'Car', 'Van', 'Car', 'Bus'];
const plates = types.map((_, i) => `MH43DM${String(1001 + i * 37).padStart(4, '0')}`);

const fence = [
  { lat: C.lat + 0.012, lng: C.lng - 0.014 },
  { lat: C.lat + 0.012, lng: C.lng + 0.014 },
  { lat: C.lat - 0.012, lng: C.lng + 0.014 },
  { lat: C.lat - 0.012, lng: C.lng - 0.014 },
];

const near = (spread = 0.008) => ({ lat: C.lat + rnd(-spread, spread), lng: C.lng + rnd(-spread, spread) });

/** Straight-line walk with small jitter, ending at `endTime`. */
function route(from, to, n, endTime, stepMin = 1) {
  return Array.from({ length: n }, (_, k) => {
    const t = k / (n - 1);
    return {
      lat: from.lat + (to.lat - from.lat) * t + rnd(-0.0001, 0.0001),
      lng: from.lng + (to.lng - from.lng) * t + rnd(-0.0001, 0.0001),
      accuracy: Math.round(rnd(6, 25)),
      recordedAt: new Date(endTime - (n - 1 - k) * stepMin * MIN),
    };
  });
}

async function removeDemo() {
  await Promise.all([
    Alert.deleteMany({ isDemo: true }),
    GeofenceEvent.deleteMany({ isDemo: true }),
    LocationHistory.deleteMany({ isDemo: true }),
    VehicleEntry.deleteMany({ isDemo: true }),
    Geofence.deleteMany({ isDemo: true }),
  ]);
  const r = await Vehicle.deleteMany({ isDemo: true });
  return r.deletedCount;
}

async function main() {
  await connectDB();
  const removed = await removeDemo();
  if (process.argv.includes('--clean')) {
    console.log(`Removed ${removed} demo vehicles and their demo records.`);
    return;
  }

  const maxMin = await getMaxParkingMinutes();
  const now = Date.now();

  // Skip plates that belong to real (non-demo) vehicles.
  const taken = new Set((await Vehicle.find({ regNumber: { $in: plates } }).select('regNumber').lean()).map((v) => v.regNumber));

  const geofence = await Geofence.create({ name: 'Main premises (DEMO)', description: 'Simulated demo boundary', polygon: fence, isDemo: true });
  const fenceKey = String(geofence._id);

  const vehicles = [];
  const entries = [];
  const history = [];
  const events = [];
  const alerts = [];

  types.forEach((type, i) => {
    const reg = plates[i];
    if (taken.has(reg)) return;
    const inside = i < 9;
    const overstayed = i < 3; // first three exceed the limit
    const v = new Vehicle({
      regNumber: reg,
      type,
      driverName: pick(people, i),
      driverContact: `+91 98${String(20000000 + i * 1234567).slice(0, 8)}`,
      model: pick(models[type], i),
      status: inside ? 'INSIDE' : 'OUTSIDE',
      isDemo: true,
    });

    // Older, completed sessions over the last 3 days (some longer than the limit).
    const sessions = 1 + (i % 3);
    for (let s = 0; s < sessions; s++) {
      const start = now - (s + 1) * 24 * 60 * MIN - rnd(0, 6 * 60) * MIN;
      const dur = Math.round(i % 5 === 0 && s === 0 ? maxMin + rnd(30, 90) : rnd(25, Math.min(180, maxMin - 20)));
      const loc = near();
      entries.push({
        vehicle: v._id, regNumber: reg, vehicleType: type, driverName: v.driverName, driverContact: v.driverContact,
        entryTime: new Date(start), exitTime: new Date(start + dur * MIN), durationMinutes: dur, status: 'COMPLETED',
        entryLocation: { ...loc, accuracy: 15 }, exitLocation: { ...near(), accuracy: 15 }, isDemo: true,
      });
      if (!inside && s === 0) { v.entryTime = new Date(start); v.exitTime = new Date(start + dur * MIN); }
    }

    if (inside) {
      const ago = overstayed ? maxMin + rnd(40, 240) : rnd(15, maxMin - 30);
      const entryTime = new Date(now - ago * MIN);
      const loc = near(0.006);
      v.entryTime = entryTime;
      v.location = { ...loc, accuracy: 18, updatedAt: new Date(now - 2 * MIN), isSimulated: true };
      entries.push({
        vehicle: v._id, regNumber: reg, vehicleType: type, driverName: v.driverName, driverContact: v.driverContact,
        entryTime, status: 'ACTIVE', entryLocation: { ...loc, accuracy: 18 }, isDemo: true,
      });
      v.geofenceState.set(fenceKey, true);
      if (overstayed) {
        alerts.push({
          type: 'OVERSTAY', severity: 'HIGH', vehicle: v._id, regNumber: reg, entryTime,
          durationMinutes: Math.floor(ago), isDemo: true,
          message: `${reg} has been parked for ${Math.floor(ago / 60)}h ${Math.floor(ago % 60)}m (limit ${Math.floor(maxMin / 60)}h ${maxMin % 60}m)`,
          _entryRef: reg,
        });
      }
    }
    vehicles.push(v);
  });

  // Simulated live tracking: vehicles 0-2 move inside the boundary; vehicle 3 drives out of it.
  const routes = [
    [0, near(0.004), near(0.004)],
    [1, near(0.004), near(0.004)],
    [2, near(0.004), near(0.004)],
    [3, { lat: C.lat + 0.004, lng: C.lng + 0.01 }, { lat: C.lat + 0.004, lng: C.lng + 0.026 }],
  ];
  for (const [idx, from, to] of routes) {
    const v = vehicles.find((x) => x.regNumber === plates[idx]);
    if (!v) continue;
    const pts = route(from, to, 30, now - 30000, 1);
    pts.forEach((p) => history.push({ vehicle: v._id, ...p, source: 'SIMULATED', isDemo: true }));
    const last = pts[pts.length - 1];
    v.location = { lat: last.lat, lng: last.lng, accuracy: last.accuracy, updatedAt: last.recordedAt, isSimulated: true };
    v.tracking = { active: true, startedAt: pts[0].recordedAt };
    const insideNow = pointInPolygon(last.lat, last.lng, fence);
    v.geofenceState.set(fenceKey, insideNow);
    if (idx === 3) {
      v.status = 'INSIDE';
      if (!entries.some((e) => e.vehicle === v._id && e.status === 'ACTIVE')) {
        entries.push({ vehicle: v._id, regNumber: v.regNumber, vehicleType: v.type, driverName: v.driverName, driverContact: v.driverContact, entryTime: new Date(now - 50 * MIN), status: 'ACTIVE', entryLocation: { ...from, accuracy: 12 }, isDemo: true });
        v.entryTime = new Date(now - 50 * MIN);
      }
      const exitPoint = pts.find((p) => !pointInPolygon(p.lat, p.lng, fence));
      if (exitPoint) {
        events.push({ geofence: geofence._id, geofenceName: geofence.name, vehicle: v._id, regNumber: v.regNumber, type: 'EXIT', location: { lat: exitPoint.lat, lng: exitPoint.lng }, occurredAt: exitPoint.recordedAt, isDemo: true });
        alerts.push({ type: 'GEOFENCE_EXIT', severity: 'MEDIUM', vehicle: v._id, regNumber: v.regNumber, message: `${v.regNumber} left geofence "${geofence.name}"`, isDemo: true });
      }
      events.push({ geofence: geofence._id, geofenceName: geofence.name, vehicle: v._id, regNumber: v.regNumber, type: 'ENTER', location: from, occurredAt: new Date(now - 50 * MIN), isDemo: true });
    }
  }

  await Vehicle.insertMany(vehicles);
  const savedEntries = await VehicleEntry.insertMany(entries);
  const activeByReg = new Map(savedEntries.filter((e) => e.status === 'ACTIVE').map((e) => [e.regNumber, e._id]));
  await LocationHistory.insertMany(history);
  if (events.length) await GeofenceEvent.insertMany(events);
  await Alert.insertMany(alerts.map(({ _entryRef, ...a }) => ({ ...a, ...(_entryRef ? { entry: activeByReg.get(_entryRef) } : {}) })));

  console.log(`Demo data loaded (replaced ${removed} earlier demo vehicles):`);
  console.log(`  vehicles: ${vehicles.length}, entries: ${entries.length}, GPS points: ${history.length} (SIMULATED), alerts: ${alerts.length}, geofence events: ${events.length}`);
  if (taken.size) console.log(`  skipped ${taken.size} plate(s) that already belong to real vehicles`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
