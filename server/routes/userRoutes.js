import { Router } from 'express';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { userCreateSchema, userUpdateSchema } from '../utils/schemas.js';

const router = Router();
router.use(protect, authorize('ADMIN'));
router.get('/', listUsers);
router.post('/', validate(userCreateSchema), createUser);
router.put('/:id', validate(userUpdateSchema), updateUser);
router.delete('/:id', deleteUser);
export default router;
