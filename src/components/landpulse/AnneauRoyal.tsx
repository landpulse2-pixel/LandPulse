'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Target, Timer, Users, RotateCcw, Zap, AlertTriangle } from 'lucide-react';

// Types
interface Ring {
  id: number;
  x: number;
  y: number;
  targetSpike: number;
  phase: 'flying' | 'landing' | 'landed';
  points: number;
  color: string;
  startTime: number;
}

interface GameState {
  phase: 'waiting' | 'ad' | 'matching' | 'playing' | 'result';
  playerScore: number;
  opponentScore: number;
  timeLeft: number;
  cursorPosition: number;
  cursorSpeed: number;
  cursorDirection: number;
  lastPlayerHit: { color: string; points: number } | null;
  lastOpponentHit: { color: string; points: number } | null;
  victories: number;
  totalGames: number;
  adTimeLeft: number;
  flyingRing: Ring | null;
  landedRings: { spikeIndex: number; points: number; color: string }[];
  ringId: number;
  speedLevel: number;
  lastSpeedIncrease: number;
  combo: number;
  showSpeedWarning: boolean;
}

// Piquets avec leurs propriétés - 4 poteaux avec zones grises entre (PLUS PETITS = PLUS DIFFICILE)
const SPIKES = [
  { id: 'green', points: 1, color: '#22c55e', name: 'Commun', range: [0, 16] },      // 16% au lieu de 22%
  { id: 'blue', points: 2, color: '#3b82f6', name: 'Rare', range: [26, 40] },        // 14% au lieu de 20%
  { id: 'purple', points: 3, color: '#a855f7', name: 'Épique', range: [50, 62] },    // 12% au lieu de 20%
  { id: 'gold', points: 4, color: '#fbbf24', name: 'Légendaire', range: [72, 84] },  // 12% au lieu de 23%
];

// Zones grises (pas de points) entre les poteaux - PLUS GRANDES = PLUS DIFFICILE
const GRAY_ZONES = [
  { range: [16, 26] },  // 10% entre vert et bleu
  { range: [40, 50] },  // 10% entre bleu et violet
  { range: [62, 72] },  // 10% entre violet et or
  { range: [84, 100] }, // 16% après l'or (zone de raté)
];

// Récompenses selon victoires
const VICTORY_REWARDS = [
  { victories: 5, reward: 20 },
  { victories: 10, reward: 50 },
  { victories: 20, reward: 120 },
  { victories: 30, reward: 200 },
  { victories: 50, reward: 400 },
];

