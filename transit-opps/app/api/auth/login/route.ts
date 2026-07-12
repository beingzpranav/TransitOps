import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid email or password format' }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Generic message — do not reveal whether email exists
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return Response.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
