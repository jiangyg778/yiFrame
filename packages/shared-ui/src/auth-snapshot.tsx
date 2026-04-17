import React, { createContext, useContext } from 'react';
import type { PublicUser } from './auth-client';

/**
 * Lightweight React context for the SSR-injected auth snapshot.
 *
 * This is intentionally not a full auth state container — it only carries
 * the initial user so that `AuthMenu` can render the correct first frame.
 * Live updates still flow through the event-bus (`auth:login` / `auth:logout`).
 */
const AuthSnapshotContext = createContext<PublicUser | null>(null);

export interface AuthSnapshotProviderProps {
  initialUser: PublicUser | null;
  children: React.ReactNode;
}

export function AuthSnapshotProvider({
  initialUser,
  children,
}: AuthSnapshotProviderProps) {
  return (
    <AuthSnapshotContext.Provider value={initialUser}>
      {children}
    </AuthSnapshotContext.Provider>
  );
}

export function useAuthSnapshot(): PublicUser | null {
  return useContext(AuthSnapshotContext);
}
