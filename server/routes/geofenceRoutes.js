import { Router } from 'express';
import { listGeofences, createGeofence, updateGeofence, deleteGeofence, listGeofenceEvents } from '../controllers/geofenceController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { geofenceSchema } from '../utils/schemas.js';

const router = Router();
router.use(protect);
router.get('/', listGeofences);
router.get('/events', listGeofenceEvents);
router.post('/', authorize('ADMIN'), validate(geofenceSchema), createGeofence);
router.put('/:id', authorize('ADMIN'), validate(geofenceSchema), updateGeofence);
router.delete('/:id', authorize('ADMIN'), deleteGeofence);
export default router;
