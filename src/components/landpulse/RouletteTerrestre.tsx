'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Timer, Users, RotateCcw, Coins } from 'lucide-react';

// Types
interface GameState {
  phase: 'waiting' | 'ad' | 'matching' | 'playing' | 'result';
  playerScore: number;
  opponentScore: number;
  timeLeft: number;
  isSpinning: boolean;
  lastPlayerResult: { multiplier: number; label: string; color: string } | null;
  lastOpponentResult: { multiplier: number; label: string; color: string } | null;
  wheelRotation: number;
  victories: number;
  totalGames: number;
  spinsCount: number;
  adTimeLeft: number;
}

// Segments de la roue
const WHEEL_SEGMENTS = [
  { multiplier: 0, label: 'PERDU', color: '#ef4444', probability: 0.15 },
  { multiplier: 1, label: 'x1', color: '#6b7280', probability: 0.25 },
  { multiplier: 2, label: 'x2', color: '#3b82f6', probability: 0.25 },
  { multiplier: 3, label: 'x3', color: '#8b5cf6', probability: 0.15 },
  { multiplier: 5, label: 'x5', color: '#f59e0b', probability: 0.10 },
  { multiplier: 10, label: 'x10', color: '#ef4444', probability: 0.07 },
  { multiplier: 25, label: 'x25', color: '#ec4899', probability: 0.025 },
  { multiplier: 50, label: 'x50', color: '#fbbf24', probability: 0.005 },
];

const BASE_BET = 10; // PB par tour

// Récompenses selon victoires
const VICTORY_REWARDS = [
  { victories: 5, reward: 20 },
  { victories: 10, reward: 50 },
  { victories: 20, reward: 120 },
  { victories: 30, reward: 200 },
  { victories: 50, reward: 400 },
];

// Fonction pour obtenir un segment aléatoire
function getRandomSegment(): { multiplier: number; label: string; color: string } {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const segment of WHEEL_SEGMENTS) {
    cumulative += segment.probability;
    if (rand <= cumulative) {
      return segment;
    }
  }
  return WHEEL_SEGMENTS[1]; // Default: x1
}

