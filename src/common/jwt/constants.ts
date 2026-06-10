/** Read at runtime so dotenv is loaded before the value is used. */
export const getJwtSecret = (): string => {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

export const jwtConstants = {
  get secret() {
    return getJwtSecret();
  },
};