export function AnneauRoyal() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    playerScore: 0,
    opponentScore: 0,
    timeLeft: 60,
    cursorPosition: 50,
    cursorSpeed: 2.5, // Vitesse initiale plus rapide (plus difficile)
    cursorDirection: 1,
    lastPlayerHit: null,
    lastOpponentHit: null,
    victories: 0,
    totalGames: 0,
    adTimeLeft: 5,
    flyingRing: null,
    landedRings: [],
    ringId: 0,
    speedLevel: 1,
    lastSpeedIncrease: 60,
    combo: 0,
    showSpeedWarning: false,
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const cursorLoopRef = useRef<NodeJS.Timeout | null>(null);
  const opponentLoopRef = useRef<NodeJS.Timeout | null>(null);
  const adLoopRef = useRef<NodeJS.Timeout | null>(null);

  // touchAction: 'auto' permet le scroll normal de la page sur mobile

  // Calculer le piquet touché par la position du curseur
  const getSpikeHit = useCallback((position: number): { color: string; points: number; name: string; index: number } => {
    // D'abord vérifier si on est dans une zone grise
    for (const zone of GRAY_ZONES) {
      if (position >= zone.range[0] && position < zone.range[1]) {
        return { color: 'gray', points: 0, name: 'Raté', index: -1 };
      }
    }
    
    // Sinon vérifier les poteaux
    for (let i = SPIKES.length - 1; i >= 0; i--) {
      if (position >= SPIKES[i].range[0] && position < SPIKES[i].range[1]) {
        return { 
          color: SPIKES[i].id, 
          points: SPIKES[i].points, 
          name: SPIKES[i].name, 
          index: i 
        };
      }
    }
    return { color: 'gray', points: 0, name: 'Raté', index: -1 };
  }, []);

  // Animation du curseur avec accélération
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    cursorLoopRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.flyingRing) return prev;
        
        let newPosition = prev.cursorPosition + (prev.cursorDirection * prev.cursorSpeed);
        let newDirection = prev.cursorDirection;
        
        // Rebond aux limites
        if (newPosition >= 100) {
          newPosition = 100;
          newDirection = -1;
        } else if (newPosition <= 0) {
          newPosition = 0;
          newDirection = 1;
        }

        return {
          ...prev,
          cursorPosition: newPosition,
          cursorDirection: newDirection,
        };
      });
    }, 20); // Plus fluide (20ms au lieu de 30ms)

    return () => {
      if (cursorLoopRef.current) clearInterval(cursorLoopRef.current);
    };
  }, [gameState.phase]);

  // Accélération toutes les 10 secondes
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    const speedInterval = setInterval(() => {
      setGameState(prev => {
        const newSpeedLevel = prev.speedLevel + 1;
        const newSpeed = Math.min(2.5 + (newSpeedLevel * 1.2), 18); // Augmentation plus forte, max plus élevé
        const timeSinceLastIncrease = prev.lastSpeedIncrease - prev.timeLeft;
        
        if (timeSinceLastIncrease >= 8 && prev.timeLeft > 0) { // Toutes les 8s au lieu de 10s
          return {
            ...prev,
            cursorSpeed: newSpeed,
            speedLevel: newSpeedLevel,
            lastSpeedIncrease: prev.timeLeft,
            showSpeedWarning: true,
          };
        }
        return prev;
      });
      
      // Cacher le warning après 2 secondes
      setTimeout(() => {
        setGameState(prev => ({ ...prev, showSpeedWarning: false }));
      }, 2000);
    }, 1000);

    return () => clearInterval(speedInterval);
  }, [gameState.phase]);

  // Timer de publicité
  useEffect(() => {
    if (gameState.phase !== 'ad') return;

    adLoopRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.adTimeLeft <= 1) {
          return { ...prev, adTimeLeft: 0, phase: 'matching' };
        }
        return { ...prev, adTimeLeft: prev.adTimeLeft - 1 };
      });
    }, 1000);

    return () => {
      if (adLoopRef.current) clearInterval(adLoopRef.current);
    };
  }, [gameState.phase]);

  // Matching
  useEffect(() => {
    if (gameState.phase !== 'matching') return;

    const timer = setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        phase: 'playing',
        playerScore: 0,
        opponentScore: 0,
        timeLeft: 60,
        cursorPosition: 50,
        cursorSpeed: 2.5,
        cursorDirection: 1,
        lastPlayerHit: null,
        lastOpponentHit: null,
        flyingRing: null,
        landedRings: [],
        speedLevel: 1,
        lastSpeedIncrease: 60,
        combo: 0,
        showSpeedWarning: false,
      }));
    }, 2000 + Math.random() * 1000);

    return () => clearTimeout(timer);
  }, [gameState.phase]);

  // Timer du jeu
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    gameLoopRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          const won = prev.playerScore > prev.opponentScore;
          return {
            ...prev,
            timeLeft: 0,
            phase: 'result',
            victories: won ? prev.victories + 1 : prev.victories,
            totalGames: prev.totalGames + 1,
          };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState.phase]);

  // IA adversaire - PLUS FORTE
  useEffect(() => {
    if (gameState.phase !== 'playing') {
      if (opponentLoopRef.current) clearInterval(opponentLoopRef.current);
      return;
    }

    opponentLoopRef.current = setInterval(() => {
      const delay = 1000 + Math.random() * 1200; // Plus rapide (1-2.2s au lieu de 1.2-2.7s)
      
      setTimeout(() => {
        setGameState(prev => {
          if (prev.phase !== 'playing') return prev;
          
          // IA PLUS FORTE - vise mieux les bonnes zones
          let randomPos;
          const luck = Math.random();
          if (luck > 0.5) {
            // 50% chance de viser or/légendaire (au lieu de 30%)
            randomPos = 72 + Math.random() * 12; // Zone or précise
          } else if (luck > 0.25) {
            // 25% chance de viser violet
            randomPos = 50 + Math.random() * 12; // Zone violet précise
          } else {
            randomPos = Math.random() * 100; // 25% aléatoire
          }
          
          const hit = getSpikeHit(randomPos);
          
          return {
            ...prev,
            opponentScore: prev.opponentScore + hit.points,
            lastOpponentHit: { color: hit.color, points: hit.points },
          };
        });
        
        setTimeout(() => {
          setGameState(prev => ({ ...prev, lastOpponentHit: null }));
        }, 600);
      }, delay);
    }, 2000); // Intervalle plus court = plus difficile

    return () => {
      if (opponentLoopRef.current) clearInterval(opponentLoopRef.current);
    };
  }, [gameState.phase, getSpikeHit]);

  // Lancer l'anneau avec animation réaliste
  const handleThrow = useCallback(() => {
    if (gameState.phase !== 'playing' || gameState.flyingRing) return;

    const hit = getSpikeHit(gameState.cursorPosition);
    const newRingId = gameState.ringId + 1;
    
    // Si zone grise, on utilise une position par défaut
    const isGrayZone = hit.index === -1;
    const targetSpike = isGrayZone ? 1 : hit.index; // Par défaut au milieu
    const targetX = isGrayZone 
      ? gameState.cursorPosition 
      : (SPIKES[hit.index].range[0] + SPIKES[hit.index].range[1]) / 2;
    
    const ring: Ring = {
      id: newRingId,
      x: 50,
      y: 100,
      targetSpike: targetSpike,
      phase: 'flying',
      points: hit.points,
      color: hit.color,
      startTime: Date.now(),
    };

    setGameState(prev => ({
      ...prev,
      flyingRing: ring,
      ringId: newRingId,
    }));

    // Animation de vol
    const animationDuration = 600;
    const startTime = Date.now();
    
    const animateRing = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      const currentX = 50 + (targetX - 50) * progress;
      const height = Math.sin(progress * Math.PI) * 200;
      const currentY = 100 - height * (1 - progress * 0.3);
      
      setGameState(prev => {
        if (!prev.flyingRing) return prev;
        
        if (progress >= 1) {
          const newCombo = hit.points >= 3 ? prev.combo + 1 : 0;
          const comboBonus = newCombo >= 2 ? hit.points : 0;
          
          return {
            ...prev,
            flyingRing: null,
            playerScore: prev.playerScore + hit.points + comboBonus,
            lastPlayerHit: { color: hit.color, points: hit.points + comboBonus },
            combo: newCombo,
            landedRings: isGrayZone 
              ? prev.landedRings // Ne pas ajouter aux anneaux posés si zone grise
              : [...prev.landedRings.slice(-5), { 
                  spikeIndex: hit.index, 
                  points: hit.points, 
                  color: hit.color 
                }],
          };
        }
        
        return {
          ...prev,
          flyingRing: {
            ...prev.flyingRing,
            x: currentX,
            y: currentY,
          },
        };
      });
      
      if (progress < 1) {
        requestAnimationFrame(animateRing);
      }
    };
    
    requestAnimationFrame(animateRing);
    
    setTimeout(() => {
      setGameState(prev => ({ ...prev, lastPlayerHit: null }));
    }, 800);
  }, [gameState.phase, gameState.flyingRing, gameState.cursorPosition, gameState.ringId, getSpikeHit]);

  // Commencer avec pub
  const startGameWithAd = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'ad',
      adTimeLeft: 5,
      landedRings: [],
    }));
  }, []);

  // Passer la pub
  const skipAd = useCallback(() => {
    setGameState(prev => ({ ...prev, phase: 'matching' }));
  }, []);

  // Rejouer
  const playAgain = useCallback(() => {
    startGameWithAd();
  }, [startGameWithAd]);

  // Calculer la prochaine récompense
  const getNextReward = () => {
    for (const reward of VICTORY_REWARDS) {
      if (gameState.victories < reward.victories) {
        return reward;
      }
    }
    return null;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="glass-card border-yellow-500/30 overflow-hidden">
        <CardContent className="p-0">
          {/* Header compact */}
          <div className="bg-gradient-to-r from-amber-900/50 via-yellow-900/30 to-amber-900/50 p-4 border-b border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-yellow-400">Anneau Royal</h2>
                  <p className="text-xs text-yellow-200/60">Événement 2h • 1v1</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* Indicateur de vitesse */}
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Zap className={`h-4 w-4 ${gameState.speedLevel > 3 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`} />
                    <span className="text-sm font-bold text-yellow-400">x{gameState.speedLevel}</span>
                  </div>
                  <div className="text-[10px] text-yellow-200/50">Vitesse</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{gameState.victories}</div>
                  <div className="text-[10px] text-yellow-200/50">Victoires</div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning accélération */}
          {gameState.showSpeedWarning && (
            <div className="bg-red-500/20 border-b border-red-500/30 p-2 text-center animate-pulse">
              <span className="text-red-400 font-bold flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                ⚡ ACCÉLÉRATION ! Vitesse x{gameState.speedLevel}
              </span>
            </div>
          )}

          <div className="p-4">
            {/* Prochaine récompense */}
            {getNextReward() && gameState.phase === 'waiting' && (
              <div className="mb-4 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-300">🎁 Prochaine récompense: +{getNextReward()!.reward} PB</span>
                  <span className="text-purple-400">{gameState.victories}/{getNextReward()!.victories}</span>
                </div>
              </div>
            )}

            {/* Phase Waiting */}
            {gameState.phase === 'waiting' && (
              <div className="text-center py-6">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                  <Trophy className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Prêt pour le duel ?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Lancez des anneaux sur les piquets ! Difficulté croissante ⚡
                </p>
                
                {/* Aperçu des piquets */}
                <div className="flex justify-center gap-2 mb-4 flex-wrap">
                  {SPIKES.map((spike) => (
                    <div key={spike.id} className="text-center px-2 py-1 rounded bg-background/30">
                      <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ backgroundColor: spike.color }} />
                      <div className="text-xs font-bold" style={{ color: spike.color }}>
                        +{spike.points}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{spike.name}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-500/10 rounded-lg p-3 mb-4 border border-amber-500/20">
                  <p className="text-xs text-amber-200">
                    ⚠️ Le curseur accélère toutes les 10 secondes ! Soyez précis !
                  </p>
                </div>

                <Button 
                  onClick={startGameWithAd}
                  size="lg"
                  className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-lg px-8 shadow-lg shadow-orange-500/30"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Trouver un adversaire
                </Button>
              </div>
            )}

            {/* Phase Publicité */}
            {gameState.phase === 'ad' && (
              <div className="text-center py-6">
                <div className="max-w-md mx-auto">
                  <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3">
                      <h3 className="text-white font-bold">📢 Publicité</h3>
                      <p className="text-white/80 text-sm">Votre duel commence dans {gameState.adTimeLeft}s</p>
                    </div>
                    <div className="p-4">
                      <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                        <div className="text-center">
                          <div className="text-5xl mb-2">🎮</div>
                          <h4 className="text-lg font-bold text-white">LandPulse</h4>
                          <p className="text-gray-400 text-sm">Achetez des parcelles !</p>
                        </div>
                      </div>
                      <Button
                        onClick={skipAd}
                        disabled={gameState.adTimeLeft > 0}
                        className={`w-full ${gameState.adTimeLeft === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-600' : 'bg-gray-700'}`}
                      >
                        {gameState.adTimeLeft > 0 
                          ? `Patientez ${gameState.adTimeLeft}s...` 
                          : '▶ Passer et jouer'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Phase Matching */}
            {gameState.phase === 'matching' && (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-yellow-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">Recherche d&apos;adversaire...</h3>
                <p className="text-muted-foreground text-sm">Veuillez patienter</p>
              </div>
            )}

            {/* Phase Playing */}
            {gameState.phase === 'playing' && (
              <div className="space-y-3">
                {/* Timer et Scores compacts */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full">
                    <Timer className="h-4 w-4 text-red-400" />
                    <span className="text-xl font-mono font-bold text-red-400">
                      {gameState.timeLeft}s
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`text-center px-3 py-1 rounded-lg transition-all ${
                      gameState.lastPlayerHit ? 'bg-yellow-500/30 scale-110' : 'bg-green-500/10'
                    }`}>
                      <div className="text-[10px] text-green-400">VOUS</div>
                      <div className="text-xl font-bold text-green-400">{gameState.playerScore}</div>
                    </div>
                    <span className="text-muted-foreground">VS</span>
                    <div className={`text-center px-3 py-1 rounded-lg transition-all ${
                      gameState.lastOpponentHit ? 'bg-red-500/30 scale-110' : 'bg-red-500/10'
                    }`}>
                      <div className="text-[10px] text-red-400">ADV</div>
                      <div className="text-xl font-bold text-red-400">{gameState.opponentScore}</div>
                    </div>
                  </div>
                  
                  {/* Combo */}
                  {gameState.combo >= 2 && (
                    <div className="bg-purple-500/20 px-2 py-1 rounded animate-pulse">
                      <span className="text-purple-400 font-bold text-sm">🔥 x{gameState.combo}</span>
                    </div>
                  )}
                </div>

                {/* Zone de jeu principale */}
                <div className="anneau-game-area relative rounded-xl overflow-hidden border border-amber-600/30" style={{ height: '320px', touchAction: 'auto' }}>
                  {/* Fond avec dégradé */}
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/40 via-purple-900/30 to-amber-950/60" />
                  
                  {/* Étoiles */}
                  <div className="absolute inset-0">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 40}%`,
                          animationDelay: `${Math.random() * 2}s`,
                          opacity: Math.random() * 0.5 + 0.3,
                        }}
                      />
                    ))}
                  </div>

                  {/* Titre */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
                    <span className="bg-black/40 px-3 py-1 rounded-full text-xs text-amber-200 font-medium">
                      🎯 Zone de lancer
                    </span>
                  </div>

                  {/* Barre de position en haut - COULEURS VIVES */}
                  <div className="absolute top-10 left-4 right-4 z-10">
                    <div className="relative h-12 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg">
                      {/* Zones colorées avec zones grises */}
                      <div className="absolute inset-0 flex">
                        {SPIKES.map((spike, i) => {
                          // Calculer l'espace gris avant ce poteau (sauf le premier)
                          const grayBefore = i > 0 ? GRAY_ZONES[i - 1]?.range : null;
                          const grayWidth = grayBefore ? grayBefore[1] - grayBefore[0] : 0;
                          
                          return (
                            <div key={spike.id} className="flex h-full">
                              {/* Zone grise avant - avec motif diagonal */}
                              {grayWidth > 0 && (
                                <div 
                                  className="relative h-full"
                                  style={{ width: `${grayWidth}%`, backgroundColor: '#374151' }}
                                >
                                  {/* Motif de rayures diagonales */}
                                  <div 
                                    className="absolute inset-0 opacity-30"
                                    style={{
                                      background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #1f2937 4px, #1f2937 8px)',
                                    }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-gray-400 font-bold text-sm">✕</span>
                                  </div>
                                </div>
                              )}
                              {/* Zone colorée - VIVE ET SATURÉE */}
                              <div 
                                className="relative h-full"
                                style={{ width: `${spike.range[1] - spike.range[0]}%` }}
                              >
                                {/* Fond coloré saturé */}
                                <div 
                                  className="absolute inset-0"
                                  style={{ 
                                    background: `linear-gradient(180deg, ${spike.color} 0%, ${spike.color}cc 50%, ${spike.color}99 100%)`,
                                    boxShadow: `inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)`,
                                  }}
                                />
                                {/* Reflet brillant */}
                                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent" />
                                {/* Points */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-base font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                    +{spike.points}
                                  </span>
                                </div>
                              </div>
                              {/* Zone grise après le dernier poteau (or) */}
                              {i === SPIKES.length - 1 && (
                                <div 
                                  className="relative h-full"
                                  style={{ width: `${GRAY_ZONES[3].range[1] - GRAY_ZONES[3].range[0]}%`, backgroundColor: '#374151' }}
                                >
                                  <div 
                                    className="absolute inset-0 opacity-30"
                                    style={{
                                      background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #1f2937 4px, #1f2937 8px)',
                                    }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-gray-400 font-bold text-sm">✕</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Curseur */}
                      <div 
                        className="absolute top-0 transition-none z-20"
                        style={{ left: `${gameState.cursorPosition}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 bg-white rounded-full shadow-lg shadow-black/50 flex items-center justify-center border-2 border-yellow-400">
                            <span className="text-base">💍</span>
                          </div>
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Légende colorée sous la barre */}
                    <div className="flex justify-between mt-1 px-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                        <span className="text-white/80">Commun</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                        <span className="text-white/80">Rare</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#a855f7' }}></div>
                        <span className="text-white/80">Épique</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
                        <span className="text-white/80">Légendaire</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gray-600"></div>
                        <span className="text-white/60">Raté</span>
                      </div>
                    </div>
                  </div>

                  {/* Sol avec texture */}
                  <div className="absolute bottom-0 inset-x-0 h-1/3">
                    <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 via-green-800/60 to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-amber-900/80 to-green-900/40" />
                    {/* Herbe stylisée */}
                    <div className="absolute bottom-6 inset-x-0 flex justify-around">
                      {[...Array(30)].map((_, i) => (
                        <div 
                          key={i}
                          className="w-1 bg-green-600/60 rounded-t-full"
                          style={{ 
                            height: `${8 + Math.random() * 12}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Piquets avec zones grises entre eux */}
                  <div className="absolute bottom-12 left-0 right-0 flex justify-center items-end gap-4 px-4">
                    {SPIKES.map((spike, index) => {
                      const isHit = gameState.lastPlayerHit?.color === spike.id;
                      const ringsOnSpike = gameState.landedRings.filter(r => r.spikeIndex === index);
                      const zoneWidth = spike.range[1] - spike.range[0];
                      const isRare = zoneWidth < 10;
                      
                      return (
                        <div key={spike.id} className="flex items-end gap-4">
                          {/* Piquet coloré */}
                          <div 
                            className="relative flex flex-col items-center"
                            style={{ 
                              transform: `scale(${isRare ? 0.9 : 1})`,
                            }}
                          >
                            {/* Indicateur de zone rare */}
                            {isRare && (
                              <div className="absolute -top-6 text-xs text-cyan-400 animate-pulse">
                                ★ RARE
                              </div>
                            )}
                            
                            {/* Anneaux empilés */}
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                              {ringsOnSpike.slice(-4).map((ring, i) => (
                                <div 
                                  key={i}
                                  className="w-7 h-2 rounded-full border-2 shadow-lg mb-0.5"
                                  style={{ 
                                    borderColor: SPIKES[ring.spikeIndex].color,
                                    backgroundColor: `${SPIKES[ring.spikeIndex].color}30`,
                                    boxShadow: `0 0 8px ${SPIKES[ring.spikeIndex].color}50`,
                                  }}
                                />
                              ))}
                            </div>
                            
                            {/* Piquet 3D */}
                            <div 
                              className={`relative transition-all duration-300 ${isHit ? 'scale-125' : ''}`}
                            >
                              {/* Ombre */}
                              <div 
                                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/30 rounded-full blur-sm"
                              />
                              
                              {/* Base du piquet */}
                              <div 
                                className="w-5 rounded-t-xl shadow-xl"
                                style={{ 
                                  height: `${45 + spike.points * 8}px`,
                                  background: `linear-gradient(90deg, ${spike.color}40 0%, ${spike.color} 30%, ${spike.color} 70%, ${spike.color}40 100%)`,
                                  boxShadow: isHit 
                                    ? `0 0 25px ${spike.color}, 0 0 50px ${spike.color}50` 
                                    : `0 4px 12px rgba(0,0,0,0.5)`,
                                }}
                              >
                                {/* Pointe brillante */}
                                <div 
                                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-4 rounded-t-full"
                                  style={{ 
                                    background: `radial-gradient(circle at 30% 30%, white, ${spike.color})`,
                                    boxShadow: `0 0 10px ${spike.color}`,
                                  }}
                                />
                                
                                {/* Reflet */}
                                <div className="absolute inset-y-0 left-0 w-1/3 bg-white/10 rounded-t-xl" />
                              </div>
                              
                              {/* Base en bois */}
                              <div className="w-7 h-2 bg-gradient-to-b from-amber-700 to-amber-900 rounded-sm mt-0.5 mx-auto shadow" />
                            </div>
                            
                            {/* Label */}
                            <div 
                              className={`mt-1 text-[10px] font-bold ${isHit ? 'animate-bounce' : ''}`}
                              style={{ color: spike.color }}
                            >
                              {spike.points}pts
                            </div>
                          </div>
                          
                          {/* Zone grise entre les poteaux (sauf après le dernier) */}
                          {index < SPIKES.length - 1 && (
                            <div className="flex flex-col items-center opacity-50">
                              {/* Piquet gris */}
                              <div className="relative">
                                <div 
                                  className="w-3 rounded-t-lg"
                                  style={{ 
                                    height: '30px',
                                    background: 'linear-gradient(90deg, #4b5563 0%, #6b7280 50%, #4b5563 100%)',
                                  }}
                                />
                                <div className="w-4 h-1.5 bg-gray-700 rounded-sm mt-0.5 mx-auto" />
                              </div>
                              <span className="text-[8px] text-gray-500 mt-1">0pts</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Anneau en vol */}
                  {gameState.flyingRing && (
                    <div 
                      className="absolute z-30"
                      style={{ 
                        left: `${gameState.flyingRing.x}%`,
                        top: `${gameState.flyingRing.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div 
                        className="w-10 h-10 rounded-full border-[3px] shadow-2xl"
                        style={{ 
                          borderColor: gameState.flyingRing.color === 'gray' ? '#6b7280' : SPIKES[gameState.flyingRing.targetSpike]?.color || '#6b7280',
                          boxShadow: `0 0 30px ${gameState.flyingRing.color === 'gray' ? '#6b7280' : SPIKES[gameState.flyingRing.targetSpike]?.color || '#6b7280'}, 0 0 60px ${gameState.flyingRing.color === 'gray' ? '#6b7280' : SPIKES[gameState.flyingRing.targetSpike]?.color || '#6b7280'}50`,
                          animation: 'spin 0.3s linear infinite',
                        }}
                      >
                        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/40 to-transparent" />
                      </div>
                      {/* Traînée */}
                      <div 
                        className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full"
                        style={{ 
                          background: `radial-gradient(circle, ${gameState.flyingRing.color === 'gray' ? '#6b7280' : SPIKES[gameState.flyingRing.targetSpike]?.color || '#6b7280'}60, transparent)`,
                        }}
                      />
                    </div>
                  )}

                  {/* Position du lanceur */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
                    <span className="text-2xl">🧍</span>
                  </div>
                </div>

                {/* Bouton de lancer */}
                <Button
                  onClick={handleThrow}
                  disabled={gameState.flyingRing !== null}
                  size="lg"
                  className={`w-full h-14 text-lg font-bold shadow-xl transition-all ${
                    gameState.flyingRing 
                      ? 'bg-gray-600' 
                      : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 shadow-orange-500/30 hover:scale-[1.02]'
                  }`}
                >
                  {gameState.flyingRing ? (
                    <>
                      <span className="animate-spin mr-2 text-xl">💍</span>
                      Lancement...
                    </>
                  ) : (
                    <>
                      <span className="mr-2 text-2xl">💍</span>
                      LANCER L&apos;ANNEAU
                    </>
                  )}
                </Button>

                {/* Dernier résultat */}
                {gameState.lastPlayerHit && (
                  <div className="text-center animate-pulse">
                    <span className="text-lg font-bold" style={{ color: SPIKES.find(s => s.id === gameState.lastPlayerHit?.color)?.color }}>
                      +{gameState.lastPlayerHit.points} points !
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Phase Result */}
            {gameState.phase === 'result' && (
              <div className="text-center py-6">
                {gameState.playerScore > gameState.opponentScore ? (
                  <>
                    <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
                      <Trophy className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-400 mb-1">VICTOIRE !</h3>
                    <p className="text-muted-foreground text-sm mb-3">Vous avez gagné cette manche !</p>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-1">
                      +1 Victoire
                    </Badge>
                  </>
                ) : gameState.playerScore < gameState.opponentScore ? (
                  <>
                    <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/30">
                      <span className="text-4xl">😢</span>
                    </div>
                    <h3 className="text-2xl font-bold text-red-400 mb-1">DÉFAITE</h3>
                    <p className="text-muted-foreground text-sm">L&apos;adversaire a gagné...</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/30">
                      <span className="text-4xl">🤝</span>
                    </div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-1">ÉGALITÉ !</h3>
                    <p className="text-muted-foreground text-sm">Match serré !</p>
                  </>
                )}

                <div className="flex justify-center gap-6 my-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Vous</div>
                    <div className="text-2xl font-bold text-green-400">{gameState.playerScore}</div>
                  </div>
                  <div className="text-2xl font-bold self-center text-muted-foreground">VS</div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Adversaire</div>
                    <div className="text-2xl font-bold text-red-400">{gameState.opponentScore}</div>
                  </div>
                </div>

                {VICTORY_REWARDS.find(r => r.victories === gameState.victories) && gameState.playerScore > gameState.opponentScore && (
                  <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 mb-4">
                    <p className="text-yellow-400 font-semibold text-sm">
                      🎁 Récompense débloquée ! +{VICTORY_REWARDS.find(r => r.victories === gameState.victories)?.reward} PB
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={playAgain} variant="outline" className="flex-1">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Rejouer
                  </Button>
                  <Button 
                    onClick={() => setGameState(prev => ({ ...prev, phase: 'waiting' }))}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600"
                  >
                    Retour
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Style pour l'animation spin */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
