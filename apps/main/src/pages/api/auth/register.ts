import type { NextApiRequest, NextApiResponse } from 'next';
import { setSessionCookie } from '../../../lib/auth-cookie';
import { createSession, createUser, toPublicUser } from '../../../lib/auth-store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, password, name } = (req.body || {}) as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'email / password / name are required' });
  }

  try {
    const user = createUser({ email, password, name });
    // Auto-login after register: shorter flow, more realistic for a demo.
    const session = createSession(user.id);
    setSessionCookie(res, session.id);
    return res.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    if ((error as Error).message === 'EMAIL_EXISTS') {
      return res.status(409).json({ message: 'Email already registered' });
    }
    return res.status(500).json({ message: 'Register failed' });
  }
}
