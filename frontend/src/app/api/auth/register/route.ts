import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password || password.length < 6) {
    return NextResponse.json(
      { error: 'Nombre, email y contrasena (min 6 caracteres) son obligatorios' },
      { status: 400 }
    );
  }

  const externalId = `user-${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO chatbot_users (external_id, name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, external_id, name`,
      [externalId, name, email, passwordHash]
    );

    const user = result.rows[0];

    const sessionResult = await pool.query(
      `INSERT INTO chatbot_sessions (user_id) VALUES ($1) RETURNING id`,
      [user.id]
    );

    const session = await getSession();
    session.userId = user.id;
    session.externalId = user.external_id;
    session.userName = user.name;
    session.sessionId = sessionResult.rows[0].id;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true, user: { name: user.name } });
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return NextResponse.json({ error: 'El email ya esta registrado' }, { status: 409 });
    }
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
