import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email, wrong password and disabled account.
  if (!user || !user.active || !(await user.comparePassword(req.body.password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: signToken(user), user: user.toSafeJSON() });
});

export const me = asyncHandler(async (req, res) => res.json({ user: req.user.toSafeJSON() }));
