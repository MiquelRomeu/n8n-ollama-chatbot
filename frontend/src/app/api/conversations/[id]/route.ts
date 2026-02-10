import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = parseInt(id);

  const result = await pool.query(
    `UPDATE chatbot_conversations
     SET is_deleted = TRUE, deleted_at = NOW()
     WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [conversationId, session.userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Conversacion no encontrada' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
