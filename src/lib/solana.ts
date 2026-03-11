// Solana wallet utilities for LandPulse

export interface WalletAdapter {
  publicKey: { toString(): string } | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// Check if Phantom wallet is installed
export function isPhantomInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const solana = (window as unknown as { solana?: { isPhantom?: boolean } }).solana;
  return solana?.isPhantom === true;
}

// Get Phantom wallet provider
export function getPhantomProvider(): WalletAdapter | null {
  if (typeof window === 'undefined') return null;
  const solana = (window as unknown as { solana?: WalletAdapter & { isPhantom?: boolean } }).solana;
  if (solana?.isPhantom) {
    return {
      publicKey: solana.publicKey,
      connected: solana.connected,
      connect: async () => {
        await solana.connect();
      },
      disconnect: async () => {
        await solana.disconnect();
      },
    };
  }
  return null;
}

// Truncate wallet address for display
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Simulated wallet for development/testing
export function createSimulatedWallet(): WalletAdapter {
  let connected = false;
  let publicKey: { toString(): string } | null = null;

  // Generate a random wallet address for simulation
  const generateAddress = () => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '';
    for (let i = 0; i < 44; i++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return address;
  };

  return {
    get publicKey() {
      return publicKey;
    },
    get connected() {
      return connected;
    },
    async connect() {
      connected = true;
      publicKey = { toString: () => generateAddress() };
    },
    async disconnect() {
      connected = false;
      publicKey = null;
    },
  };
}

// Storage key for wallet connection
export const WALLET_STORAGE_KEY = 'landpulse_wallet_address';

// Save wallet address to localStorage
export function saveWalletAddress(address: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WALLET_STORAGE_KEY, address);
}

// Get saved wallet address from localStorage
export function getSavedWalletAddress(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WALLET_STORAGE_KEY);
}

// Clear saved wallet address
export function clearSavedWalletAddress(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WALLET_STORAGE_KEY);
}
