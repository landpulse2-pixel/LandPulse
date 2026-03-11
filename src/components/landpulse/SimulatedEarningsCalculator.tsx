'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  Clock,
  Lock,
  Eye,
  Home,
  MapPin,
  RefreshCw,
  Tv,
  CheckCircle,
  Video,
} from 'lucide-react';
import { GAME_CONFIG, formatDollarsCompact } from '@/lib/game-config';

interface ParcelInputs {
  common: number;
  rare: number;
  epic: number;
  legendary: number;
  houses: number;
  videosPerDay: number;
}

export function SimulatedEarningsCalculator() {
  const [inputs, setInputs] = useState<ParcelInputs>({
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    houses: 0,
    videosPerDay: 0,
  });
  
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isVideoComplete, setIsVideoComplete] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Calculate earnings based on inputs
  const calculateEarnings = () => {
    // Get dollars per second from game config
    const commonDPS = GAME_CONFIG.RARITY_LEVELS.common.dollarsPerSecond;
    const rareDPS = GAME_CONFIG.RARITY_LEVELS.rare.dollarsPerSecond;
    const epicDPS = GAME_CONFIG.RARITY_LEVELS.epic.dollarsPerSecond;
    const legendaryDPS = GAME_CONFIG.RARITY_LEVELS.legendary.dollarsPerSecond;

    // Total dollars per second from parcels
    const baseDPS = 
      (inputs.common * commonDPS) +
      (inputs.rare * rareDPS) +
      (inputs.epic * epicDPS) +
      (inputs.legendary * legendaryDPS);

    // House boost
    const houseBoostPercent = GAME_CONFIG.getHouseBoost(inputs.houses);
    const houseBoostMultiplier = 1 + (houseBoostPercent / 100);

    // Base earnings (with house boost, without video boost)
    const basePerSecond = baseDPS * houseBoostMultiplier;

    // Total parcels for video boost calculation
    const totalParcels = inputs.common + inputs.rare + inputs.epic + inputs.legendary;

    // Video boost multiplier based on parcel count
    const adBoostMultiplier = GAME_CONFIG.AD_BOOST.getMultiplier(totalParcels);

    // Calculate earnings with videos
    // Each video gives 60 minutes (1 hour) of boost
    const boostHoursPerDay = Math.min(inputs.videosPerDay, 24);
    const normalHoursPerDay = 24 - boostHoursPerDay;

    // Earnings per hour
    const basePerHour = basePerSecond * 3600;
    const boostedPerHour = basePerSecond * adBoostMultiplier * 3600;

    // Daily earnings calculation
    const dailyEarnings = (normalHoursPerDay * basePerHour) + (boostHoursPerDay * boostedPerHour);

    // For other periods
    const totalPerDay = dailyEarnings;
    const totalPerWeek = totalPerDay * 7;
    const totalPerMonth = totalPerDay * 30;

    return {
      perSecond: basePerSecond,
      perHour: basePerHour,
      perDay: totalPerDay,
      perWeek: totalPerWeek,
      perMonth: totalPerMonth,
      basePerDay: basePerSecond * 86400,
      houseBoostPercent,
      adBoostMultiplier,
      boostHoursPerDay,
      normalHoursPerDay,
      totalParcels,
    };
  };

  const earnings = calculateEarnings();
  const houseTitle = GAME_CONFIG.getHouseTitle(inputs.houses);

  // Handle input change
  const handleInputChange = (field: keyof ParcelInputs, value: string) => {
    let numValue = parseInt(value) || 0;
    if (field === 'videosPerDay') {
      numValue = Math.min(24, Math.max(0, numValue));
    }
    setInputs(prev => ({ ...prev, [field]: Math.max(0, numValue) }));
    setShowResult(false);
    setIsVideoComplete(false);
  };

  // Handle video watch
  const handleWatchVideo = () => {
    if (earnings.totalParcels === 0 && inputs.houses === 0) {
      return;
    }
    setShowVideoModal(true);
    setVideoProgress(0);
    setCountdown(30);
  };

  // Video countdown effect
  useEffect(() => {
    if (!showVideoModal) return;

    const progressInterval = setInterval(() => {
      setVideoProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (100 / 30);
      });
    }, 1000);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsVideoComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(countdownInterval);
    };
  }, [showVideoModal]);

  // Close modal and show result
  const handleShowResult = () => {
    setShowVideoModal(false);
    setShowResult(true);
  };

  // Close modal without showing result
  const handleCloseModal = () => {
    setShowVideoModal(false);
    setVideoProgress(0);
    setCountdown(30);
    setIsVideoComplete(false);
  };

  return (
    <Card className="glass-card relative overflow-hidden border-cyan-500/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-cyan-400" />
          Simulateur de Revenus
        </CardTitle>
        <CardDescription>
          Calculez vos revenus selon vos parcelles, maisons et vidéos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Parcel Inputs */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Nombre de parcelles par catégorie
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Common */}
            <div className="glass-card rounded-lg p-3 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm flex items-center gap-1">
                  <span>🟢</span> Commun
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDollarsCompact(GAME_CONFIG.RARITY_LEVELS.common.dollarsPerSecond * 86400)}/j
                </span>
              </div>
              <Input
                type="number"
                min="0"
                value={inputs.common || ''}
                onChange={(e) => handleInputChange('common', e.target.value)}
                placeholder="0"
                className="bg-black/30 border-green-500/30 focus:border-green-500"
              />
            </div>

            {/* Rare */}
            <div className="glass-card rounded-lg p-3 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm flex items-center gap-1">
                  <span>🔵</span> Rare
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDollarsCompact(GAME_CONFIG.RARITY_LEVELS.rare.dollarsPerSecond * 86400)}/j
                </span>
              </div>
              <Input
                type="number"
                min="0"
                value={inputs.rare || ''}
                onChange={(e) => handleInputChange('rare', e.target.value)}
                placeholder="0"
                className="bg-black/30 border-blue-500/30 focus:border-blue-500"
              />
            </div>

            {/* Epic */}
            <div className="glass-card rounded-lg p-3 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm flex items-center gap-1">
                  <span>🟣</span> Épique
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDollarsCompact(GAME_CONFIG.RARITY_LEVELS.epic.dollarsPerSecond * 86400)}/j
                </span>
              </div>
              <Input
                type="number"
                min="0"
                value={inputs.epic || ''}
                onChange={(e) => handleInputChange('epic', e.target.value)}
                placeholder="0"
                className="bg-black/30 border-purple-500/30 focus:border-purple-500"
              />
            </div>

            {/* Legendary */}
            <div className="glass-card rounded-lg p-3 border border-orange-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm flex items-center gap-1">
                  <span>🟠</span> Légendaire
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDollarsCompact(GAME_CONFIG.RARITY_LEVELS.legendary.dollarsPerSecond * 86400)}/j
                </span>
              </div>
              <Input
                type="number"
                min="0"
                value={inputs.legendary || ''}
                onChange={(e) => handleInputChange('legendary', e.target.value)}
                placeholder="0"
                className="bg-black/30 border-orange-500/30 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Houses Input */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-4 w-4" />
            Nombre de maisons
          </div>
          
          <div className="glass-card rounded-lg p-3 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm flex items-center gap-1">
                <span>🏠</span> Maisons
              </span>
              {inputs.houses > 0 && (
                <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                  +{earnings.houseBoostPercent}% boost
                </Badge>
              )}
            </div>
            <Input
              type="number"
              min="0"
              value={inputs.houses || ''}
              onChange={(e) => handleInputChange('houses', e.target.value)}
              placeholder="0"
              className="bg-black/30 border-purple-500/30 focus:border-purple-500"
            />
            {inputs.houses > 0 && (
              <p className="text-xs text-purple-400 mt-2">
                Titre: <strong>{houseTitle.title}</strong>
                {houseTitle.nextTitle && (
                  <span className="text-muted-foreground">
                    {' '}→ Prochain: {houseTitle.nextTitle}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Videos Per Day Input */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Video className="h-4 w-4" />
            Vidéos par jour (max 24)
          </div>
          
          <div className="glass-card rounded-lg p-3 border border-orange-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm flex items-center gap-1">
                <span>📺</span> Vidéos boost
              </span>
              {inputs.videosPerDay > 0 && earnings.totalParcels > 0 && (
                <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                  x{earnings.adBoostMultiplier} pendant {earnings.boostHoursPerDay}h
                </Badge>
              )}
            </div>
            <Input
              type="number"
              min="0"
              max="24"
              value={inputs.videosPerDay || ''}
              onChange={(e) => handleInputChange('videosPerDay', e.target.value)}
              placeholder="0"
              className="bg-black/30 border-orange-500/30 focus:border-orange-500"
            />
            {inputs.videosPerDay > 0 && earnings.totalParcels > 0 && (
              <p className="text-xs text-orange-400 mt-2">
                Boost x{earnings.adBoostMultiplier} pendant {earnings.boostHoursPerDay}h/jour
                {earnings.normalHoursPerDay > 0 && (
                  <span className="text-muted-foreground">
                    {' '}(sans boost: {earnings.normalHoursPerDay}h)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Summary before calculation */}
        <div className="glass-card rounded-lg p-3 bg-cyan-500/5 border border-cyan-500/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total parcelles</span>
            <span className="text-cyan-400 font-semibold">{earnings.totalParcels}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Boost maisons</span>
            <span className="text-purple-400 font-semibold">+{earnings.houseBoostPercent}%</span>
          </div>
          {inputs.videosPerDay > 0 && earnings.totalParcels > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Boost vidéo</span>
              <span className="text-orange-400 font-semibold">x{earnings.adBoostMultiplier} ({earnings.boostHoursPerDay}h/jour)</span>
            </div>
          )}
        </div>

        {/* Show Result Button OR Watch Video Button */}
        {showResult ? (
          /* RESULTS SECTION */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              Résultats du calcul
            </div>
            
            {/* Earnings Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-lg p-3 border border-cyan-500/30">
                <div className="text-xs text-muted-foreground mb-1">Par heure</div>
                <div className="text-lg font-mono text-cyan-400">
                  {formatDollarsCompact(earnings.perHour)}
                </div>
              </div>
              <div className="glass-card rounded-lg p-3 border border-cyan-500/30">
                <div className="text-xs text-muted-foreground mb-1">Par jour</div>
                <div className="text-lg font-mono text-cyan-400 font-semibold">
                  {formatDollarsCompact(earnings.perDay)}
                </div>
              </div>
              <div className="glass-card rounded-lg p-3 border border-green-500/30">
                <div className="text-xs text-muted-foreground mb-1">Par semaine</div>
                <div className="text-lg font-mono text-green-400">
                  {formatDollarsCompact(earnings.perWeek)}
                </div>
              </div>
              <div className="glass-card rounded-lg p-3 border border-yellow-500/30">
                <div className="text-xs text-muted-foreground mb-1">Par mois (30j)</div>
                <div className="text-lg font-mono text-yellow-400 font-semibold">
                  {formatDollarsCompact(earnings.perMonth)}
                </div>
              </div>
            </div>

            {/* Comparison if videos are used */}
            {inputs.videosPerDay > 0 && (
              <div className="glass-card rounded-lg p-3 bg-green-500/10 border border-green-500/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sans vidéo (base)</span>
                  <span className="text-gray-400 font-mono">{formatDollarsCompact(earnings.basePerDay)}/jour</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-green-400">+ Vidéos boost</span>
                  <span className="text-green-400 font-mono font-semibold">
                    +{formatDollarsCompact(earnings.perDay - earnings.basePerDay)}/jour
                  </span>
                </div>
              </div>
            )}

            {/* Reset Button */}
            <Button
              onClick={() => {
                setShowResult(false);
                setIsVideoComplete(false);
              }}
              variant="outline"
              className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalculer
            </Button>
          </div>
        ) : (
          /* WATCH VIDEO BUTTON */
          <Button
            onClick={handleWatchVideo}
            disabled={earnings.totalParcels === 0 && inputs.houses === 0}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold disabled:opacity-50"
          >
            <Lock className="h-4 w-4 mr-2" />
            Regarder une vidéo pour voir le résultat
          </Button>
        )}
      </CardContent>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-cyan-500/30">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Tv className="h-8 w-8 text-cyan-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {isVideoComplete ? 'Vidéo terminée !' : 'Publicité'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isVideoComplete 
                  ? 'Vous pouvez maintenant voir vos résultats'
                  : `Regardez cette vidéo pour débloquer vos résultats (${countdown}s)`
                }
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
              
              {/* Countdown or Action Button */}
              {isVideoComplete ? (
                <Button
                  onClick={handleShowResult}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le résultat
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Veuillez patienter {countdown} secondes...
                </p>
              )}
              
              {/* Close button during video */}
              {!isVideoComplete && (
                <Button
                  onClick={handleCloseModal}
                  variant="ghost"
                  className="mt-4 text-muted-foreground hover:text-white"
                >
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
