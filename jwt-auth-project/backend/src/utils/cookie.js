/**
 * HttpOnly Cookie Options for Refresh Token
 * -----------------------------------------
 * httpOnly: true  → JavaScript cannot read the cookie (prevents XSS token theft)
 * secure: true    → Cookie only sent over HTTPS in production
 * sameSite: 'lax' → CSRF protection while allowing top-level navigation
 * maxAge: 7 days  → Matches refresh token expiry
 */
export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/api/auth',
};

export const clearRefreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
};
