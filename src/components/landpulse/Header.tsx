'use client';

import { useGameStore } from '@/store/gameStore';
import { WalletConnect } from './WalletConnect';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Calendar,
  Sparkles,
  Gift,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { formatDollars, formatNumber, GAME_CONFIG } from '@/lib/game-config';
import { RealTimeCounter, AnimatedCounter } from './AnimatedCounter';

export function Header() {
  // Use specific selectors for better reactivity
  const activeTab = useGameStore((state) => state.activeTab);
  const setActiveTab = useGameStore((state) => state.setActiveTab);
  const user = useGameStore((state) => state.user);
  const isConnected = useGameStore((state) => state.isConnected);
  const userParcels = useGameStore((state) => state.userParcels);
  const buildings = useGameStore((state) => state.buildings);

  const tabs = [
    { id: 'map', label: 'Carte', icon: MapPin },
    { id: 'shop', label: 'Boutique', icon: Gift },
    { id: 'events', label: 'Événements', icon: Calendar },
  ] as const;

  // Calculate dollars per second
  const parcelDollarsPerSecond = userParcels.reduce((sum, p) => sum + (p.dollarsPerSecond || 0), 0);
  const houseCount = buildings.filter(b => b.type === 'house').length;
  const houseBoostPercent = GAME_CONFIG.getHouseBoost(houseCount);
  const houseBoostMultiplier = 1 + (houseBoostPercent / 100);
  const hasAdBoost = user?.boostEndTime && new Date(user.boostEndTime) > new Date();
  const adBoostMultiplier = hasAdBoost 
    ? GAME_CONFIG.AD_BOOST.getMultiplier(userParcels.length) 
    : 1;
  const totalMultiplier = houseBoostMultiplier * adBoostMultiplier;
  const totalDollarsPerSecond = parcelDollarsPerSecond * totalMultiplier;
  const totalDollarsEarned = user?.totalDollarsEarned ?? 0;

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-purple-500/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Dollars/PB - Plus compact sur mobile */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo seul */}
            <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center pulse-glow shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            
            {/* Dollars en avant + PB en dessous */}
            {isConnected && user && (
              <div className="flex flex-col">
                {/* Dollars - MIS EN AVANT */}
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-cyan-400" />
                  <span className="text-base sm:text-lg font-bold text-cyan-400 font-mono">
                    <RealTimeCounter
                      baseValue={totalDollarsEarned}
                      ratePerSecond={totalDollarsPerSecond}
                      decimals={12}
                      formatFn={formatDollars}
                      id="dollars-counter"
                    />
                  </span>
                  {totalDollarsPerSecond > 0 && (
                    <span className="text-[10px] text-cyan-300/60 animate-pulse hidden sm:inline">
                      +{formatDollars(totalDollarsPerSecond)}/s
                    </span>
                  )}
                </div>
                {/* PB en dessous - avec animation */}
                <div className="flex items-center gap-1">
                  <Coins className="h-3 w-3 text-yellow-400" />
                  <span className="text-xs text-yellow-400/80 font-mono">
                    <AnimatedCounter
                      value={user.pulseBucks ?? 0}
                      decimals={0}
                      duration={300}
                      formatFn={formatNumber}
                    />
                    {' PB'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          {isConnected && (
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id ? 'gradient-bg' : 'text-muted-foreground'}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              ))}
            </nav>
          )}

          {/* Right Side - Wallet avec pseudo */}
          <div className="flex items-center gap-2">
            <WalletConnect />
          </div>
        </div>

        {/* Mobile Navigation */}
        {isConnected && (
          <nav className="md:hidden flex items-center justify-around py-2 border-t border-purple-500/20 -mx-4 px-4">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'gradient-bg' : 'text-muted-foreground'}
              >
                <tab.icon className="h-4 w-4" />
              </Button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
