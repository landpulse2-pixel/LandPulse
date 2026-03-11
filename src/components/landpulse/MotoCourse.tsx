'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Timer, Users, RotateCcw, Zap, Gauge } from 'lucide-react';

// Types
interface GameState {
  phase: 'waiting' | 'ad' | 'matching' | 'playing' | 'result';
  playerScore: number;
  opponentScore: number;
  timeLeft: number;
  rpm: number; // 0-10000
  currentGear: number; // 1 à 6
  rpmDirection: 'up' | 'down';
  rpmSpeed: number;
  lastShift: { gear: number; points: number; zone: 'perfect' | 'good' | 'bad' | null } | null;
  victories: number;
  totalGames: number;
  adTimeLeft: number;
  speedLevel: number;
  showShiftWarning: boolean;
  roadOffset: number;
  combo: number;
  maxCombo: number;
  motoX: number; // Position horizontale de la moto pour effet de virage
}

// Configuration des vitesses
const GEARS = [
  { name: '1', maxRpm: 8000, optimalMin: 6500, optimalMax: 7500 },
  { name: '2', maxRpm: 8500, optimalMin: 7000, optimalMax: 8000 },
  { name: '3', maxRpm: 9000, optimalMin: 7500, optimalMax: 8500 },
  { name: '4', maxRpm: 9500, optimalMin: 8000, optimalMax: 9000 },
  { name: '5', maxRpm: 9800, optimalMin: 8500, optimalMax: 9500 },
  { name: '6', maxRpm: 10000, optimalMin: 9000, optimalMax: 9800 },
];

// Récompenses
const VICTORY_REWARDS = [
  { victories: 5, reward: 20 },
  { victories: 10, reward: 50 },
  { victories: 20, reward: 120 },
  { victories: 30, reward: 200 },
  { victories: 50, reward: 400 },
];

