'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GAME_CONFIG, formatNumber, formatDollars, formatDollarsCompact, getDailyDollars } from '@/lib/game-config';
import { DailyBonus } from './DailyBonus';
import { RealTimeCounter, AnimatedCounter } from './AnimatedCounter';
import { VideoBoostButton } from './VideoBoostButton';
import { ReferralSection } from './ReferralSection';
import { MigrateButton } from './MigrateButton';
import { MonumentAuction } from './MonumentAuction';
import { ProfileSection } from './ProfileSection';
import { SimulatedEarningsCalculator } from './SimulatedEarningsCalculator';
import {
  Home,
  MapPin,
  Zap,
  Clock,
  Wallet,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';

// Function to save dollars to database
async function saveDollarsToDatabase(wallet: string): Promise<void> {
  try {
    await fetch('/api/user/dollars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    });
    console.log('[Dashboard] Dollars saved to database');
  } catch (error) {
    console.error('[Dashboard] Error saving dollars:', error);
  }
}

export function Dashboard() {
  // Use specific selectors for better reactivity
  const user = useGameStore((state) => state.user);
  const walletAddress = useGameStore((state) => state.walletAddress);
  const userParcels = useGameStore((state) => state.userParcels);
  const buildings = useGameStore((state) => state.buildings);
  const setUser = useGameStore((state) => state.setUser);
  const setBuildings = useGameStore((state) => state.setBuildings);
  const [isLoadingDollars, setIsLoadingDollars] = useState(false);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate accumulated dollars from server (handles offline earnings)
  const calculateAccumulatedDollars = useCallback(async () => {
    if (!walletAddress) return;
    
    setIsLoadingDollars(true);
    try {
      const response = await fetch('/api/user/dollars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress }),
      });
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser({
          ...user!,
          dollars: data.user.dollars ?? 0,
          totalDollarsEarned: data.user.totalDollarsEarned ?? 0,
          lastDollarsUpdate: data.user.lastDollarsUpdate,
        });
      }
    } catch (error) {
      console.error('Error calculating accumulated dollars:', error);
    } finally {
      setIsLoadingDollars(false);
    }
  }, [walletAddress, setUser, user]);

  // Fetch buildings
  const fetchBuildings = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      const response = await fetch(`/api/buildings?wallet=${walletAddress}`);
      const data = await response.json();
      if (data.buildings) {
        setBuildings(data.buildings);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  }, [walletAddress, setBuildings]);

  // Initial load - calculate accumulated dollars
  useEffect(() => {
    if (walletAddress && user) {
      calculateAccumulatedDollars();
      fetchBuildings();
    }
  }, [walletAddress]); // Only run once when wallet connects

  // Auto-save dollars every 30 seconds
  useEffect(() => {
    if (!walletAddress) return;

    saveIntervalRef.current = setInterval(() => {
      saveDollarsToDatabase(walletAddress);
    }, 30000); // 30 seconds

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [walletAddress]);

  // Save dollars when user leaves the page
  useEffect(() => {
    if (!walletAddress) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable save on page close
      const data = JSON.stringify({ wallet: walletAddress });
      navigator.sendBeacon('/api/user/dollars', data);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveDollarsToDatabase(walletAddress);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [walletAddress]);

  // ============================================
  // SYSTÈME ÉCONOMIQUE EN DOLLARS
  // ============================================
  
  // 1. Calculer les revenus de base des parcelles (en dollars/seconde)
  const parcelDollarsPerSecond = userParcels.reduce((sum, p) => sum + (p.dollarsPerSecond || 0), 0);
  
  // 2. Calculer le boost des maisons
  const houseCount = buildings.filter(b => b.type === 'house').length;
  const houseBoostPercent = GAME_CONFIG.getHouseBoost(houseCount);
  const houseBoostMultiplier = 1 + (houseBoostPercent / 100);
  const houseTitle = GAME_CONFIG.getHouseTitle(houseCount);
  
  // 3. Calculer le boost publicitaire (si actif)
  const hasAdBoost = user?.boostEndTime && new Date(user.boostEndTime) > new Date();
  const adBoostMultiplier = hasAdBoost 
    ? GAME_CONFIG.AD_BOOST.getMultiplier(userParcels.length) 
    : 1;
  const boostRemaining = hasAdBoost && user?.boostEndTime
    ? Math.max(0, new Date(user.boostEndTime).getTime() - Date.now())
    : 0;
  
  // 4. Calculer les revenus totaux en dollars
  const totalMultiplier = houseBoostMultiplier * adBoostMultiplier;
  const totalDollarsPerSecond = parcelDollarsPerSecond * totalMultiplier;
  const totalDollarsPerDay = totalDollarsPerSecond * 86400;
  const totalDollarsPerHour = totalDollarsPerSecond * 3600;

  // Group parcels by rarity
  const parcelsByRarity = {
    common: userParcels.filter(p => p.level === 'common').length,
    rare: userParcels.filter(p => p.level === 'rare').length,
    epic: userParcels.filter(p => p.level === 'epic').length,
    legendary: userParcels.filter(p => p.level === 'legendary').length,
  };

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Tableau de Bord
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Bienvenue, <span className="text-purple-400">{houseTitle.title}</span> • {houseCount} maison{houseCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DailyBonus />
          {isLoadingDollars && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Sync...
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{houseCount}</div>
            <div className="text-xs text-muted-foreground">Maisons</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-cyan-400">{userParcels.length}</div>
            <div className="text-xs text-muted-foreground">Parcelles</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">
              <AnimatedCounter
                value={user.pulseBucks}
                decimals={0}
                duration={300}
                formatFn={formatNumber}
              />
            </div>
            <div className="text-xs text-muted-foreground">PulseBucks</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-400">+{houseBoostPercent}%</div>
            <div className="text-xs text-muted-foreground">Boost Maison</div>
          </CardContent>
        </Card>
      </div>

      {/* Boost Video Button */}
      <VideoBoostButton />

      {/* Ad Boost Banner */}
      {hasAdBoost && (
        <Card className="glass-card border-orange-500/30 bg-orange-500/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <div className="font-semibold">Boost Publicitaire x{adBoostMultiplier.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">
                  Reste {Math.floor(boostRemaining / 60000)} minutes
                </div>
              </div>
            </div>
            <Badge variant="outline" className="border-orange-500 text-orange-400">
              <Clock className="h-3 w-3 mr-1" />
              {GAME_CONFIG.AD_BOOST.getBoostTier(userParcels.length).tier}
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Section */}
        <ProfileSection />

        {/* Calculateur de revenus */}
        <SimulatedEarningsCalculator />
      </div>

      {/* Parcelles par Rareté */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-400" />
              Parcelles par Rareté
            </CardTitle>
            <div className="text-right">
              <div className="text-2xl font-bold gradient-text">{userParcels.length}</div>
              <div className="text-xs text-muted-foreground">parcelles</div>
            </div>
          </div>
          <CardDescription>
            Répartition et revenus par rareté
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(parcelsByRarity).map(([rarity, count]) => {
            const config = GAME_CONFIG.RARITY_LEVELS[rarity as keyof typeof GAME_CONFIG.RARITY_LEVELS];
            const percentage = userParcels.length > 0 ? (count / userParcels.length) * 100 : 0;
            const dailyDollars = getDailyDollars(rarity as keyof typeof GAME_CONFIG.RARITY_LEVELS);
            
            return (
              <div key={rarity} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{config.emoji}</span>
                    <span>{config.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{count}</span>
                    {count > 0 && (
                      <span className="text-cyan-400 text-xs">
                        {formatDollarsCompact(dailyDollars * count * totalMultiplier)}/j
                      </span>
                    )}
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                  style={{ backgroundColor: `${config.color}20` }}
                />
              </div>
            );
          })}
          
          {userParcels.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              Aucune parcelle. Achetez-en sur la carte!
            </div>
          )}

          <Separator className="bg-purple-500/20" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valeur totale</span>
            <span className="text-yellow-400 font-semibold">
              {formatNumber(userParcels.reduce((sum, p) => sum + p.price, 0))} PB
            </span>
          </div>
          
          {/* Total dollars gagnés */}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-purple-500/20">
            <span className="text-muted-foreground">Dollars totaux gagnés</span>
            <span className="text-cyan-400 font-mono tabular-nums">
              <RealTimeCounter
                baseValue={user.totalDollarsEarned ?? 0}
                ratePerSecond={totalDollarsPerSecond}
                decimals={12}
                formatFn={formatDollars}
                id="dollars-counter"
              />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total dépensé</span>
            <span className="text-yellow-400">{formatNumber(user.totalSpent)} PB</span>
          </div>
        </CardContent>
      </Card>

      {/* Houses Section */}
      <Card className="glass-card border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Home className="h-5 w-5 text-purple-400" />
                Vos Maisons
              </CardTitle>
              <CardDescription>
                {houseCount > 0 
                  ? `${houseCount} maison${houseCount > 1 ? 's' : ''} • Boost total: +${houseBoostPercent}%`
                  : 'Achetez des maisons pour booster vos revenus'
                }
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-lg px-4 py-1">
                {houseTitle.title}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {houseCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucune maison.</p>
              <p className="text-sm">Allez dans la Boutique pour acheter votre première maison !</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Houses display */}
              <div className="flex flex-wrap gap-2">
                {[...Array(Math.min(houseCount, 20))].map((_, i) => (
                  <div 
                    key={i}
                    className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-2xl"
                  >
                    🏠
                  </div>
                ))}
                {houseCount > 20 && (
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-sm text-purple-400 font-bold">
                    +{houseCount - 20}
                  </div>
                )}
              </div>

              {/* Next tier info */}
              {houseTitle.nextTitle && (
                <div className="glass-card rounded-lg p-3 bg-cyan-500/10 border-cyan-500/30">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <ChevronUp className="h-4 w-4" />
                    <span className="text-sm">
                      <strong>{houseTitle.housesToNext} maison{houseTitle.housesToNext > 1 ? 's' : ''}</strong> de plus pour devenir <strong>{houseTitle.nextTitle}</strong> (+{GAME_CONFIG.getHouseBoost(houseCount + houseTitle.housesToNext)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Section */}
      <ReferralSection />

      {/* Monument Auctions */}
      <MonumentAuction />

      {/* Admin Migration */}
      <MigrateButton />
    </div>
  );
}
