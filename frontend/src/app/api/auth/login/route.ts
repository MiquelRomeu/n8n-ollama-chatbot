import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email y contrasena son obligatorios' },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT id, external_id, name, password_hash
       FROM chatbot_users
       WHERE email = $1 AND is_active = TRUE`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales invalidas' }, { status: 401 });
    }

    await pool.query(
      `UPDATE chatbot_sessions SET is_active = FALSE, logged_out_at = NOW()
       WHERE user_id = $1 AND is_active = TRUE`,
      [user.id]
    );

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
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