export function MotoCourse() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    playerScore: 0,
    opponentScore: 0,
    timeLeft: 60,
    rpm: 2000,
    currentGear: 1,
    rpmDirection: 'up',
    rpmSpeed: 80,
    lastShift: null,
    victories: 0,
    totalGames: 0,
    adTimeLeft: 5,
    speedLevel: 1,
    showShiftWarning: false,
    roadOffset: 0,
    combo: 0,
    maxCombo: 0,
    motoX: 50,
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const rpmLoopRef = useRef<NodeJS.Timeout | null>(null);
  const roadLoopRef = useRef<NodeJS.Timeout | null>(null);
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
        rpm: 2000,
        currentGear: 1,
        rpmDirection: 'up',
        rpmSpeed: 80,
        lastShift: null,
        speedLevel: 1,
        roadOffset: 0,
        combo: 0,
        maxCombo: 0,
        motoX: 50,
      }));
    }, 2000 + Math.random() * 1000);

    return () => clearTimeout(timer);
  }, [gameState.phase]);

  // Timer principal
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
        
        const newSpeedLevel = Math.min(6, Math.floor((60 - prev.timeLeft) / 10) + 1);
        
        return { 
          ...prev, 
          timeLeft: prev.timeLeft - 1,
          speedLevel: newSpeedLevel,
        };
      });
    }, 1000);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState.phase]);

  // Animation du compte-tour (RPM)
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    rpmLoopRef.current = setInterval(() => {
      setGameState(prev => {
        const gear = GEARS[prev.currentGear - 1];
        const baseSpeed = prev.rpmSpeed + (prev.speedLevel * 8);
        
        let newRpm = prev.rpm;
        let newDirection = prev.rpmDirection;
        let warning = false;
        
        if (prev.rpmDirection === 'up') {
          newRpm += baseSpeed / 8;
          
          if (newRpm >= gear.maxRpm) {
            newRpm = gear.maxRpm;
            return {
              ...prev,
              rpm: newRpm,
              rpmDirection: 'down',
              playerScore: Math.max(0, prev.playerScore - 30),
              combo: 0,
              lastShift: { gear: prev.currentGear, points: -30, zone: 'bad' },
              showShiftWarning: true,
            };
          }
          
          if (newRpm >= gear.optimalMin - 300) {
            warning = true;
          }
        } else {
          newRpm -= baseSpeed / 4;
          if (newRpm <= 2000) {
            newRpm = 2000;
            newDirection = 'up';
          }
        }
        
        // Effet de virage subtil
        const newMotoX = 50 + Math.sin(Date.now() / 1000) * 3;
        
        return {
          ...prev,
          rpm: newRpm,
          rpmDirection: newDirection,
          showShiftWarning: warning,
          motoX: newMotoX,
        };
      });
    }, 25);

    return () => {
      if (rpmLoopRef.current) clearInterval(rpmLoopRef.current);
    };
  }, [gameState.phase]);

  // Animation de la route
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    roadLoopRef.current = setInterval(() => {
      setGameState(prev => {
        const speed = (prev.rpm / 10000) * 20 * prev.currentGear;
        return {
          ...prev,
          roadOffset: (prev.roadOffset + speed) % 100,
        };
      });
    }, 30);

    return () => {
      if (roadLoopRef.current) clearInterval(roadLoopRef.current);
    };
  }, [gameState.phase]);

  // IA adversaire
  useEffect(() => {
    if (gameState.phase !== 'playing') {
      if (opponentLoopRef.current) clearInterval(opponentLoopRef.current);
      return;
    }

    opponentLoopRef.current = setInterval(() => {
      setGameState(prev => {
        const luck = Math.random();
        let scoreGain = 15;
        
        if (luck > 0.7) scoreGain = 80;
        else if (luck > 0.4) scoreGain = 45;
        else if (luck > 0.2) scoreGain = 20;
        else scoreGain = -10;
        
        return {
          ...prev,
          opponentScore: Math.max(0, prev.opponentScore + scoreGain),
        };
      });
    }, 800);

    return () => {
      if (opponentLoopRef.current) clearInterval(opponentLoopRef.current);
    };
  }, [gameState.phase]);

  // Effacer le feedback
  useEffect(() => {
    if (gameState.lastShift) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, lastShift: null }));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.lastShift]);

  // Effacer le warning
  useEffect(() => {
    if (gameState.showShiftWarning) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, showShiftWarning: false }));
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [gameState.showShiftWarning]);

  // Passer la vitesse
  const shiftGear = useCallback(() => {
    setGameState(prev => {
      if (prev.phase !== 'playing' || prev.currentGear >= 6) return prev;
      
      const gear = GEARS[prev.currentGear - 1];
      const optimalCenter = (gear.optimalMin + gear.optimalMax) / 2;
      const distanceFromOptimal = Math.abs(prev.rpm - optimalCenter);
      
      let points = 0;
      let zone: 'perfect' | 'good' | 'bad' = 'bad';
      
      if (distanceFromOptimal <= 250) {
        points = 100 + prev.combo * 10;
        zone = 'perfect';
      } else if (distanceFromOptimal <= 800) {
        points = 50;
        zone = 'good';
      } else {
        points = -20;
        zone = 'bad';
      }
      
      const newGear = prev.currentGear + 1;
      const newGearConfig = GEARS[newGear - 1];
      const newCombo = zone !== 'bad' ? prev.combo + 1 : 0;
      const newMaxCombo = Math.max(prev.maxCombo, newCombo);
      const comboBonus = newCombo >= 3 ? newCombo * 5 : 0;
      
      return {
        ...prev,
        currentGear: newGear,
        rpm: newGearConfig.optimalMin - 500,
        rpmDirection: 'up',
        playerScore: Math.max(0, prev.playerScore + points + comboBonus),
        lastShift: { gear: prev.currentGear, points: points + comboBonus, zone },
        combo: newCombo,
        maxCombo: newMaxCombo,
        showShiftWarning: false,
      };
    });
  }, []);

  // Démarrer avec pub
  const startGameWithAd = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'ad',
      adTimeLeft: 5,
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

  // Prochaine récompense
  const getNextReward = () => {
    for (const reward of VICTORY_REWARDS) {
      if (gameState.victories < reward.victories) {
        return reward;
      }
    }
    return null;
  };

  // Calculer la rotation de l'aiguille (-135° à +135°)
  const getNeedleRotation = () => {
    const minAngle = -135;
    const maxAngle = 135;
    const totalDegrees = maxAngle - minAngle;
    const percentage = (gameState.rpm - 1000) / 9000; // 1000 à 10000 RPM
    return minAngle + (percentage * totalDegrees);
  };

  // Position de la zone optimale sur le cadran
  const getOptimalZoneStyle = () => {
    const gear = GEARS[gameState.currentGear - 1];
    const startAngle = -135 + ((gear.optimalMin - 1000) / 9000) * 270;
    const endAngle = -135 + ((gear.optimalMax - 1000) / 9000) * 270;
    const arcAngle = endAngle - startAngle;
    
    return {
      startAngle,
      arcAngle,
    };
  };

  return (
    <div className="game-container w-full max-w-4xl mx-auto">
      <Card className="glass-card border-orange-500/30 overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-900/50 via-red-900/30 to-orange-900/50 p-4 border-b border-orange-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Gauge className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-orange-400">Moto Drag Race</h2>
                  <p className="text-xs text-orange-200/60">Passez les vitesses au bon moment !</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {gameState.combo >= 2 && (
                  <div className="bg-yellow-500/20 px-2 py-1 rounded animate-pulse">
                    <span className="text-yellow-400 font-bold text-sm">🔥 x{gameState.combo}</span>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{gameState.victories}</div>
                  <div className="text-[10px] text-orange-200/50">Victoires</div>
                </div>
              </div>
            </div>
          </div>

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
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-400 via-red-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                  <Gauge className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Drag Race - Passage de Vitesses</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Passez les vitesses au bon moment pour gagner !
                </p>
                
                {/* Explication */}
                <div className="bg-gray-900/50 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
                  <h4 className="font-semibold text-orange-400 mb-2">🎮 Comment jouer :</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• L&apos;aiguille du <strong className="text-orange-400">compte-tour monte</strong> automatiquement</li>
                    <li>• Appuyez sur <strong className="text-orange-400">PASSER</strong> dans la <strong className="text-green-400">zone verte</strong></li>
                    <li>• <strong className="text-green-400">Parfait</strong> = +100 pts | <strong className="text-yellow-400">Bien</strong> = +50 pts</li>
                    <li>• <strong className="text-red-400">Raté</strong> = -20 pts</li>
                    <li>• Enchaînez les passages parfaits pour un <strong className="text-yellow-400">bonus combo</strong> !</li>
                  </ul>
                </div>

                <Button 
                  onClick={startGameWithAd}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-lg px-8 shadow-lg shadow-orange-500/30"
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
                    <div className="bg-gradient-to-r from-orange-600 to-red-600 p-3">
                      <h3 className="text-white font-bold">📢 Publicité</h3>
                      <p className="text-white/80 text-sm">Votre course commence dans {gameState.adTimeLeft}s</p>
                    </div>
                    <div className="p-4">
                      <div className="aspect-video bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center mb-3">
                        <div className="text-center">
                          <div className="text-5xl mb-2">🏍️💨</div>
                          <h4 className="text-lg font-bold text-white">LandPulse Drag Race</h4>
                          <p className="text-gray-400 text-sm">Maîtrisez les vitesses !</p>
                        </div>
                      </div>
                      <Button
                        onClick={skipAd}
                        disabled={gameState.adTimeLeft > 0}
                        className={`w-full ${gameState.adTimeLeft === 0 ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gray-700'}`}
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
                <Loader2 className="h-12 w-12 animate-spin text-orange-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">Recherche d&apos;adversaire...</h3>
                <p className="text-muted-foreground text-sm">Veuillez patienter</p>
              </div>
            )}

            {/* Phase Playing */}
            {gameState.phase === 'playing' && (
              <div className="space-y-3">
                {/* Timer et Scores */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full">
                    <Timer className="h-4 w-4 text-red-400" />
                    <span className="text-xl font-mono font-bold text-red-400">
                      {gameState.timeLeft}s
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`text-center px-3 py-1 rounded-lg transition-all ${
                      gameState.lastShift?.zone === 'perfect' ? 'bg-green-500/30 scale-110' : 'bg-green-500/10'
                    }`}>
                      <div className="text-[10px] text-green-400">VOUS</div>
                      <div className="text-xl font-bold text-green-400">{gameState.playerScore}</div>
                    </div>
                    <span className="text-muted-foreground">VS</span>
                    <div className="text-center px-3 py-1 rounded-lg bg-red-500/10">
                      <div className="text-[10px] text-red-400">ADV</div>
                      <div className="text-xl font-bold text-red-400">{gameState.opponentScore}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full">
                    <span className="text-sm font-bold text-orange-400">V{gameState.currentGear}</span>
                  </div>
                </div>

                {/* Zone de jeu - Moto vue de côté avec route */}
                <div 
                  className="moto-game-area relative rounded-xl overflow-hidden border-2 border-gray-600"
                  style={{ height: '200px', touchAction: 'auto' }}
                >
                  {/* Fond route */}
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900">
                    {/* Lignes de route animées */}
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-1/2 -translate-x-1/2 w-2 h-10 bg-yellow-400 rounded"
                        style={{
                          top: `${((i * 9) + gameState.roadOffset) % 120 - 10}%`,
                          opacity: 0.6,
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Lignes de voie */}
                  <div className="absolute inset-0 flex justify-around pointer-events-none">
                    <div className="w-px h-full bg-white/10" />
                    <div className="w-px h-full bg-white/10" />
                  </div>

                  {/* Moto vue de côté */}
                  <div
                    className="absolute transition-all duration-100"
                    style={{
                      left: `${gameState.motoX}%`,
                      bottom: '15%',
                      transform: 'translateX(-50%)',
                      fontSize: '4rem',
                      filter: gameState.rpm > 8000 ? 'drop-shadow(0 0 20px orange)' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                    }}
                  >
                    🏍️
                    {/* Effet de vitesse */}
                    {gameState.rpm > 6000 && (
                      <div className="absolute -left-4 top-1/2 w-3 h-0.5 bg-white/40 blur-sm" />
                    )}
                  </div>
                  
                  {/* Feedback de passage */}
                  {gameState.lastShift && (
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center z-30 animate-bounce">
                      <div className={`text-xl font-black ${gameState.lastShift.zone === 'perfect' ? 'text-green-400' : gameState.lastShift.zone === 'good' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {gameState.lastShift.zone === 'perfect' && '🔥 PARFAIT!'}
                        {gameState.lastShift.zone === 'good' && '👍 BIEN!'}
                        {gameState.lastShift.zone === 'bad' && '😵 RATÉ'}
                      </div>
                      <div className={`text-sm font-bold ${gameState.lastShift.points > 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {gameState.lastShift.points > 0 ? '+' : ''}{gameState.lastShift.points}
                      </div>
                    </div>
                  )}
                  
                  {/* Warning */}
                  {gameState.showShiftWarning && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
                      <div className="bg-green-500/30 border border-green-500/50 px-2 py-0.5 rounded-full animate-pulse">
                        <span className="text-green-400 font-bold text-xs">PASSER!</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Compte-tour circulaire avec aiguille */}
                <div className="flex gap-3 items-center">
                  {/* Indicateur vitesse */}
                  <div className="w-16 h-16 rounded-full bg-gray-900 border-2 border-orange-500/50 flex flex-col items-center justify-center">
                    <span className="text-xs text-muted-foreground">Vit.</span>
                    <span className="text-2xl font-black text-orange-400">{gameState.currentGear}</span>
                  </div>
                  
                  {/* Compte-tour circulaire */}
                  <div className="flex-1 bg-gray-900 rounded-xl p-4 border border-gray-700">
                    <div className="relative w-full aspect-[2/1] flex items-end justify-center">
                      {/* Cadran du compte-tour (demi-cercle) */}
                      <svg viewBox="0 0 200 110" className="w-full h-full">
                        {/* Fond du cadran */}
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="20"
                          strokeLinecap="round"
                        />
                        
                        {/* Zone rouge (sur-régime) */}
                        <path
                          d="M 160 35 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke="#dc2626"
                          strokeWidth="20"
                          strokeLinecap="round"
                          opacity="0.8"
                        />
                        
                        {/* Zone optimale (verte) - dynamique selon la vitesse */}
                        {(() => {
                          const gear = GEARS[gameState.currentGear - 1];
                          const startAngle = Math.PI - ((gear.optimalMin - 1000) / 9000) * Math.PI;
                          const endAngle = Math.PI - ((gear.optimalMax - 1000) / 9000) * Math.PI;
                          
                          const startX = 100 + 80 * Math.cos(startAngle);
                          const startY = 100 - 80 * Math.sin(startAngle);
                          const endX = 100 + 80 * Math.cos(endAngle);
                          const endY = 100 - 80 * Math.sin(endAngle);
                          
                          const largeArc = 0;
                          
                          return (
                            <path
                              d={`M ${startX} ${startY} A 80 80 0 ${largeArc} 1 ${endX} ${endY}`}
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="22"
                              strokeLinecap="round"
                              opacity="0.9"
                              className="animate-pulse"
                            />
                          );
                        })()}
                        
                        {/* Graduations */}
                        {[0, 2, 4, 6, 8, 10].map((num, i) => {
                          const angle = Math.PI - (i / 5) * Math.PI;
                          const x = 100 + 65 * Math.cos(angle);
                          const y = 100 - 65 * Math.sin(angle);
                          return (
                            <text
                              key={num}
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="fill-gray-400 text-xs font-bold"
                            >
                              {num}
                            </text>
                          );
                        })}
                        
                        {/* Aiguille */}
                        <g transform={`rotate(${getNeedleRotation()}, 100, 100)`}>
                          <line
                            x1="100"
                            y1="100"
                            x2="100"
                            y2="35"
                            stroke="#ffffff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="drop-shadow-lg"
                          />
                          <circle cx="100" cy="100" r="8" fill="#f97316" stroke="#fff" strokeWidth="2" />
                        </g>
                        
                        {/* Texte RPM */}
                        <text
                          x="100"
                          y="95"
                          textAnchor="middle"
                          className={`text-sm font-bold ${gameState.rpm >= GEARS[gameState.currentGear - 1].optimalMin && gameState.rpm <= GEARS[gameState.currentGear - 1].optimalMax ? 'fill-green-400' : gameState.rpm >= 8000 ? 'fill-red-400' : 'fill-white'}`}
                        >
                          {Math.round(gameState.rpm / 1000)}K
                        </text>
                        <text
                          x="100"
                          y="108"
                          textAnchor="middle"
                          className="fill-gray-500 text-[8px]"
                        >
                          RPM x1000
                        </text>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Indicateur combo */}
                  {gameState.combo >= 2 && (
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex flex-col items-center justify-center animate-pulse">
                      <span className="text-xs text-yellow-400">COMBO</span>
                      <span className="text-xl font-black text-yellow-400">x{gameState.combo}</span>
                    </div>
                  )}
                </div>

                {/* Bouton de passage de vitesse */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    shiftGear();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={`w-full py-5 rounded-xl border-2 transition-all flex items-center justify-center gap-3 select-none shadow-lg ${
                    gameState.showShiftWarning 
                      ? 'bg-gradient-to-b from-green-500 to-green-600 border-green-400 shadow-green-500/30 animate-pulse' 
                      : 'bg-gradient-to-b from-orange-500 to-red-600 border-orange-400 shadow-orange-500/30'
                  } active:scale-95`}
                >
                  <Zap className="h-6 w-6 text-white" />
                  <span className="text-xl font-black text-white">
                    {gameState.showShiftWarning ? '🎯 PASSER MAINTENANT!' : '⚡ PASSER LA VITESSE ⚡'}
                  </span>
                  <Zap className="h-6 w-6 text-white" />
                </button>
                
                {/* Instructions */}
                <p className="text-center text-xs text-muted-foreground">
                  Appuyez quand l&apos;aiguille est dans la <span className="text-green-400 font-bold">zone verte</span> !
                </p>
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
                    <p className="text-muted-foreground text-sm mb-3">Vous avez maîtrisé les vitesses !</p>
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
                    <p className="text-muted-foreground text-sm">L&apos;adversaire a eu un meilleur timing...</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/30">
                      <span className="text-4xl">🤝</span>
                    </div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-1">ÉGALITÉ !</h3>
                    <p className="text-muted-foreground text-sm">Même score !</p>
                  </>
                )}

                <div className="flex justify-center gap-6 my-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Vous</div>
                    <div className="text-2xl font-bold text-orange-400">{gameState.playerScore}</div>
                    <div className="text-[10px] text-muted-foreground">Max combo: {gameState.maxCombo}</div>
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
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
                  >
                    Retour
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
