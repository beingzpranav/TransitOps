import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRole } from '../app/generated/prisma/client';

const JWT_SECRET = process.env.JWT_SECRET ?? 'transitops-dev-secret-change-in-prod';
const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
