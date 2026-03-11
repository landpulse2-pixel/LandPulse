'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GAME_CONFIG } from '@/lib/game-config';
import {
  Zap,
  Play,
  Clock,
  Sparkles,
  X,
  Crown,
  ChevronRight,
  Check,
} from 'lucide-react';

// Simulated ads data
const SIMULATED_ADS = [
  { id: 1, brand: 'CryptoMoon', slogan: 'Le futur de la finance décentralisée', color: 'from-purple-600 to-blue-600', icon: '🌙', cta: 'Investissez intelligemment' },
  { id: 2, brand: 'NFT Galaxy', slogan: 'Collectionnez des mondes entiers', color: 'from-pink-600 to-purple-600', icon: '🌌', cta: 'Explorez maintenant' },
  { id: 3, brand: 'SolanaPay', slogan: 'Transactions instantanées, frais minimes', color: 'from-green-600 to-teal-600', icon: '⚡', cta: 'Essayez gratuitement' },
  { id: 4, brand: 'MetaWorld', slogan: 'Votre vie virtuelle commence ici', color: 'from-cyan-600 to-blue-600', icon: '🌐', cta: 'Rejoignez le métaverse' },
  { id: 5, brand: 'DeFi Kingdoms', slogan: 'Gagnez en jouant', color: 'from-yellow-600 to-orange-600', icon: '🏰', cta: 'Commencez l\'aventure' },
  { id: 6, brand: 'PixelVerse', slogan: 'Créez. Tradez. Prospérez.', color: 'from-red-600 to-pink-600', icon: '🎮', cta: 'Jouer maintenant' },
  { id: 7, brand: 'YieldFarm Pro', slogan: 'Faites fructifier vos crypto', color: 'from-emerald-600 to-green-600', icon: '💰', cta: 'Maximisez vos gains' },
  { id: 8, brand: 'AirdropHunter', slogan: 'Ne manquez plus aucun airdrop', color: 'from-indigo-600 to-violet-600', icon: '🎁', cta: 'Chassez les récompenses' },
];

// Subscription colors and labels
const SUBSCRIPTION_STYLES = {
  free: {
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    label: 'Gratuit',
  },
  premium: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    label: 'Premium',
  },
  vip: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    label: 'VIP',
  },
};

