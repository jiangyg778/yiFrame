import type { NextApiRequest, NextApiResponse } from 'next';

export const SESSION_COOKIE = 'miro_session';
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function readSessionCookie(req: NextApiRequest): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  const match = raw.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function baseAttributes(): string {
  // Dev: no `Secure`, so cookie works on http://localhost. Production builds
  // should layer on `Secure` when behind HTTPS (NODE_ENV === 'production').
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function setSessionCookie(res: NextApiResponse, sessionId: string): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; ${baseAttributes()}; Max-Age=${MAX_AGE_SECONDS}`
  );
}

export function clearSessionCookie(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${baseAttributes()}; Max-Age=0`);
}
