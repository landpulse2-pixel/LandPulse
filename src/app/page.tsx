'use client';

import { useSyncExternalStore } from 'react';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        <span className="text-gray-400">Chargement de LandPulse...</span>
      </div>
    </div>
  );
}

// Empty subscribe function for useSyncExternalStore
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// Dynamically import AppContent with no SSR
const AppContent = dynamic(() => import('./AppContent').then(mod => mod.AppContent), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function Home() {
  // Only render on client
  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!isClient) {
    return <LoadingScreen />;
  }

  return <AppContent />;
}
