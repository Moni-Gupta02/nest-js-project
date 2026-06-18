import {
  registerUser,
  loginUser,
  getUserProfile,
} from '../services/authService.js';
import { verifyRefreshToken, generateAccessToken } from '../utils/token.js';
import {
  refreshTokenCookieOptions,
  clearRefreshTokenCookieOptions,
} from '../utils/cookie.js';

/**
 * POST /api/auth/register
 * Create a new user account and return access token.
 * Refresh token is stored in HttpOnly cookie.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    const { user, accessToken, refreshToken } = await registerUser({
      name,
      email,
      password,
    });

    // Store refresh token in HttpOnly cookie — not accessible via JavaScript
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return access token.
 * Refresh token is stored in HttpOnly cookie.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const { user, accessToken, refreshToken } = await loginUser({
      email,
      password,
    });

    // HttpOnly cookie prevents XSS attacks from stealing the refresh token
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh-token
 * Read refresh token from HttpOnly cookie, verify it, and issue a new access token.
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found. Please log in again.',
      });
    }

    const decoded = verifyRefreshToken(token);
    const newAccessToken = generateAccessToken(decoded.userId);

    res.status(200).json({
      success: true,
      message: 'Access token refreshed',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      res.clearCookie('refreshToken', clearRefreshTokenCookieOptions);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please log in again.',
      });
    }
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Clear the refresh token HttpOnly cookie.
 */
export const logout = async (req, res) => {
  res.clearCookie('refreshToken', clearRefreshTokenCookieOptions);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * GET /api/auth/profile
 * Protected route — returns authenticated user's profile.
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await getUserProfile(req.user._id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
