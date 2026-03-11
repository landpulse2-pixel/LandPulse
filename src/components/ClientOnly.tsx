'use client';

import { useSyncExternalStore, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Empty subscribe function for useSyncExternalStore
const subscribe = () => () => {};

// Returns true only on client
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const isClient = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!isClient) {
    return fallback || null;
  }

  return <>{children}</>;
}
