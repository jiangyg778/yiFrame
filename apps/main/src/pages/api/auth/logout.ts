import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSessionCookie, readSessionCookie } from '../../../lib/auth-cookie';
import { destroySession } from '../../../lib/auth-store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  destroySession(readSessionCookie(req));
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
