import Alert from '../models/Alert.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { str } from '../utils/serialize.js';
import { emit } from '../socket/index.js';

export const listAlerts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const q = {};
  const resolved = str(req.query.resolved);
  const type = str(req.query.type);
  if (resolved === 'true' || resolved === 'false') q.resolved = resolved === 'true';
  if (['OVERSTAY', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT'].includes(type)) q.type = type;
  const [items, total] = await Promise.all([
    Alert.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('entry', 'status entryTime exitTime').lean(),
    Alert.countDocuments(q),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) || 1 });
});

export const resolveAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) throw new ApiError(404, 'Alert not found');
  if (!alert.resolved) {
    alert.set({ resolved: true, resolvedBy: req.user._id, resolvedAt: new Date() });
    await alert.save();
  }
  emit('alert:resolved', { _id: String(alert._id) });
  res.json(alert);
});
