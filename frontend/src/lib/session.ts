import { SessionOptions } from 'iron-session';

export interface SessionData {
  userId?: number;
  externalId?: string;
  userName?: string;
  sessionId?: number;
  isLoggedIn?: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'chatbot-session',
  cookieOptions: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24,
  },
};
