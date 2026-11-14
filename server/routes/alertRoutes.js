import { Router } from 'express';
import { listAlerts, resolveAlert } from '../controllers/alertController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', listAlerts);
router.patch('/:id/resolve', authorize('ADMIN'), resolveAlert);
export default router;
