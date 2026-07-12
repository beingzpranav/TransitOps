import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySetupToken, hashPassword } from '@/lib/auth';
import { z } from 'zod';

const setupPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = setupPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { token, password } = parsed.data;

    let payload;
    try {
      payload = verifySetupToken(token);
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Invalid or expired setup token. Please request a new setup link from your manager.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true, message: 'Password set successfully!' });
  } catch (err: any) {
    console.error('Password setup error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again later.' }, { status: 500 });
  }
}
