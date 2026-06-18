import jwt from 'jsonwebtoken';

/**
 * ACCESS TOKEN
 * ------------
 * Short-lived token sent in the Authorization header (Bearer token).
 * Used to authenticate API requests. Expires quickly (15s for testing)
 * so that even if stolen, the window of abuse is small.
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '15s',
  });
};

/**
 * REFRESH TOKEN
 * -------------
 * Long-lived token stored in an HttpOnly cookie.
 * Used only to obtain a new access token when the current one expires.
 * Never sent in response body or localStorage on the client.
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};
