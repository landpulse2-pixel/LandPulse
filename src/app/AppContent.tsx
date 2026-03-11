'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Header } from '@/components/landpulse/Header';
import { WorldMap } from '@/components/landpulse/WorldMap';
import { Dashboard } from '@/components/landpulse/Dashboard';
import { Shop } from '@/components/landpulse/Shop';
import { MiniGamesPanel } from '@/components/landpulse/MiniGamesPanel';
import { LandingPage } from '@/components/landpulse/LandingPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        <span className="text-muted-foreground">Chargement de LandPulse...</span>
      </div>
    </div>
  );
}

export function AppContent() {
  const isConnected = useGameStore((state) => state.isConnected);
  const activeTab = useGameStore((state) => state.activeTab);
  const setUser = useGameStore((state) => state.setUser);
  const setConnected = useGameStore((state) => state.setConnected);
  const setUserParcels = useGameStore((state) => state.setUserParcels);
  const setBuildings = useGameStore((state) => state.setBuildings);
  
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowApp, setShouldShowApp] = useState(false);

  // Check for stored session on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        let storedData = null;
        try {
          storedData = localStorage.getItem('landpulse-storage');
        } catch (e) {
          console.log('localStorage not available:', e);
        }
        
        if (storedData) {
          const parsed = JSON.parse(storedData);
          const storedWallet = parsed?.state?.walletAddress;
          
          if (storedWallet && parsed?.state?.isConnected) {
            console.log('Found stored wallet:', storedWallet);
            
            const response = await fetch(`/api/user?wallet=${storedWallet}`);
            const data = await response.json();
            
            if (data.user) {
              setUser(data.user);
              setConnected(true, storedWallet);
              
              try {
                const parcelsResponse = await fetch(`/api/parcels?wallet=${storedWallet}`);
                const parcelsData = await parcelsResponse.json();
                setUserParcels(parcelsData.parcels || []);
              } catch (e) {
                console.error('Error fetching parcels:', e);
              }
              
              try {
                const buildingsResponse = await fetch(`/api/buildings?wallet=${storedWallet}`);
                const buildingsData = await buildingsResponse.json();
                setBuildings(buildingsData.buildings || []);
              } catch (e) {
                console.error('Error fetching buildings:', e);
              }
              
              setShouldShowApp(true);
            } else {
              try {
                localStorage.removeItem('landpulse-storage');
              } catch (e) {}
            }
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, [setUser, setConnected, setUserParcels, setBuildings]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (shouldShowApp || isConnected) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex flex-col">
          <Header />
          
          <main className="flex-1 container mx-auto px-4 py-6">
            {activeTab === 'map' && (
              <ErrorBoundary>
                <WorldMap />
              </ErrorBoundary>
            )}
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'shop' && <Shop />}
            {activeTab === 'events' && <MiniGamesPanel />}
          </main>

          <footer className="py-4 px-4 border-t border-purple-500/20">
            <div className="container mx-auto flex items-center justify-between text-xs text-muted-foreground">
              <span>LandPulse Beta • Phase 1</span>
              <span>Built on Solana</span>
            </div>
          </footer>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <LandingPage />
    </ErrorBoundary>
  );
}
