import { Router } from 'express';
import { getReport, reportVehicleOptions } from '../controllers/reportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('ADMIN'));
router.get('/vehicles', reportVehicleOptions);
router.get('/:type', getReport);
export default router;