export function VideoBoostButton() {
  const { user, userParcels, walletAddress, setUser } = useGameStore();
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adTimer, setAdTimer] = useState(30);
  const [boostPending, setBoostPending] = useState(false);
  const [currentAd, setCurrentAd] = useState<typeof SIMULATED_ADS[0] | null>(null);
  const [boostRemaining, setBoostRemaining] = useState(0);
  const [boostStatus, setBoostStatus] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const adIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const boostIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Vidéos à la suite
  const [isRowSession, setIsRowSession] = useState(false); // Session de vidéos à la suite active
  const [currentAdIndex, setCurrentAdIndex] = useState(1); // Index actuel dans la série (1, 2, 3, 4)

  const parcelCount = userParcels.length;
  const boostTier = GAME_CONFIG.AD_BOOST.getBoostTier(parcelCount);
  const { multiplier, superMultiplier, tier } = boostTier;

  // Initial fetch and periodic update
  useEffect(() => {
    let isMounted = true;
    
    const doFetch = async () => {
      if (!walletAddress || !isMounted) return;
      try {
        const response = await fetch(`/api/boost?wallet=${walletAddress}&t=${Date.now()}`, { cache: 'no-store' });
        const data = await response.json();
        if (isMounted) {
          setBoostStatus(data);
        }
      } catch (error) {
        console.error('Error fetching boost status:', error);
      }
    };

    doFetch();
    const interval = setInterval(doFetch, 5000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [walletAddress]);

  // Update boost remaining time every second
  useEffect(() => {
    const updateBoostRemaining = () => {
      if (user?.boostEndTime && new Date(user.boostEndTime) > new Date()) {
        const remaining = Math.max(0, new Date(user.boostEndTime).getTime() - Date.now());
        setBoostRemaining(remaining);
      } else {
        setBoostRemaining(0);
      }
    };

    updateBoostRemaining();
    boostIntervalRef.current = setInterval(updateBoostRemaining, 1000);

    return () => {
      if (boostIntervalRef.current) {
        clearInterval(boostIntervalRef.current);
      }
    };
  }, [user?.boostEndTime]);

  const hasBoost = boostRemaining > 0;
  const adsWatchedToday = boostStatus?.adsWatchedToday || 0;
  const maxAds = boostStatus?.maxAds || 24;
  const remainingAds = boostStatus?.remainingAds || 24;
  const subscription = boostStatus?.subscription || 'free';
  const maxAdsInRow = boostStatus?.maxAdsInRow || 4;
  const subStyle = SUBSCRIPTION_STYLES[subscription as keyof typeof SUBSCRIPTION_STYLES];
  const canWatchAd = remainingAds > 0;

  const formatTimeCompact = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Démarrer une session de vidéos à la suite
  const startRowSession = useCallback(() => {
    if (!canWatchAd) return;
    
    setIsRowSession(true);
    setCurrentAdIndex(1);
    
    const randomAd = SIMULATED_ADS[Math.floor(Math.random() * SIMULATED_ADS.length)];
    setCurrentAd(randomAd);
    setShowAdModal(true);
    setIsWatchingAd(true);
    setAdTimer(30);
    setErrorMessage(null);
  }, [canWatchAd]);

  // Démarrer une seule vidéo
  const startSingleAd = useCallback(() => {
    if (!canWatchAd) return;
    
    setIsRowSession(false);
    setCurrentAdIndex(1);
    
    const randomAd = SIMULATED_ADS[Math.floor(Math.random() * SIMULATED_ADS.length)];
    setCurrentAd(randomAd);
    setShowAdModal(true);
    setIsWatchingAd(true);
    setAdTimer(30);
    setErrorMessage(null);
  }, [canWatchAd]);

  // Regarder la vidéo suivante dans la série (manuel)
  const watchNextInRow = useCallback(() => {
    if (currentAdIndex >= maxAdsInRow) {
      // Série terminée
      setIsRowSession(false);
      setShowAdModal(false);
      return;
    }
    
    if (remainingAds <= 0) {
      // Plus de pubs disponibles aujourd'hui
      setIsRowSession(false);
      setShowAdModal(false);
      return;
    }
    
    const randomAd = SIMULATED_ADS[Math.floor(Math.random() * SIMULATED_ADS.length)];
    setCurrentAd(randomAd);
    setIsWatchingAd(true);
    setAdTimer(30);
    setCurrentAdIndex(prev => prev + 1);
    setErrorMessage(null);
  }, [currentAdIndex, maxAdsInRow, remainingAds]);

  // Fermer et réinitialiser
  const closeModal = useCallback(() => {
    setShowAdModal(false);
    setIsRowSession(false);
    setCurrentAdIndex(1);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (showAdModal && isWatchingAd) {
      adIntervalRef.current = setInterval(() => {
        setAdTimer(prev => {
          if (prev <= 1) {
            clearInterval(adIntervalRef.current!);
            setIsWatchingAd(false);
            setBoostPending(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (adIntervalRef.current) {
        clearInterval(adIntervalRef.current);
      }
    };
  }, [showAdModal, isWatchingAd]);

  // Handle boost activation when boostPending becomes true
  useEffect(() => {
    if (!boostPending || isWatchingAd) return;
    
    let isMounted = true;
    
    const doActivate = async () => {
      if (!walletAddress || !isMounted) return;
      
      try {
        const response = await fetch('/api/boost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: walletAddress }),
        });
        const data = await response.json();
        
        if (!isMounted) return;
        
        if (data.success && data.user) {
          setUser(data.user);
          setBoostStatus(prev => ({
            ...prev,
            adsWatchedToday: data.adsWatchedToday,
            maxAds: data.maxAds,
            remainingAds: data.remainingAds,
            maxAdsInRow: data.maxAdsInRow,
          }));
        } else {
          setErrorMessage(data.message || 'Erreur lors de l\'activation du boost');
          setIsRowSession(false);
        }
      } catch (error) {
        console.error('Error activating boost:', error);
        if (isMounted) {
          setErrorMessage('Erreur de connexion');
          setIsRowSession(false);
        }
      } finally {
        if (isMounted) {
          setBoostPending(false);
        }
      }
    };

    doActivate();
    
    return () => {
      isMounted = false;
    };
  }, [boostPending, isWatchingAd, walletAddress, setUser]);

  if (parcelCount === 0) return null;

  // Calculer combien de vidéos restantes dans la série
  const canContinueRow = isRowSession && currentAdIndex < maxAdsInRow && remainingAds > 0;
  const isRowComplete = isRowSession && currentAdIndex >= maxAdsInRow;

  return (
    <>
      {/* Boost Button with subscription info */}
      <div className="flex items-center gap-2">
        {/* Subscription badge */}
        {subscription !== 'free' && (
          <Badge className={`${subStyle.bg} ${subStyle.border} ${subStyle.color} border`}>
            <Crown className="h-3 w-3 mr-1" />
            {subStyle.label}
          </Badge>
        )}
        
        {hasBoost ? (
          <button
            onClick={startSingleAd}
            disabled={!canWatchAd}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-all group ${!canWatchAd ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="relative">
              <Zap className="h-4 w-4 text-orange-400" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            </div>
            <div className="text-left">
              <div className="text-xs text-orange-400/70 flex items-center gap-1">
                <span className="font-bold text-orange-300">{tier}</span>
                <span>•</span>
                <span>x{multiplier}</span>
              </div>
              <div className="text-sm font-bold text-orange-400 font-mono flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeCompact(boostRemaining)}
                </span>
                <span className="text-xs text-orange-300/50">({adsWatchedToday}/{maxAds})</span>
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={startSingleAd}
            disabled={!canWatchAd}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 hover:border-orange-500/50 transition-all group ${!canWatchAd ? 'opacity-50 cursor-not-allowed animate-none' : 'animate-pulse'}`}
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center">
              <Play className="h-3 w-3 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs text-orange-400/70 flex items-center gap-1">
                <span className="font-bold text-orange-300">{tier}</span>
                <span>•</span>
                <span>Boost Vidéo</span>
                <span className="text-[10px] text-orange-300/50">({adsWatchedToday}/{maxAds})</span>
              </div>
              <div className="text-sm font-bold text-orange-400">
                x{multiplier} gratuit
              </div>
            </div>
          </button>
        )}
        
        {/* Bouton pour regarder plusieurs vidéos à la suite */}
        {canWatchAd && remainingAds >= 2 && (
          <button
            onClick={startRowSession}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-all"
            title={`Regarder ${Math.min(maxAdsInRow, remainingAds)} vidéos à la suite`}
          >
            <div className="flex items-center">
              <Play className="h-3 w-3 text-purple-400" />
              <Play className="h-3 w-3 text-purple-400 -ml-1" />
            </div>
            <span className="text-xs text-purple-300 font-medium">
              {Math.min(maxAdsInRow, remainingAds)}/{maxAdsInRow}
            </span>
          </button>
        )}
      </div>

      {/* Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="glass-card w-full max-w-lg mx-4 border-orange-500/30 overflow-hidden">
            <CardContent className="p-0">
              {isWatchingAd && currentAd ? (
                <div className="relative">
                  <div className={`w-full h-80 bg-gradient-to-br ${currentAd.color} flex flex-col items-center justify-center p-8 relative overflow-hidden`}>
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
                      <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-pulse" />
                    </div>
                    <div className="relative z-10 text-center">
                      <div className="text-6xl mb-4 animate-bounce">{currentAd.icon}</div>
                      <h2 className="text-3xl font-bold text-white mb-2">{currentAd.brand}</h2>
                      <p className="text-white/80 text-lg mb-6">{currentAd.slogan}</p>
                      <button className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-full backdrop-blur-sm transition-all border border-white/30">
                        {currentAd.cta}
                      </button>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/30 backdrop-blur-sm rounded-full">
                      <Clock className="h-4 w-4 text-white" />
                      <span className="text-white font-mono font-bold">{adTimer}s</span>
                    </div>
                    {/* Indicateur de série */}
                    {isRowSession && (
                      <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 bg-purple-500/40 backdrop-blur-sm rounded-full border border-purple-400/30">
                        <span className="text-white text-sm font-bold">
                          {currentAdIndex}/{maxAdsInRow}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="h-1 bg-gray-800">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-1000"
                      style={{ width: `${((30 - adTimer) / 30) * 100}%` }}
                    />
                  </div>
                  <div className="p-4 bg-black/50 text-center">
                    <p className="text-xs text-muted-foreground">
                      🎬 Publicité simulée • Ne fermez pas cette fenêtre
                      {isRowSession && <span className="text-purple-300 ml-2">• Vidéo {currentAdIndex}/{maxAdsInRow}</span>}
                    </p>
                  </div>
                </div>
              ) : errorMessage ? (
                <div className="w-full h-80 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-900/50 to-orange-900/50">
                  <div className="text-red-400 text-5xl mb-4">⚠️</div>
                  <div className="text-red-400 font-bold text-xl mb-2">Impossible d'activer le boost</div>
                  <div className="text-white/80 text-center mb-4">{errorMessage}</div>
                  <Button
                    onClick={closeModal}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                  >
                    Fermer
                  </Button>
                </div>
              ) : (
                <div className="w-full h-80 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-900/50 to-emerald-900/50">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
                    <Sparkles className="h-16 w-16 text-green-400 mx-auto mb-4 animate-pulse relative z-10" />
                  </div>
                  <div className="text-green-400 font-bold text-2xl mb-2">🎉 Boost Activé !</div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 mb-2">
                    <span className="text-orange-300 font-bold">{tier}</span>
                    <span className="text-orange-400">x{multiplier}</span>
                  </div>
                  <div className="text-white/80 text-lg mb-2">
                    Boost actif pendant 1 heure
                  </div>
                  <div className="text-orange-300/70 text-sm mb-4">
                    Pubs regardées aujourd'hui: {adsWatchedToday + 1}/{maxAds}
                  </div>
                  
                  {/* Affichage de la progression en série */}
                  {isRowSession && (
                    <div className="mb-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        {[...Array(maxAdsInRow)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              i < currentAdIndex 
                                                ? 'bg-green-500 text-white' 
                            : i === currentAdIndex - 1
                              ? 'bg-purple-500 text-white ring-2 ring-purple-300'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                          >
                            {i < currentAdIndex ? <Check className="h-4 w-4" /> : i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Boutons d'action */}
                  {canContinueRow ? (
                    <Button
                      onClick={watchNextInRow}
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Vidéo suivante ({currentAdIndex}/{maxAdsInRow})
                    </Button>
                  ) : isRowComplete ? (
                    <Button
                      onClick={closeModal}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Série terminée ! ({maxAdsInRow}/{maxAdsInRow})
                    </Button>
                  ) : null}
                  
                  {boostPending && (
                    <div className="flex items-center gap-2 text-orange-400 mt-2">
                      <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Activation en cours...</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Croix de fermeture - visible après le visionnage */}
              {!isWatchingAd && !boostPending && (
                <div className="absolute top-4 right-4 z-20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeModal}
                    className="bg-black/30 hover:bg-black/50 text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
