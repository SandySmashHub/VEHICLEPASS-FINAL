import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ items: users.map((u) => u.toSafeJSON()) });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create({ ...req.body, email: req.body.email.toLowerCase() });
  res.status(201).json(user.toSafeJSON());
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');
  const { password, ...rest } = req.body;
  if (String(user._id) === String(req.user._id) && (rest.active === false || (rest.role && rest.role !== 'ADMIN'))) {
    throw new ApiError(400, 'You cannot disable or demote your own account');
  }
  if (rest.email) rest.email = rest.email.toLowerCase();
  Object.assign(user, rest);
  if (password) user.password = password;
  await user.save();
  res.json(user.toSafeJSON());
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ message: 'User deleted' });
});
