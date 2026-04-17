import type { NextApiRequest, NextApiResponse } from 'next';
import { setSessionCookie } from '../../../lib/auth-cookie';
import {
  createSession,
  findUserByEmail,
  toPublicUser,
  verifyPassword,
} from '../../../lib/auth-store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password } = (req.body || {}) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ message: 'email / password are required' });
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(user, password)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const session = createSession(user.id);
  setSessionCookie(res, session.id);
  return res.status(200).json({ user: toPublicUser(user) });
}
