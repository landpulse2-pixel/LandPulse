'use client';

import { useGameStore } from '@/store/gameStore';
import { Coins, TrendingUp } from 'lucide-react';
import { formatNumber, formatDollars, formatDollarsCompact, GAME_CONFIG } from '@/lib/game-config';
import { RealTimeCounter, AnimatedCounter } from './AnimatedCounter';

export function PulseBucksDisplay() {
  // Use specific selectors for better reactivity
  const user = useGameStore((state) => state.user);
  const userParcels = useGameStore((state) => state.userParcels);
  const buildings = useGameStore((state) => state.buildings);

  if (!user) return null;

  // Calculate total dollars per second from parcels (same as Dashboard)
  const parcelDollarsPerSecond = userParcels.reduce((sum, p) => sum + (p.dollarsPerSecond || 0), 0);
  
  // Calculate house boost (same as Dashboard)
  const houseCount = buildings.filter(b => b.type === 'house').length;
  const houseBoostPercent = GAME_CONFIG.getHouseBoost(houseCount);
  const houseBoostMultiplier = 1 + (houseBoostPercent / 100);
  
  // Calculate ad boost (same as Dashboard)
  const hasAdBoost = user?.boostEndTime && new Date(user.boostEndTime) > new Date();
  const adBoostMultiplier = hasAdBoost 
    ? GAME_CONFIG.AD_BOOST.getMultiplier(userParcels.length) 
    : 1;
  
  // Total multiplier
  const totalMultiplier = houseBoostMultiplier * adBoostMultiplier;
  
  // Total dollars per second WITH boosts
  const totalDollarsPerSecond = parcelDollarsPerSecond * totalMultiplier;
  
  // Safe totalDollarsEarned with fallback
  const totalDollarsEarned = user.totalDollarsEarned ?? 0;

  return (
    <div className="flex items-center gap-4">
      {/* PulseBucks - avec animation */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <Coins className="h-4 w-4 text-yellow-400" />
        <div>
          <div className="text-xs text-yellow-400/70">PulseBucks</div>
          <div className="text-sm font-bold text-yellow-400 font-mono">
            <AnimatedCounter
              value={user.pulseBucks ?? 0}
              decimals={0}
              duration={300}
              formatFn={formatNumber}
            />
          </div>
        </div>
      </div>

      {/* Dollars - Real-time counter (same ID as Dashboard for sync) */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 relative overflow-hidden">
        <TrendingUp className="h-4 w-4 text-cyan-400" />
        <div>
          <div className="text-xs text-cyan-400/70 flex items-center gap-1">
            Dollars
            {totalDollarsPerSecond > 0 && (
              <span className="text-[10px] text-cyan-300/50 animate-pulse">
                +{formatDollarsCompact(totalDollarsPerSecond)}/s
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-cyan-400 font-mono">
            <RealTimeCounter
              baseValue={totalDollarsEarned}
              ratePerSecond={totalDollarsPerSecond}
              decimals={12}
              formatFn={formatDollars}
              id="dollars-counter"
            />
          </div>
        </div>
        {/* Animated glow effect when earning */}
        {totalDollarsPerSecond > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent animate-shimmer" />
          </div>
        )}
      </div>
    </div>
  );
}
