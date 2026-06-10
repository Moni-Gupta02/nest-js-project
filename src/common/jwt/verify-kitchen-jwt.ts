import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from './constants';

/** Verifies KMS staff JWTs (signed with KMS JWT_SECRET only). */
export function verifyKitchenJwt(token: string): jwt.JwtPayload | string {
  return jwt.verify(token, getJwtSecret());
}
