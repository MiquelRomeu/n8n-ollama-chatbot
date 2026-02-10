import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST() {
  const session = await getSession();

  if (session.sessionId) {
    await pool.query(
      `UPDATE chatbot_sessions SET is_active = FALSE, logged_out_at = NOW()
       WHERE id = $1`,
      [session.sessionId]
    );
  }

  session.destroy();

  return NextResponse.json({ success: true });
}
