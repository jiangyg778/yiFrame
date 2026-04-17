/**
 * DEMO-ONLY in-memory user + session store.
 *
 * ⚠️ Absolutely not for production:
 *   - Data is lost on restart.
 *   - `sha256(password)` has no salt and no cost factor. Real systems must
 *     use bcrypt / argon2 with per-user salt.
 *   - No rate-limiting, no session rotation, no refresh token.
 *
 * This file exists only to prove the request-core + shared Header auth
 * loop inside the micro-frontend framework.
 */
import { createHash, randomUUID } from 'node:crypto';

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface DemoSession {
  id: string;
  userId: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

const usersByEmail = new Map<string, DemoUser>();
const usersById = new Map<string, DemoUser>();
const sessionsById = new Map<string, DemoSession>();

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function findUserByEmail(email: string): DemoUser | undefined {
  return usersByEmail.get(email.toLowerCase());
}

export function createUser(input: {
  email: string;
  password: string;
  name: string;
}): DemoUser {
  const email = input.email.toLowerCase();
  if (usersByEmail.has(email)) {
    const error = new Error('EMAIL_EXISTS');
    error.name = 'EmailExistsError';
    throw error;
  }
  const user: DemoUser = {
    id: randomUUID(),
    email,
    name: input.name,
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  usersByEmail.set(email, user);
  usersById.set(user.id, user);
  return user;
}

export function verifyPassword(user: DemoUser, password: string): boolean {
  return user.passwordHash === hashPassword(password);
}

export function createSession(userId: string): DemoSession {
  const session: DemoSession = {
    id: randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
  };
  sessionsById.set(session.id, session);
  return session;
}

export function resolveSession(
  sessionId: string | undefined | null
): { session: DemoSession; user: DemoUser } | null {
  if (!sessionId) return null;
  const session = sessionsById.get(sessionId);
  if (!session) return null;
  const user = usersById.get(session.userId);
  if (!user) return null;
  return { session, user };
}

export function destroySession(sessionId: string | undefined | null): void {
  if (!sessionId) return;
  sessionsById.delete(sessionId);
}

export function toPublicUser(user: DemoUser): PublicUser {
  return { id: user.id, email: user.email, name: user.name };
}
