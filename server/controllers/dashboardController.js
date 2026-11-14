import Vehicle from '../models/Vehicle.js';
import VehicleEntry from '../models/VehicleEntry.js';
import Alert from '../models/Alert.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getMaxParkingMinutes } from '../services/settingsService.js';

export const getDashboard = asyncHandler(async (req, res) => {
  // Start of the client's local day (tzOffset = Date#getTimezoneOffset()).
  const offset = Number(req.query.tzOffset) || 0;
  const shifted = new Date(Date.now() - offset * 60000);
  shifted.setUTCHours(0, 0, 0, 0);
  const startOfDay = new Date(shifted.getTime() + offset * 60000);

  const maxParkingMinutes = await getMaxParkingMinutes();
  const cutoff = new Date(Date.now() - maxParkingMinutes * 60000);

  const [totalVehicles, inside, activeTracking, entriesToday, exitsToday, overstay, recent, alerts, openAlerts] = await Promise.all([
    Vehicle.countDocuments(),
    Vehicle.countDocuments({ status: 'INSIDE' }),
    Vehicle.countDocuments({ 'tracking.active': true }),
    VehicleEntry.countDocuments({ entryTime: { $gte: startOfDay } }),
    VehicleEntry.countDocuments({ exitTime: { $gte: startOfDay } }),
    VehicleEntry.countDocuments({ status: 'ACTIVE', entryTime: { $lt: cutoff } }),
    VehicleEntry.find().sort({ updatedAt: -1 }).limit(10).lean(),
    Alert.find({ resolved: false }).sort({ createdAt: -1 }).limit(6).populate('entry', 'status entryTime').lean(),
    Alert.countDocuments({ resolved: false }),
  ]);

  res.json({
    stats: { totalVehicles, inside, outside: totalVehicles - inside, activeTracking, entriesToday, exitsToday, overstay, openAlerts },
    maxParkingMinutes,
    recentActivity: recent.map((e) => ({
      _id: e._id,
      regNumber: e.regNumber,
      vehicleType: e.vehicleType,
      driverName: e.driverName,
      kind: e.status === 'ACTIVE' ? 'ENTRY' : 'EXIT',
      time: e.status === 'ACTIVE' ? e.entryTime : e.exitTime,
      durationMinutes: e.durationMinutes,
    })),
    recentAlerts: alerts,
  });
});
