import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { message, conversation_id } = await request.json();

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Mensaje vacio' }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/chat';

  const body: Record<string, unknown> = {
    user_id: session.externalId,
    message: message.trim(),
  };

  if (conversation_id) {
    body.conversation_id = conversation_id;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('n8n webhook error:', response.status, text);
      return NextResponse.json(
        { error: 'Error al procesar el mensaje' },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error connecting to n8n:', error);
    return NextResponse.json(
      { error: 'No se pudo conectar con el servicio de chat' },
      { status: 503 }
    );
  }
}
