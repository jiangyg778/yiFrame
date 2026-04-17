import type { NextApiRequest, NextApiResponse } from 'next';
import { readSessionCookie } from '../../../lib/auth-cookie';
import { resolveSession, toPublicUser } from '../../../lib/auth-store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = resolveSession(readSessionCookie(req));
  if (!ctx) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  return res.status(200).json({ user: toPublicUser(ctx.user) });
}
