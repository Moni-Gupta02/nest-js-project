import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/profile', authenticate, getProfile);

export default router;
