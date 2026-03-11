'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Timer, Users, RotateCcw, AlertTriangle, Zap } from 'lucide-react';

// Types
interface Obstacle {
  id: number;
  lane: number; // 0, 1, 2 (gauche, centre, droite)
  type: 'car' | 'truck' | 'barrier' | 'coin' | 'nitro';
  z: number; // Distance : 0 = loin (horizon), 100 = tout près
}

interface GameState {
  phase: 'waiting' | 'ad' | 'matching' | 'playing' | 'result';
  playerScore: number;
  opponentScore: number;
  timeLeft: number;
  playerLane: number;
  playerSpeed: number;
  obstacles: Obstacle[];
  obstacleId: number;
  roadOffset: number;
  playerCoins: number;
  nitroActive: boolean;
  nitroFuel: number;
  lastHit: { type: string; points: number } | null;
  victories: number;
  totalGames: number;
  adTimeLeft: number;
  speedLevel: number;
  showNitroWarning: boolean;
}

// Positions X des voies (pourcentage depuis le centre)
const LANE_POSITIONS = [-25, 0, 25]; // gauche, centre, droite

// Types d'obstacles
const OBSTACLE_TYPES = [
  { type: 'car', emoji: '🚗', points: -8, probability: 0.15 },
  { type: 'truck', emoji: '🚚', points: -12, probability: 0.08 },
  { type: 'barrier', emoji: '🚧', points: -5, probability: 0.10 },
  { type: 'coin', emoji: '💰', points: 10, probability: 0.40 },
  { type: 'nitro', emoji: '⚡', points: 5, probability: 0.27 },
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
    timeLeft: 45,
    playerLane: 1,
    playerSpeed: 3,
    obstacles: [],
    obstacleId: 0,
    roadOffset: 0,
    playerCoins: 0,
    nitroActive: false,
    nitroFuel: 100,
    lastHit: null,
    victories: 0,
    totalGames: 0,
    adTimeLeft: 5,
    speedLevel: 1,
    showNitroWarning: false,
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const roadLoopRef = useRef<NodeJS.Timeout | null>(null);
  const opponentLoopRef = useRef<NodeJS.Timeout | null>(null);
  const adLoopRef = useRef<NodeJS.Timeout | null>(null);
  const spawnLoopRef = useRef<NodeJS.Timeout | null>(null);

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
        timeLeft: 45,
        playerLane: 1,
        playerSpeed: 3,
        obstacles: [],
        roadOffset: 0,
        playerCoins: 0,
        nitroActive: false,
        nitroFuel: 100,
        lastHit: null,
        speedLevel: 1,
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
        
        const newSpeedLevel = Math.floor((45 - prev.timeLeft) / 10) + 1;
        const speedIncreased = newSpeedLevel > prev.speedLevel;
        
        return { 
          ...prev, 
          timeLeft: prev.timeLeft - 1,
          speedLevel: newSpeedLevel,
          playerSpeed: Math.min(3 + (newSpeedLevel - 1) * 1.5, 10),
          showNitroWarning: speedIncreased,
        };
      });
    }, 1000);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameState.phase]);

  // Cacher le warning d'accélération après 2 secondes
  useEffect(() => {
    if (!gameState.showNitroWarning) return;
    
    const timer = setTimeout(() => {
      setGameState(prev => ({ ...prev, showNitroWarning: false }));
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [gameState.showNitroWarning]);

  // Animation de la route
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    roadLoopRef.current = setInterval(() => {
      setGameState(prev => {
        const speed = prev.nitroActive ? prev.playerSpeed * 2 : prev.playerSpeed;
        return {
          ...prev,
          roadOffset: (prev.roadOffset + speed * 2) % 100,
        };
      });
    }, 30);

    return () => {
      if (roadLoopRef.current) clearInterval(roadLoopRef.current);
    };
  }, [gameState.phase]);

  // Spawn des obstacles
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    spawnLoopRef.current = setInterval(() => {
      setGameState(prev => {
        const count = Math.random() > 0.85 ? 2 : 1;
        const newObstacles: Obstacle[] = [];
        
        for (let i = 0; i < count; i++) {
          const rand = Math.random();
          let cumulative = 0;
          let selectedType = OBSTACLE_TYPES[0];
          
          for (const obs of OBSTACLE_TYPES) {
            cumulative += obs.probability;
            if (rand <= cumulative) {
              selectedType = obs;
              break;
            }
          }
          
          let lane = Math.floor(Math.random() * 3);
          if (i > 0 && newObstacles.length > 0) {
            while (lane === newObstacles[0].lane) {
              lane = Math.floor(Math.random() * 3);
            }
          }
          
          newObstacles.push({
            id: prev.obstacleId + i,
            lane,
            type: selectedType.type as Obstacle['type'],
            z: 0, // Commence à l'horizon
          });
        }
        
        return {
          ...prev,
          obstacles: [...prev.obstacles.slice(-12), ...newObstacles],
          obstacleId: prev.obstacleId + count,
        };
      });
    }, Math.max(500, 900 - (gameState.speedLevel - 1) * 100));

    return () => {
      if (spawnLoopRef.current) clearInterval(spawnLoopRef.current);
    };
  }, [gameState.phase, gameState.speedLevel]);

  // Déplacement et collision des obstacles
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    const moveInterval = setInterval(() => {
      setGameState(prev => {
        const speed = prev.nitroActive ? prev.playerSpeed * 1.5 : prev.playerSpeed;
        let scoreChange = 0;
        let nitroChange = 0;
        let hitInfo = null;
        
        // Déplacer les obstacles vers le joueur (z augmente)
        const updatedObstacles = prev.obstacles
          .map(obs => ({
            ...obs,
            z: obs.z + speed * 1.5,
          }))
          .filter(obs => obs.z < 110); // Supprimer ceux qui sont passés
        
        // Vérifier les collisions (quand l'obstacle est proche, z entre 85 et 100)
        for (const obs of updatedObstacles) {
          if (obs.z >= 85 && obs.z <= 100 && obs.lane === prev.playerLane) {
            const obsType = OBSTACLE_TYPES.find(o => o.type === obs.type);
            if (obsType) {
              if (obs.type === 'coin') {
                scoreChange += obsType.points;
                hitInfo = { type: 'coin', points: obsType.points };
              } else if (obs.type === 'nitro') {
                nitroChange = Math.min(prev.nitroFuel + 30, 100);
                scoreChange += obsType.points;
                hitInfo = { type: 'nitro', points: obsType.points };
              } else {
                scoreChange += obsType.points;
                hitInfo = { type: obs.type, points: obsType.points };
              }
            }
          }
        }
        
        // Retirer les obstacles collectés
        const finalObstacles = updatedObstacles.filter(obs => {
          if (obs.z >= 85 && obs.z <= 100 && obs.lane === prev.playerLane) {
            return obs.type !== 'coin' && obs.type !== 'nitro';
          }
          return true;
        });
        
        // Score passif pour la distance
        const distanceScore = prev.nitroActive ? 2 : 1;
        
        return {
          ...prev,
          obstacles: finalObstacles,
          playerScore: Math.max(0, prev.playerScore + scoreChange + distanceScore),
          nitroFuel: nitroChange > 0 ? nitroChange : Math.max(0, prev.nitroFuel - (prev.nitroActive ? 2 : 0)),
          nitroActive: nitroChange > 0 ? prev.nitroActive : (prev.nitroFuel <= 0 ? false : prev.nitroActive),
          lastHit: hitInfo,
        };
      });
    }, 40);

    return () => clearInterval(moveInterval);
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
        let scoreGain = 5;
        
        if (luck > 0.7) {
          scoreGain += 15;
        } else if (luck > 0.4) {
          scoreGain += 8;
        } else if (luck < 0.1) {
          scoreGain -= 5;
        }
        
        return {
          ...prev,
          opponentScore: Math.max(0, prev.opponentScore + scoreGain),
        };
      });
    }, 500);

    return () => {
      if (opponentLoopRef.current) clearInterval(opponentLoopRef.current);
    };
  }, [gameState.phase]);

  // Effacer le hit info
  useEffect(() => {
    if (gameState.lastHit) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, lastHit: null }));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState.lastHit]);

  // Contrôles clavier
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setGameState(prev => ({
          ...prev,
          playerLane: Math.max(0, prev.playerLane - 1),
        }));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setGameState(prev => ({
          ...prev,
          playerLane: Math.min(2, prev.playerLane + 1),
        }));
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        setGameState(prev => ({
          ...prev,
          nitroActive: prev.nitroFuel > 0 ? !prev.nitroActive : false,
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase]);

  // Changer de voie
  const moveLane = useCallback((direction: -1 | 1) => {
    setGameState(prev => ({
      ...prev,
      playerLane: Math.max(0, Math.min(2, prev.playerLane + direction)),
    }));
  }, []);

  // Activer nitro
  const toggleNitro = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      nitroActive: prev.nitroFuel > 0 ? !prev.nitroActive : false,
    }));
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

  // Calculer la taille et position Y en fonction de z (perspective 3D)
  const getObstacleStyle = (z: number, lane: number) => {
    // z: 0 = horizon (loin), 100 = tout près
    // Plus z est grand, plus l'objet est grand et bas dans l'écran
    
    const scale = 0.2 + (z / 100) * 1.2; // 0.2x à 1.4x
    const y = 10 + (z / 100) * 55; // 10% à 65% du haut
    const x = 50 + LANE_POSITIONS[lane] * (0.3 + (z / 100) * 0.7); // Ajustement perspective
    
    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: `translate(-50%, -50%) scale(${scale})`,
      fontSize: `${1 + scale}rem`,
      opacity: Math.min(1, z / 20), // Apparaît progressivement
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
                  <span className="text-xl">🏍️</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-orange-400">Moto Course 3D</h2>
                  <p className="text-xs text-orange-200/60">Événement 2h • 1v1</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Zap className={`h-4 w-4 ${gameState.speedLevel > 2 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`} />
                    <span className="text-sm font-bold text-orange-400">x{gameState.speedLevel}</span>
                  </div>
                  <div className="text-[10px] text-orange-200/50">Vitesse</div>
                </div>
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
                  <span className="text-4xl">🏍️</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Prêt pour la course ?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Vue arrière réaliste - Évitez les obstacles !
                </p>
                
                {/* Légende */}
                <div className="flex justify-center gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20">
                    <span>🚗</span>
                    <span className="text-xs text-red-400">-8</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/20">
                    <span>🚚</span>
                    <span className="text-xs text-red-400">-12</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/20">
                    <span>🚧</span>
                    <span className="text-xs text-yellow-400">-5</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/20">
                    <span>💰</span>
                    <span className="text-xs text-green-400">+10</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20">
                    <span>⚡</span>
                    <span className="text-xs text-blue-400">+Nitro</span>
                  </div>
                </div>

                <div className="bg-orange-500/10 rounded-lg p-3 mb-4 border border-orange-500/20">
                  <p className="text-xs text-orange-200">
                    🎮 Vue arrière 3D immersive ! Touchez les boutons pour changer de voie.
                  </p>
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
                          <div className="text-5xl mb-2">🏍️</div>
                          <h4 className="text-lg font-bold text-white">LandPulse Racing 3D</h4>
                          <p className="text-gray-400 text-sm">Vue arrière réaliste !</p>
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
              <div className="space-y-2">
                {/* Warning accélération */}
                {gameState.showNitroWarning && (
                  <div className="bg-red-500/20 border border-red-500/30 p-2 rounded-lg text-center animate-pulse">
                    <span className="text-red-400 font-bold flex items-center justify-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      ⚡ ACCÉLÉRATION ! Vitesse x{gameState.speedLevel}
                    </span>
                  </div>
                )}
                
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
                      gameState.lastHit?.type === 'coin' ? 'bg-green-500/30 scale-110' : 'bg-green-500/10'
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
                  
                  {/* Nitro */}
                  <button
                    onClick={toggleNitro}
                    disabled={gameState.nitroFuel === 0}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${
                      gameState.nitroActive ? 'bg-yellow-500/30 scale-105' : 'bg-blue-500/20'
                    } ${gameState.nitroFuel === 0 ? 'opacity-50' : 'active:scale-95'}`}
                  >
                    <span className="text-lg">⚡</span>
                    <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${gameState.nitroActive ? 'bg-yellow-400 animate-pulse' : 'bg-blue-500'}`}
                        style={{ width: `${gameState.nitroFuel}%` }}
                      />
                    </div>
                  </button>
                </div>

                {/* Zone de jeu - Vue arrière 3D */}
                <div 
                  className="moto-game-area relative rounded-xl overflow-hidden border-2 border-gray-600"
                  style={{ height: '380px', touchAction: 'auto' }}
                >
                  {/* Ciel et horizon */}
                  <div className="absolute inset-0 bg-gradient-to-b from-sky-900 via-sky-800 to-gray-700" />
                  
                  {/* Soleil couchant */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-10 bg-gradient-to-b from-orange-400 to-yellow-500 rounded-full blur-sm opacity-60" />
                  
                  {/* Montagnes lointaines */}
                  <div className="absolute top-[20%] left-0 right-0 h-16">
                    <svg viewBox="0 0 400 50" className="w-full h-full">
                      <path d="M0,50 L50,20 L100,40 L150,10 L200,35 L250,15 L300,30 L350,5 L400,25 L400,50 Z" fill="rgba(30,30,40,0.8)" />
                    </svg>
                  </div>
                  
                  {/* Route avec perspective */}
                  <div className="absolute bottom-0 left-0 right-0 h-[75%]">
                    {/* Route elle-même - triangle qui s'élargit vers le bas */}
                    <div 
                      className="absolute inset-x-[10%] bottom-0 h-full"
                      style={{
                        background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
                        clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
                      }}
                    >
                      {/* Lignes de route animées (vers le joueur) */}
                      {[...Array(10)].map((_, i) => {
                        const offset = ((i * 10 + gameState.roadOffset) % 100);
                        const perspective = offset / 100; // 0 = loin, 1 = près
                        const y = perspective * 100;
                        const width = 20 + perspective * 60; // Plus large vers le bas
                        
                        return (
                          <div
                            key={i}
                            className="absolute left-1/2 h-1 bg-yellow-400 rounded transition-none"
                            style={{
                              top: `${y}%`,
                              width: `${width}%`,
                              transform: 'translateX(-50%)',
                              opacity: 0.6 + perspective * 0.4,
                            }}
                          />
                        );
                      })}
                      
                      {/* Lignes de séparation des voies */}
                      <div className="absolute inset-0 flex justify-center" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)' }}>
                        <div className="w-px h-full bg-white/10" />
                      </div>
                      
                      {/* Bordures de route (blanc) */}
                      <div 
                        className="absolute top-0 bottom-0 w-2 bg-white"
                        style={{ 
                          left: '0%',
                          clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
                        }}
                      />
                      <div 
                        className="absolute top-0 bottom-0 w-2 bg-white"
                        style={{ 
                          right: '0%',
                          clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
                        }}
                      />
                    </div>
                    
                    {/* Herbe sur les côtés */}
                    <div className="absolute bottom-0 left-0 w-[15%] h-full bg-gradient-to-t from-green-800 to-green-900" />
                    <div className="absolute bottom-0 right-0 w-[15%] h-full bg-gradient-to-t from-green-800 to-green-900" />
                  </div>

                  {/* Obstacles avec perspective 3D */}
                  {gameState.obstacles.map((obs) => {
                    const style = getObstacleStyle(obs.z, obs.lane);
                    const isGood = obs.type === 'coin' || obs.type === 'nitro';
                    
                    return (
                      <div
                        key={obs.id}
                        className={`absolute transition-none pointer-events-none ${isGood ? 'animate-pulse' : ''}`}
                        style={{
                          ...style,
                          filter: isGood 
                            ? 'drop-shadow(0 0 10px gold)' 
                            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                          zIndex: Math.floor(obs.z),
                        }}
                      >
                        <span style={{ fontSize: 'inherit' }}>
                          {OBSTACLE_TYPES.find(o => o.type === obs.type)?.emoji}
                        </span>
                      </div>
                    );
                  })}

                  {/* Moto du joueur - Vue arrière */}
                  <div
                    className="absolute transition-all duration-150 pointer-events-none"
                    style={{
                      left: `${50 + LANE_POSITIONS[gameState.playerLane] * 0.7}%`,
                      bottom: '5%',
                      transform: 'translateX(-50%)',
                      zIndex: 100,
                    }}
                  >
                    {/* Effet nitro */}
                    {gameState.nitroActive && (
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="w-6 h-16 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full animate-pulse opacity-80" />
                        <div className="w-4 h-8 bg-gradient-to-t from-red-500 to-transparent rounded-full" />
                      </div>
                    )}
                    
                    {/* Moto emoji agrandi */}
                    <div 
                      className="text-6xl drop-shadow-lg"
                      style={{ 
                        filter: gameState.nitroActive ? 'drop-shadow(0 0 30px orange) drop-shadow(0 0 60px red)' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                        transform: gameState.nitroActive ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      🏍️
                    </div>
                    
                    {/* Effet de vitesse - lignes floues */}
                    {gameState.speedLevel > 1 && (
                      <>
                        <div className="absolute -left-8 top-1/2 w-6 h-0.5 bg-white/20 blur-sm" />
                        <div className="absolute -right-8 top-1/2 w-6 h-0.5 bg-white/20 blur-sm" />
                      </>
                    )}
                  </div>

                  {/* Hit feedback */}
                  {gameState.lastHit && (
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-bold animate-bounce pointer-events-none z-50">
                      <span className={gameState.lastHit.points > 0 ? 'text-green-400' : 'text-red-400'}>
                        {gameState.lastHit.points > 0 ? '+' : ''}{gameState.lastHit.points}
                      </span>
                    </div>
                  )}
                  
                  {/* Indicateur de voie actuelle (petit) */}
                  <div className="absolute top-2 right-2 flex gap-1 bg-black/30 px-2 py-1 rounded-full">
                    {[0, 1, 2].map(lane => (
                      <div 
                        key={lane}
                        className={`w-2 h-2 rounded-full transition-all ${
                          gameState.playerLane === lane 
                            ? 'bg-orange-400' 
                            : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Boutons de contrôle */}
                <div className="flex gap-3 mt-3">
                  {/* Bouton Gauche */}
                  <button
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      moveLane(-1);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-b from-orange-500/30 to-orange-600/30 border-2 border-orange-500/50 active:from-orange-500/50 active:to-orange-600/50 transition-all flex items-center justify-center gap-2 select-none"
                  >
                    <span className="text-3xl">◀</span>
                    <span className="text-orange-300 font-semibold">Gauche</span>
                  </button>
                  
                  {/* Indicateur de position */}
                  <div className="flex flex-col items-center justify-center px-2">
                    <div className="flex flex-col gap-1">
                      {[0, 1, 2].map(lane => (
                        <div 
                          key={lane}
                          className={`w-4 h-4 rounded-full transition-all ${
                            gameState.playerLane === lane 
                              ? 'bg-orange-400 scale-125' 
                              : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Bouton Droite */}
                  <button
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      moveLane(1);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-b from-orange-500/30 to-orange-600/30 border-2 border-orange-500/50 active:from-orange-500/50 active:to-orange-600/50 transition-all flex items-center justify-center gap-2 select-none"
                  >
                    <span className="text-orange-300 font-semibold">Droite</span>
                    <span className="text-3xl">▶</span>
                  </button>
                </div>
                
                {/* Instructions */}
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Touchez ◀ ou ▶ pour changer de voie
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
                    <p className="text-muted-foreground text-sm mb-3">Vous avez gagné la course !</p>
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
                    <p className="text-muted-foreground text-sm">L&apos;adversaire a fini devant...</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-500/30">
                      <span className="text-4xl">🤝</span>
                    </div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-1">ÉGALITÉ !</h3>
                    <p className="text-muted-foreground text-sm">Course serrée !</p>
                  </>
                )}

                <div className="flex justify-center gap-6 my-4">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Vous</div>
                    <div className="text-2xl font-bold text-orange-400">{gameState.playerScore}</div>
                    <div className="text-[10px] text-muted-foreground">{gameState.playerCoins} 💰</div>
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
