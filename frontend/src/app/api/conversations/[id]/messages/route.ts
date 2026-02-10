import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = parseInt(id);

  const convCheck = await pool.query(
    `SELECT id FROM chatbot_conversations
     WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`,
    [conversationId, session.userId]
  );

  if (convCheck.rows.length === 0) {
    return NextResponse.json({ error: 'Conversacion no encontrada' }, { status: 404 });
  }

  const result = await pool.query(
    `SELECT id, role, content, tokens_used, created_at
     FROM chatbot_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId]
  );

  return NextResponse.json({ messages: result.rows });
}
