import { Request } from 'express';

/**
 * Headers nginx on staging-rms-api typically forwards to Nest (not sent to external JWT gate).
 * Do NOT use `Authorization` or `x-rms-authorization` on staging — nginx returns
 * `Please sign in to continue` before the app runs.
 */
const HEADER_NAMES = [
  'authorization',
  'access-token',
  'token',
  'rms-token',
  'x-rms-authorization',
  'x-access-token',
] as const;

const headerValue = (req: Request, name: string): string | undefined => {
  const raw = req.headers[name];
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
};

export function extractBearerTokenFromRequest(req: Request): string | undefined {
  for (const name of HEADER_NAMES) {
    const value = headerValue(req, name);
    if (!value?.trim()) continue;

    const trimmed = value.trim();
    const space = trimmed.indexOf(' ');
    if (space === -1) {
      return trimmed;
    }

    const scheme = trimmed.slice(0, space);
    const token = trimmed.slice(space + 1).trim();
    if (/^Bearer$/i.test(scheme) && token) {
      return token;
    }
    if (!/^Bearer$/i.test(scheme) && trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

/** Ensures `req.headers.authorization` is set for legacy guard branches. */
export function normalizeAuthorizationHeader(req: Request, token: string): void {
  if (!headerValue(req, 'authorization')) {
    req.headers.authorization = `Bearer ${token}`;
  }
}
