import { NextRequest } from 'next/server';
import { verifyToken, JwtPayload } from './auth';
import { UserRole } from '../app/generated/prisma/client';

export { UserRole };

export function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

export function requireAuth(req: NextRequest): JwtPayload {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new AuthError('Unauthorized — no token provided', 401);
  }
  try {
    return verifyToken(token);
  } catch {
    throw new AuthError('Unauthorized — invalid or expired token', 401);
  }
}

export function requireRole(req: NextRequest, ...roles: UserRole[]): JwtPayload {
  const payload = requireAuth(req);
  if (!roles.includes(payload.role)) {
    throw new AuthError(`Forbidden — requires one of: ${roles.join(', ')}`, 403);
  }
  return payload;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function handleAuthError(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.statusCode });
  }
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
