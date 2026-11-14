import LocationHistory from '../models/LocationHistory.js';
import Geofence from '../models/Geofence.js';
import GeofenceEvent from '../models/GeofenceEvent.js';
import Alert from '../models/Alert.js';
import { pointInPolygon } from '../utils/geo.js';
import { publicVehicle } from '../utils/serialize.js';
import { emit } from '../socket/index.js';

/**
 * Stores a GPS fix, updates the vehicle, checks geofence crossings and broadcasts to authorised sockets.
 * `track: true` marks the vehicle as actively tracked (used by the live tracking endpoint).
 */
export async function processLocation(vehicle, { lat, lng, accuracy, speed, source = 'GPS', userId }, { track = false } = {}) {
  const now = new Date();
  await LocationHistory.create({ vehicle: vehicle._id, lat, lng, accuracy, speed, source, recordedBy: userId, recordedAt: now });

  vehicle.location = { lat, lng, accuracy, updatedAt: now, isSimulated: source === 'SIMULATED' };
  if (track) {
    if (!vehicle.tracking.active) vehicle.tracking.startedAt = now;
    vehicle.tracking.active = true;
    vehicle.tracking.trackedBy = userId;
  }

  const fences = await Geofence.find({ active: true }).lean();
  for (const fence of fences) {
    const key = String(fence._id);
    const inside = pointInPolygon(lat, lng, fence.polygon);
    const previous = vehicle.geofenceState.get(key);
    // The first fix only sets the baseline; events fire on real boundary crossings.
    if (previous !== undefined && previous !== inside) {
      const type = inside ? 'ENTER' : 'EXIT';
      await GeofenceEvent.create({ geofence: fence._id, geofenceName: fence.name, vehicle: vehicle._id, regNumber: vehicle.regNumber, type, location: { lat, lng }, occurredAt: now });
      const alert = await Alert.create({
        type: `GEOFENCE_${type}`,
        severity: inside ? 'LOW' : 'MEDIUM',
        vehicle: vehicle._id,
        regNumber: vehicle.regNumber,
        message: `${vehicle.regNumber} ${inside ? 'entered' : 'left'} geofence "${fence.name}"`,
      });
      emit('alert:new', JSON.parse(JSON.stringify(alert)));
    }
    vehicle.geofenceState.set(key, inside);
  }

  await vehicle.save();
  emit('vehicle:location', publicVehicle(vehicle));
  return vehicle;
}
