import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const session = await requireAuth();

  if (!session) {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 });
  }

  return NextResponse.json({
    isLoggedIn: true,
    user: {
      id: session.userId,
      externalId: session.externalId,
      name: session.userName,
    },
  });
}
