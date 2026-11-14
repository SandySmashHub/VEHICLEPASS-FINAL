import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { postLocation, stopTracking, liveVehicles, nearbyVehicles, routeHistory } from '../controllers/trackingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { locationSchema, stopSchema, nearbyQuery, historyQuery } from '../utils/schemas.js';

const locationLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many location updates' } });

const router = Router();
router.use(protect, authorize('ADMIN', 'GUARD'));
router.post('/location', locationLimiter, validate(locationSchema), postLocation);
router.post('/stop', validate(stopSchema), stopTracking);
router.get('/live', liveVehicles);
router.get('/nearby', validate(nearbyQuery, 'query'), nearbyVehicles);
router.get('/history', validate(historyQuery, 'query'), routeHistory);
export default router;
