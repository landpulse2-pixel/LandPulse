'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGameStore } from '@/store/gameStore';
import { Wallet, LogOut, Copy, Check, ChevronDown, ExternalLink, Loader2, LayoutDashboard } from 'lucide-react';

export function WalletConnect() {
  // Use individual selectors to avoid hydration issues
  const isConnected = useGameStore((state) => state.isConnected);
  const walletAddress = useGameStore((state) => state.walletAddress);
  const setConnected = useGameStore((state) => state.setConnected);
  const setUser = useGameStore((state) => state.setUser);
  const user = useGameStore((state) => state.user);
  const setActiveTab = useGameStore((state) => state.setActiveTab);
  
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);

  // Hydration fix
  useEffect(() => {
    setMounted(true);
    
    // Check for referral code in URL
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
          setPendingReferralCode(refCode.toUpperCase());
          console.log('Referral code detected:', refCode);
          // Store in localStorage for later use (may fail in Phantom in-app browser)
          try {
            localStorage.setItem('pendingReferralCode', refCode.toUpperCase());
          } catch (e) {
            console.log('Could not save referral code to localStorage:', e);
          }
        }
      } catch (e) {
        console.log('Error accessing URL params:', e);
      }
    }
  }, []);

  // Safe localStorage access helpers
  const safeGetItem = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.log('localStorage not available for reading:', e);
      return null;
    }
  };

  const safeSetItem = (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.log('localStorage not available for writing:', e);
      return false;
    }
  };

  const safeRemoveItem = (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.log('localStorage not available for removing:', e);
      return false;
    }
  };

  // Connect user to backend and redirect
  const connectUser = useCallback(async (address: string) => {
    setIsConnecting(true);
    try {
      console.log('Connecting user:', address);
      
      // Get stored referral code (safe access)
      const storedReferralCode = safeGetItem('pendingReferralCode');
      const referralCode = pendingReferralCode || storedReferralCode || undefined;
      
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          referralCode: referralCode,
        }),
      });

      const data = await response.json();
      console.log('API response:', data);
      
      if (data.user) {
        // Clear stored referral code after use
        if (referralCode) {
          safeRemoveItem('pendingReferralCode');
          // Clean URL
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('ref');
            window.history.replaceState({}, '', url.toString());
          } catch (e) {
            console.log('Could not clean URL:', e);
          }
        }
        
        // Update state
        setUser(data.user);
        setConnected(true, address);
        
        // Save to localStorage (safe access)
        safeSetItem('landpulse-storage', JSON.stringify({
          state: {
            walletAddress: address,
            isConnected: true,
          }
        }));
        
        console.log('User connected, redirecting...');
        
        // Force page reload to ensure state is picked up
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to connect user:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [setUser, setConnected, pendingReferralCode, safeGetItem, safeRemoveItem, safeSetItem]);

  const connectPhantom = async () => {
    if (typeof window === 'undefined') return;
    
    const win = window as any;
    
    if (!win.solana?.isPhantom) {
      window.open('https://phantom.app/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await win.solana.connect();
      const address = response.publicKey.toString();
      await connectUser(address);
    } catch (error) {
      console.error('Phantom connection failed:', error);
      setIsConnecting(false);
    }
  };

  const connectSolflare = async () => {
    if (typeof window === 'undefined') return;
    
    const win = window as any;
    
    if (!win.solflare?.isSolflare) {
      window.open('https://solflare.com/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await win.solflare.connect();
      const address = response.publicKey.toString();
      await connectUser(address);
    } catch (error) {
      console.error('Solflare connection failed:', error);
      setIsConnecting(false);
    }
  };

  const connectBackpack = async () => {
    if (typeof window === 'undefined') return;
    
    const win = window as any;
    
    if (!win.backpack?.isBackpack) {
      window.open('https://backpack.app/', '_blank');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await win.backpack.connect();
      const address = response.publicKey.toString();
      await connectUser(address);
    } catch (error) {
      console.error('Backpack connection failed:', error);
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      
      if (win.solana?.disconnect) {
        try { await win.solana.disconnect(); } catch (e) {}
      }
      if (win.solflare?.disconnect) {
        try { await win.solflare.disconnect(); } catch (e) {}
      }
      if (win.backpack?.disconnect) {
        try { await win.backpack.disconnect(); } catch (e) {}
      }
      
      // Clear localStorage (safe access)
      safeRemoveItem('landpulse-storage');
    }
    
    setUser(null);
    setConnected(false, null);
    
    // Reload page
    window.location.reload();
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Check available wallets
  const hasPhantom = mounted && typeof window !== 'undefined' && (window as any).solana?.isPhantom;
  const hasSolflare = mounted && typeof window !== 'undefined' && (window as any).solflare?.isSolflare;
  const hasBackpack = mounted && typeof window !== 'undefined' && (window as any).backpack?.isBackpack;

  // Show loading state during hydration to prevent mismatch
  if (!mounted) {
    return (
      <Button disabled className="gradient-bg opacity-70">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Chargement...
      </Button>
    );
  }

  // Connected state - Affiche l'avatar et le pseudo, clic = dashboard
  if (isConnected && walletAddress) {
    const displayName = user?.username || `Joueur_${walletAddress.slice(0, 4)}`;
    
    // Générer les initiales pour l'avatar par défaut
    const getInitials = () => {
      if (user?.username) {
        return user.username.slice(0, 2).toUpperCase();
      }
      return walletAddress.slice(0, 2).toUpperCase();
    };
    
    const goToDashboard = () => {
      setActiveTab('dashboard');
    };
    
    return (
      <div className="flex items-center gap-2">
        {/* Avatar + Pseudo cliquable = Dashboard */}
        <Button 
          variant="outline" 
          className="glass-card border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50"
          onClick={goToDashboard}
        >
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7 border-2 border-purple-500/30">
              <AvatarImage src={user?.avatarUrl} alt="Avatar" />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-xs font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm hidden sm:inline">
              {displayName}
            </span>
          </div>
        </Button>
        
        {/* Menu dropdown pour options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-white"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="glass-card border-purple-500/20 bg-[#0f0f1a]/95"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user?.avatarUrl} alt="Avatar" />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-500 text-white text-xs">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span>{user?.pulseBucks?.toFixed(0) || 0} PB</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-purple-500/20" />
            <DropdownMenuItem 
              onClick={goToDashboard}
              className="cursor-pointer hover:bg-purple-500/20"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Tableau de bord
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={copyAddress}
              className="cursor-pointer hover:bg-purple-500/20"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? 'Copié!' : 'Copier l\'adresse'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={disconnectWallet}
              className="cursor-pointer hover:bg-red-500/20 text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Connecting state
  if (isConnecting) {
    return (
      <Button disabled className="gradient-bg opacity-70">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connexion...
      </Button>
    );
  }

  // Show dropdown with all wallets
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gradient-bg hover:opacity-90 text-white font-semibold px-6">
          <Wallet className="mr-2 h-4 w-4" />
          Connecter Wallet
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="glass-card border-purple-500/20 bg-[#0f0f1a]/95 min-w-[200px]"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Sélectionnez votre wallet
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-purple-500/20" />
        
        {/* Phantom */}
        <DropdownMenuItem
          onClick={connectPhantom}
          disabled={isConnecting}
          className="cursor-pointer hover:bg-purple-500/20 flex items-center justify-between"
        >
          <span>👻 Phantom</span>
          {!hasPhantom && <ExternalLink className="h-3 w-3 opacity-50" />}
        </DropdownMenuItem>
        
        {/* Solflare */}
        <DropdownMenuItem
          onClick={connectSolflare}
          disabled={isConnecting}
          className="cursor-pointer hover:bg-purple-500/20 flex items-center justify-between"
        >
          <span>🌞 Solflare</span>
          {!hasSolflare && <ExternalLink className="h-3 w-3 opacity-50" />}
        </DropdownMenuItem>
        
        {/* Backpack */}
        <DropdownMenuItem
          onClick={connectBackpack}
          disabled={isConnecting}
          className="cursor-pointer hover:bg-purple-500/20 flex items-center justify-between"
        >
          <span>🎒 Backpack</span>
          {!hasBackpack && <ExternalLink className="h-3 w-3 opacity-50" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
