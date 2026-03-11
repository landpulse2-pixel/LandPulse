'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  Play,
  TrendingUp,
  Clock,
  Zap,
  Tv,
} from 'lucide-react';
import { GAME_CONFIG, formatDollarsCompact } from '@/lib/game-config';

export function EarningsCalculator() {
  const { userParcels, buildings, user } = useGameStore();
  const [showAdModal, setShowAdModal] = useState(false);

  // Calculate base earnings
  const parcelDollarsPerSecond = userParcels.reduce((sum, p) => sum + (p.dollarsPerSecond || 0), 0);
  const houseCount = buildings.filter(b => b.type === 'house').length;
  const houseBoostPercent = GAME_CONFIG.getHouseBoost(houseCount);
  const houseBoostMultiplier = 1 + (houseBoostPercent / 100);

  // Without ad boost
  const earningsWithoutAd = parcelDollarsPerSecond * houseBoostMultiplier;
  const hourlyWithoutAd = earningsWithoutAd * 3600;
  const dailyWithoutAd = earningsWithoutAd * 86400;

  // With ad boost (maximum multiplier based on parcel count)
  const maxAdMultiplier = GAME_CONFIG.AD_BOOST.getMultiplier(userParcels.length);
  const earningsWithAd = parcelDollarsPerSecond * houseBoostMultiplier * maxAdMultiplier;
  const hourlyWithAd = earningsWithAd * 3600;
  const dailyWithAd = earningsWithAd * 86400;

  // Difference
  const dailyDifference = dailyWithAd - dailyWithoutAd;

  // Handle ad watch simulation
  const handleWatchAd = () => {
    setShowAdModal(true);
    // Simulate 5 second ad
    setTimeout(() => {
      setShowAdModal(false);
    }, 5000);
  };

  return (
    <Card className="glass-card relative overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-cyan-400" />
          Calculateur de Revenus
        </CardTitle>
        <CardDescription>
          Comparez vos gains avec et sans boost publicitaire
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base info */}
        <div className="glass-card rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Vos parcelles</span>
            <span className="text-cyan-400 font-semibold">{userParcels.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Boost maisons</span>
            <Badge className="bg-purple-500/20 text-purple-400">+{houseBoostPercent}%</Badge>
          </div>
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Without ad */}
          <div className="glass-card rounded-lg p-4 border border-gray-500/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <span className="text-sm font-medium text-gray-400">Sans pub</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Par jour</span>
                <span className="text-gray-300 font-mono">{formatDollarsCompact(dailyWithoutAd)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Par heure</span>
                <span className="text-gray-300 font-mono">{formatDollarsCompact(hourlyWithoutAd)}</span>
              </div>
            </div>
          </div>

          {/* With ad */}
          <div className="glass-card rounded-lg p-4 border border-orange-500/30 bg-orange-500/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-orange-400" />
              </div>
              <span className="text-sm font-medium text-orange-400">Avec pub x{maxAdMultiplier.toFixed(1)}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Par jour</span>
                <span className="text-orange-300 font-mono font-semibold">{formatDollarsCompact(dailyWithAd)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Par heure</span>
                <span className="text-orange-300 font-mono">{formatDollarsCompact(hourlyWithAd)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Boost bonus */}
        {dailyDifference > 0 && (
          <div className="glass-card rounded-lg p-3 bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 text-green-400">
              <Zap className="h-4 w-4" />
              <span className="text-sm">
                <strong>+{formatDollarsCompact(dailyDifference)}</strong> de plus par jour avec le boost pub !
              </span>
            </div>
          </div>
        )}

        {/* Watch ad button */}
        <Button
          onClick={handleWatchAd}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-white font-semibold"
        >
          <Play className="h-4 w-4 mr-2" />
          Regarder une pub pour booster x{maxAdMultiplier.toFixed(1)}
        </Button>

        {/* Current boost status */}
        {user?.boostEndTime && new Date(user.boostEndTime) > new Date() && (
          <div className="flex items-center gap-2 text-sm text-orange-400">
            <Clock className="h-4 w-4" />
            <span>
              Boost actif pendant {Math.ceil((new Date(user.boostEndTime).getTime() - Date.now()) / 60000)} minutes
            </span>
          </div>
        )}
      </CardContent>

      {/* Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-orange-500/30">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Tv className="h-8 w-8 text-orange-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Publicité</h3>
              <p className="text-muted-foreground mb-4">
                Regardez cette pub pour activer votre boost x{maxAdMultiplier.toFixed(1)}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                <div className="bg-orange-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
              <p className="text-sm text-muted-foreground">Veuillez patienter...</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
