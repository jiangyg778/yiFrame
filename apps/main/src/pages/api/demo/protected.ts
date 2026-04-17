import type { NextApiRequest, NextApiResponse } from 'next';
import { readSessionCookie } from '../../../lib/auth-cookie';
import { resolveSession, toPublicUser } from '../../../lib/auth-store';

/**
 * Extra protected endpoint used by sub-app `AuthDemo` to prove that
 * request-core actually carries the session cookie across apps.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = resolveSession(readSessionCookie(req));
  if (!ctx) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  return res.status(200).json({
    secret: `Hello ${ctx.user.name}, this payload is only visible to authenticated users.`,
    viewedBy: toPublicUser(ctx.user),
    serverTime: new Date().toISOString(),
  });
}