export function RouletteTerrestre() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    playerScore: 0,
    opponentScore: 0,
    timeLeft: 30,
    isSpinning: false,
    lastPlayerResult: null,
    lastOpponentResult: null,
    wheelRotation: 0,
    victories: 0,
    totalGames: 0,
    spinsCount: 0,
    adTimeLeft: 5,
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const opponentLoopRef = useRef<NodeJS.Timeout | null>(null);
  const adLoopRef = useRef<NodeJS.Timeout | null>(null);

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

  // IA adversaire (simulé)
  useEffect(() => {
    if (gameState.phase !== 'playing') {
      if (opponentLoopRef.current) clearInterval(opponentLoopRef.current);
      return;
    }

    opponentLoopRef.current = setInterval(() => {
      const delay = 3000 + Math.random() * 4000;
      
      setTimeout(() => {
        setGameState(prev => {
          if (prev.phase !== 'playing') return prev;
          
          const result = getRandomSegment();
          const points = result.multiplier * BASE_BET;
          
          return {
            ...prev,
            opponentScore: prev.opponentScore + points,
            lastOpponentResult: result,
          };
        });
        
        setTimeout(() => {
          setGameState(prev => ({ ...prev, lastOpponentResult: null }));
        }, 1000);
      }, delay);
    }, 5000);

    return () => {
      if (opponentLoopRef.current) clearInterval(opponentLoopRef.current);
    };
  }, [gameState.phase]);

  // Joueur tourne la roue
  const handleSpin = useCallback(() => {
    if (gameState.phase !== 'playing' || gameState.isSpinning) return;

    const result = getRandomSegment();
    const targetRotation = 1800 + Math.random() * 360; // 5+ tours minimum

    setGameState(prev => ({ 
      ...prev, 
      isSpinning: true,
      wheelRotation: prev.wheelRotation + targetRotation,
    }));

    // Animation de rotation
    setTimeout(() => {
      const points = result.multiplier * BASE_BET;
      
      setGameState(prev => ({
        ...prev,
        playerScore: prev.playerScore + points,
        isSpinning: false,
        lastPlayerResult: result,
        spinsCount: prev.spinsCount + 1,
      }));

      setTimeout(() => {
        setGameState(prev => ({ ...prev, lastPlayerResult: null }));
      }, 1200);
    }, 3000);
  }, [gameState.phase, gameState.isSpinning]);

  // Démarrer une nouvelle partie
  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      playerScore: 0,
      opponentScore: 0,
      timeLeft: 30,
      isSpinning: false,
      lastPlayerResult: null,
      lastOpponentResult: null,
      wheelRotation: 0,
      spinsCount: 0,
    }));
  }, []);

  // Matcher avec un adversaire (avec pub)
  const findMatch = useCallback(() => {
    setGameState(prev => ({ ...prev, phase: 'ad', adTimeLeft: 5 }));
  }, []);

  // Passer la pub
  const skipAd = useCallback(() => {
    setGameState(prev => ({ ...prev, phase: 'matching' }));
  }, []);

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
      <Card className="glass-card border-pink-500/30">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <span className="text-2xl">🎡</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-pink-400">Roulette Terrestre</h2>
                <p className="text-sm text-muted-foreground">Événement 2h • TOP 100</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{gameState.victories}</div>
                <div className="text-xs text-muted-foreground">Victoires</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-400">{gameState.totalGames}</div>
                <div className="text-xs text-muted-foreground">Parties</div>
              </div>
            </div>
          </div>

          {/* Prochaine récompense */}
          {getNextReward() && (
            <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-purple-300 text-sm">
                  🎁 Prochaine récompense: +{getNextReward()!.reward} PB
                </span>
                <span className="text-purple-400 text-sm">
                  {gameState.victories}/{getNextReward()!.victories} victoires
                </span>
              </div>
            </div>
          )}

          {/* Phase Waiting */}
          {gameState.phase === 'waiting' && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-5xl">
                🎡
              </div>
              <h3 className="text-2xl font-bold mb-2">Tentez votre chance !</h3>
              <p className="text-muted-foreground mb-6">
                Affrontez d&apos;autres joueurs à la roue de la fortune !
              </p>
              
              <div className="grid grid-cols-4 gap-2 mb-8 max-w-lg mx-auto">
                {WHEEL_SEGMENTS.slice(0, 4).map((segment) => (
                  <div key={segment.label} className="text-center p-2 rounded-lg bg-background/50">
                    <div 
                      className="w-8 h-8 mx-auto rounded-full mb-1"
                      style={{ backgroundColor: segment.color }}
                    />
                    <div className="text-sm font-bold">{segment.label}</div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground mb-6">
                Mise: {BASE_BET} PB par tour • Multipliez vos gains !
              </div>

              <Button 
                onClick={findMatch}
                size="lg"
                className="gradient-bg text-lg px-8"
              >
                <Users className="mr-2 h-5 w-5" />
                Trouver un adversaire
              </Button>
            </div>
          )}

          {/* Phase Publicité */}
          {gameState.phase === 'ad' && (
            <div className="text-center py-8">
              <div className="max-w-md mx-auto">
                <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-4">
                    <h3 className="text-white font-bold text-lg">📢 Publicité</h3>
                    <p className="text-white/80 text-sm">Votre roulette commence dans {gameState.adTimeLeft}s</p>
                  </div>
                  <div className="p-6">
                    <div className="aspect-video bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🎡</div>
                        <h4 className="text-xl font-bold text-white mb-2">LandPulse</h4>
                        <p className="text-gray-400">Tentez votre chance !</p>
                      </div>
                    </div>
                    <Button
                      onClick={skipAd}
                      disabled={gameState.adTimeLeft > 0}
                      className={`w-full ${gameState.adTimeLeft === 0 ? 'gradient-bg' : 'bg-gray-700 cursor-not-allowed'}`}
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
            <div className="text-center py-16">
              <Loader2 className="h-16 w-16 animate-spin text-pink-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Recherche d&apos;adversaire...</h3>
              <p className="text-muted-foreground">Veuillez patienter</p>
            </div>
          )}

          {/* Phase Playing */}
          {gameState.phase === 'playing' && (
            <div className="space-y-6">
              {/* Timer */}
              <div className="flex items-center justify-center gap-2">
                <Timer className="h-5 w-5 text-pink-400" />
                <span className="text-3xl font-mono font-bold text-pink-400">
                  {gameState.timeLeft}s
                </span>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                {/* Joueur */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  gameState.lastPlayerResult ? 'border-yellow-400 bg-yellow-500/20' : 'border-pink-500/30 bg-pink-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-pink-400 font-semibold">VOUS</span>
                    {gameState.lastPlayerResult && (
                      <span className={`text-xl font-bold ${gameState.lastPlayerResult.multiplier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gameState.lastPlayerResult.label} ({gameState.lastPlayerResult.multiplier * BASE_BET} PB)
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-bold text-center">{gameState.playerScore}</div>
                  <div className="text-xs text-center text-muted-foreground mt-1">
                    {gameState.spinsCount} tours
                  </div>
                </div>

                {/* Adversaire */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  gameState.lastOpponentResult ? 'border-red-400 bg-red-500/20' : 'border-red-500/30 bg-red-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-400 font-semibold">ADVERSAIRE</span>
                    {gameState.lastOpponentResult && (
                      <span className={`text-xl font-bold ${gameState.lastOpponentResult.multiplier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gameState.lastOpponentResult.label}
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-bold text-center">{gameState.opponentScore}</div>
                </div>
              </div>

              {/* Roue */}
              <div className="relative flex justify-center">
                {/* Flèche indicatrice */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-400" />
                </div>
                
                {/* Roue */}
                <div 
                  className="w-48 h-48 rounded-full border-4 border-yellow-400 relative overflow-hidden shadow-2xl"
                  style={{
                    transform: `rotate(${gameState.wheelRotation}deg)`,
                    transition: gameState.isSpinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                  }}
                >
                  {WHEEL_SEGMENTS.map((segment, index) => {
                    const angle = 360 / WHEEL_SEGMENTS.length;
                    return (
                      <div
                        key={segment.label}
                        className="absolute w-1/2 h-1/2 origin-bottom-right flex items-center justify-center"
                        style={{
                          transform: `rotate(${index * angle}deg) skewY(${90 - angle}deg)`,
                          backgroundColor: segment.color,
                        }}
                      >
                        <span 
                          className="text-white font-bold text-xs"
                          style={{ transform: `skewY(${-(90 - angle)}deg) rotate(${angle / 2}deg)` }}
                        >
                          {segment.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bouton de spin */}
              <Button
                onClick={handleSpin}
                disabled={gameState.isSpinning}
                size="lg"
                className={`w-full h-20 text-xl ${gameState.isSpinning ? 'bg-gray-500' : 'gradient-bg'}`}
              >
                <Coins className="mr-3 h-8 w-8" />
                {gameState.isSpinning ? 'TOURNEMENT...' : `TOURNER (${BASE_BET} PB)`}
              </Button>
            </div>
          )}

          {/* Phase Result */}
          {gameState.phase === 'result' && (
            <div className="text-center py-8">
              {gameState.playerScore > gameState.opponentScore ? (
                <>
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Trophy className="h-12 w-12 text-green-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-green-400 mb-2">VICTOIRE !</h3>
                  <p className="text-muted-foreground mb-4">Vous avez gagné le plus de points !</p>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg px-4 py-2">
                    +1 Victoire
                  </Badge>
                </>
              ) : gameState.playerScore < gameState.opponentScore ? (
                <>
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-4xl">😢</span>
                  </div>
                  <h3 className="text-3xl font-bold text-red-400 mb-2">DÉFAITE</h3>
                  <p className="text-muted-foreground mb-4">Votre adversaire a eu plus de chance...</p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-4xl">🤝</span>
                  </div>
                  <h3 className="text-3xl font-bold text-yellow-400 mb-2">ÉGALITÉ !</h3>
                  <p className="text-muted-foreground mb-4">Même score !</p>
                </>
              )}

              <div className="flex justify-center gap-8 my-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Vous</div>
                  <div className="text-3xl font-bold text-pink-400">{gameState.playerScore}</div>
                  <div className="text-xs text-muted-foreground">{gameState.spinsCount} tours</div>
                </div>
                <div className="text-4xl font-bold self-center">VS</div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Adversaire</div>
                  <div className="text-3xl font-bold text-red-400">{gameState.opponentScore}</div>
                </div>
              </div>

              {/* Récompense obtenue */}
              {VICTORY_REWARDS.find(r => r.victories === gameState.victories) && gameState.playerScore > gameState.opponentScore && (
                <div className="p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/30 mb-6">
                  <p className="text-yellow-400 font-semibold">
                    🎁 Récompense débloquée ! +{VICTORY_REWARDS.find(r => r.victories === gameState.victories)?.reward} PB
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  onClick={findMatch}
                  variant="outline"
                  className="flex-1"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Nouvelle partie
                </Button>
                <Button 
                  onClick={() => setGameState(prev => ({ ...prev, phase: 'waiting' }))}
                  className="flex-1 gradient-bg"
                >
                  Retour
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
