import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const result = await pool.query(
    `SELECT id, title, created_at, updated_at
     FROM chatbot_conversations
     WHERE user_id = $1 AND is_deleted = FALSE
     ORDER BY updated_at DESC`,
    [session.userId]
  );

  return NextResponse.json({ conversations: result.rows });
}

export async function POST() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const result = await pool.query(
    `INSERT INTO chatbot_conversations (user_id, title)
     VALUES ($1, 'Nueva conversacion')
     RETURNING id, title, created_at, updated_at`,
    [session.userId]
  );

  return NextResponse.json({ conversation: result.rows[0] });
}
