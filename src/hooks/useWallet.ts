'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isPhantomInstalled,
  getPhantomProvider,
  createSimulatedWallet,
  truncateAddress,
  saveWalletAddress,
  getSavedWalletAddress,
  clearSavedWalletAddress,
  type WalletAdapter,
} from '@/lib/solana';
import { useGameStore } from '@/store/gameStore';

export function useWallet() {
  const [provider, setProvider] = useState<WalletAdapter | null>(null);
  const [isPhantomAvailable, setIsPhantomAvailable] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { isConnected, walletAddress, setConnected, setUser } = useGameStore();

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const phantomInstalled = isPhantomInstalled();
      setIsPhantomAvailable(phantomInstalled);

      if (phantomInstalled) {
        const phantomProvider = getPhantomProvider();
        if (phantomProvider) {
          setProvider(phantomProvider);

          // Auto-reconnect if previously connected
          const savedAddress = getSavedWalletAddress();
          if (savedAddress && phantomProvider.connected && phantomProvider.publicKey) {
            const address = phantomProvider.publicKey.toString();
            setConnected(true, address);
          }
        }
      } else {
        // Use simulated wallet for development
        setProvider(createSimulatedWallet());
      }
    };

    init();
  }, [setConnected]);

  // Listen for Phantom events
  useEffect(() => {
    if (!provider || !isPhantomAvailable) return;

    const handleConnect = () => {
      if (provider.publicKey) {
        const address = provider.publicKey.toString();
        setConnected(true, address);
        saveWalletAddress(address);
      }
    };

    const handleDisconnect = () => {
      setConnected(false);
      setUser(null);
      clearSavedWalletAddress();
    };

    // Check if phantom provider has event listeners
    const solana = (window as unknown as { solana?: { on?: (event: string, handler: () => void) => void } }).solana;
    if (solana?.on) {
      solana.on('connect', handleConnect);
      solana.on('disconnect', handleDisconnect);
    }

    return () => {
      // Cleanup listeners if needed
    };
  }, [provider, isPhantomAvailable, setConnected, setUser]);

  const connect = useCallback(async () => {
    if (!provider) return;

    setIsConnecting(true);
    try {
      await provider.connect();

      if (provider.publicKey) {
        const address = provider.publicKey.toString();
        setConnected(true, address);
        saveWalletAddress(address);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [provider, setConnected]);

  const disconnect = useCallback(async () => {
    if (!provider) return;

    try {
      await provider.disconnect();
      setConnected(false);
      setUser(null);
      clearSavedWalletAddress();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, [provider, setConnected, setUser]);

  return {
    isConnected,
    walletAddress,
    truncatedAddress: walletAddress ? truncateAddress(walletAddress) : null,
    isPhantomAvailable,
    isConnecting,
    connect,
    disconnect,
  };
}
