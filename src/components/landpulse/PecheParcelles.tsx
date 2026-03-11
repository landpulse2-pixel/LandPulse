'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Fish, Timer, Users, RotateCcw, AlertTriangle } from 'lucide-react';

// Types
interface SwimmingItem {
  id: number;
  type: 'fish' | 'trash';
  fishType?: string;
  points: number;
  emoji: string;
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1;
  size: number;
}

interface GameState {
  phase: 'waiting' | 'ad' | 'matching' | 'playing' | 'result';
  playerScore: number;
  opponentScore: number;
  timeLeft: number;
  swimmingItems: SwimmingItem[];
  itemId: number;
  lastPlayerCatch: { type: string; points: number; emoji: string } | null;
  lastOpponentCatch: { type: string; points: number; emoji: string } | null;
  victories: number;
  totalGames: number;
  adTimeLeft: number;
  combo: number;
  speedLevel: number;
  lastSpeedIncrease: number;
  showSpeedWarning: boolean;
}

// Types de poissons
const FISH_TYPES = [
  { type: 'legendary', points: 100, emoji: '🐠', name: 'Légendaire', speed: 4, size: 50, probability: 0.03 },
  { type: 'epic', points: 50, emoji: '🐡', name: 'Épique', speed: 3, size: 45, probability: 0.08 },
  { type: 'rare', points: 25, emoji: '🐟', name: 'Rare', speed: 2.5, size: 40, probability: 0.20 },
  { type: 'common', points: 10, emoji: '🐟', name: 'Commun', speed: 2, size: 35, probability: 0.35 },
  { type: 'shrimp', points: 5, emoji: '🦐', name: 'Crevette', speed: 1.5, size: 25, probability: 0.15 },
];

// Déchets (pièges)
const TRASH_TYPES = [
  { type: 'boot', points: -15, emoji: '👢', name: 'Vieille botte', speed: 1, size: 35, probability: 0.04 },
  { type: 'tire', points: -20, emoji: '🛞', name: 'Pneu', speed: 0.8, size: 45, probability: 0.03 },
  { type: 'can', points: -5, emoji: '🥫', name: 'Boîte', speed: 1.5, size: 25, probability: 0.05 },
  { type: 'bag', points: -10, emoji: '🛍️', name: 'Sac plastique', speed: 1.2, size: 30, probability: 0.04 },
  { type: 'jellyfish', points: -25, emoji: '🪼', name: 'Méduse', speed: 2, size: 35, probability: 0.03 },
];

// Récompenses selon victoires
const VICTORY_REWARDS = [
  { victories: 5, reward: 20 },
  { victories: 10, reward: 50 },
  { victories: 20, reward: 120 },
  { victories: 30, reward: 200 },
  { victories: 50, reward: 400 },
];

export function PecheParcelles() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    playerScore: 0,
    opponentScore: 0,
    timeLeft: 60,
    swimmingItems: [],
    itemId: 0,
    lastPlayerCatch: null,
    lastOpponentCatch: null,
    victories: 0,
    totalGames: 0,
    adTimeLeft: 5,
    combo: 0,
    speedLevel: 1,
    lastSpeedIncrease: 60,
    showSpeedWarning: false,
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const opponentLoopRef = useRef<NodeJS.Timeout | null>(null);
  const adLoopRef = useRef<NodeJS.Timeout | null>(null);
  const spawnLoopRef = useRef<NodeJS.Timeout | null>(null);
  const moveLoopRef = useRef<NodeJS.Timeout | null>(null);

  // touchAction: 'auto' permet le scroll normal de la page sur mobile

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
        swimmingItems: [],
        lastPlayerCatch: null,
        lastOpponentCatch: null,
        combo: 0,
      }));
    }, 2000 + Math.random() * 1000);

    return () => clearTimeout(timer);
  }, [gameState.phase]);

  // Timer principal avec accélération
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
        
        const newTimeLeft = prev.timeLeft - 1;
        
        // Vérifier si on doit accélérer (toutes les 10 secondes)
        const timeSinceLastIncrease = prev.lastSpeedIncrease - newTimeLeft;
        let newSpeedLevel = prev.speedLevel;
        let newLastSpeedIncrease = prev.lastSpeedIncrease;
        let showWarning = false;
        
        if (timeSinceLastIncrease >= 10 && prev.speedLevel < 4) {
          newSpeedLevel = prev.speedLevel + 1;
          newLastSpeedIncrease = newTimeLeft;
          showWarning = true;
        }
        
        return { 
          ...prev, 
          timeLeft: newTimeLeft,
          speedLevel: newSpeedLevel,
          lastSpeedIncrease: newLastSpeedIncrease,
          showSpeedWarning: showWarning,
        };
      });
    }, 1000);

    // Cacher le warning après 2 secondes
    const warningTimeout = setInterval(() => {
      setGameState(prev => ({ ...prev, showSpeedWarning: false }));
    }, 2000);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      clearInterval(warningTimeout);
    };
  }, [gameState.phase]);

  // Spawn des poissons et déchets - vitesse selon speedLevel
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    // Plus le speedLevel est élevé, plus le spawn est rapide
    // Départ lent (1500ms) puis accélération progressive (max niveau 4)
    const spawnInterval = Math.max(700, 1500 - (gameState.speedLevel - 1) * 200);

    spawnLoopRef.current = setInterval(() => {
      setGameState(prev => {
        const newItems: SwimmingItem[] = [];
        const count = Math.random() > 0.7 ? 2 : 1;
        
        for (let i = 0; i < count; i++) {
          // Décider si c'est un poisson ou un déchet (15% chance de déchet)
          const isTrash = Math.random() < 0.15;
          
          let selectedItem: typeof FISH_TYPES[0] | typeof TRASH_TYPES[0];
          let type: 'fish' | 'trash';
          
          if (isTrash) {
            // Sélectionner un déchet
            const rand = Math.random();
            let cumulative = 0;
            for (const trash of TRASH_TYPES) {
              cumulative += trash.probability;
              if (rand <= cumulative) {
                selectedItem = trash;
                break;
              }
            }
            if (!selectedItem) selectedItem = TRASH_TYPES[0];
            type = 'trash';
          } else {
            // Sélectionner un poisson
            const rand = Math.random();
            let cumulative = 0;
            for (const fish of FISH_TYPES) {
              cumulative += fish.probability;
              if (rand <= cumulative) {
                selectedItem = fish;
                break;
              }
            }
            if (!selectedItem) selectedItem = FISH_TYPES[3]; // Default: common
            type = 'fish';
          }
          
          const direction = Math.random() > 0.5 ? 1 : -1;
          const y = 20 + Math.random() * 60; // Position verticale aléatoire
          
          // La vitesse augmente avec le speedLevel (départ plus lent, max 1.4x)
          const speedMultiplier = 0.8 + (prev.speedLevel - 1) * 0.2;
          
          newItems.push({
            id: prev.itemId + i,
            type,
            fishType: type === 'fish' ? (selectedItem as typeof FISH_TYPES[0]).type : undefined,
            points: selectedItem.points,
            emoji: selectedItem.emoji,
            x: direction === 1 ? -10 : 110,
            y,
            speed: (selectedItem.speed + (Math.random() * 0.5)) * speedMultiplier,
            direction: direction as 1 | -1,
            size: selectedItem.size,
          });
        }
        
        return {
          ...prev,
          swimmingItems: [...prev.swimmingItems.slice(-15), ...newItems],
          itemId: prev.itemId + count,
        };
      });
    }, spawnInterval);

    return () => {
      if (spawnLoopRef.current) clearInterval(spawnLoopRef.current);
    };
  }, [gameState.phase, gameState.speedLevel]);

  // Animation des poissons
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    moveLoopRef.current = setInterval(() => {
      setGameState(prev => {
        const speedMultiplier = 0.8 + (prev.speedLevel - 1) * 0.2;
        const updatedItems = prev.swimmingItems
          .map(item => ({
            ...item,
            x: item.x + (item.speed * item.direction * speedMultiplier),
          }))
          .filter(item => item.x > -15 && item.x < 115);
        
        return { ...prev, swimmingItems: updatedItems };
      });
    }, 50);

    return () => {
      if (moveLoopRef.current) clearInterval(moveLoopRef.current);
    };
  }, [gameState.phase]);

  // IA adversaire
  useEffect(() => {
    if (gameState.phase !== 'playing') {
      if (opponentLoopRef.current) clearInterval(opponentLoopRef.current);
      return;
    }

    opponentLoopRef.current = setInterval(() => {
      const delay = 1500 + Math.random() * 2500;
      
      setTimeout(() => {
        setGameState(prev => {
          if (prev.phase !== 'playing') return prev;
          
          // IA a une chance de pêcher quelque chose
          const isTrash = Math.random() < 0.12;
          let catch_: { points: number; emoji: string; name: string };
          
          if (isTrash) {
            const trash = TRASH_TYPES[Math.floor(Math.random() * TRASH_TYPES.length)];
            catch_ = { points: trash.points, emoji: trash.emoji, name: trash.name };
          } else {
            const rand = Math.random();
            let cumulative = 0;
            for (const fish of FISH_TYPES) {
              cumulative += fish.probability;
              if (rand <= cumulative) {
                catch_ = { points: fish.points, emoji: fish.emoji, name: fish.name };
                break;
              }
            }
            if (!catch_) catch_ = { points: 10, emoji: '🐟', name: 'Commun' };
          }
          
          return {
            ...prev,
            opponentScore: prev.opponentScore + catch_.points,
            lastOpponentCatch: catch_,
          };
        });
        
        setTimeout(() => {
          setGameState(prev => ({ ...prev, lastOpponentCatch: null }));
        }, 800);
      }, delay);
    }, 3000);

    return () => {
      if (opponentLoopRef.current) clearInterval(opponentLoopRef.current);
    };
  }, [gameState.phase]);

  // Capturer un poisson/déchet
  const handleCatch = useCallback((item: SwimmingItem, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (gameState.phase !== 'playing') return;
    
    setGameState(prev => {
      // Retirer l'élément capturé
      const newItems = prev.swimmingItems.filter(i => i.id !== item.id);
      
      // Calculer le combo
      const newCombo = item.type === 'fish' && item.points > 0 ? prev.combo + 1 : 0;
      const comboBonus = newCombo >= 3 ? Math.floor(item.points * 0.2) : 0;
      
      return {
        ...prev,
        swimmingItems: newItems,
        playerScore: prev.playerScore + item.points + comboBonus,
        lastPlayerCatch: { 
          type: item.type, 
          points: item.points + comboBonus, 
          emoji: item.emoji 
        },
        combo: newCombo,
      };
    });
    
    setTimeout(() => {
      setGameState(prev => ({ ...prev, lastPlayerCatch: null }));
    }, 800);
  }, [gameState.phase]);

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
      <Card className="glass-card border-blue-500/30 overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900/50 via-cyan-900/30 to-blue-900/50 p-4 border-b border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Fish className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-blue-400">Pêche aux Parcelles</h2>
                  <p className="text-xs text-blue-200/60">Événement 2h • 1v1</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {gameState.combo >= 3 && (
                  <div className="bg-yellow-500/20 px-2 py-1 rounded animate-pulse">
                    <span className="text-yellow-400 font-bold text-sm">🔥 x{gameState.combo}</span>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">{gameState.victories}</div>
                  <div className="text-[10px] text-blue-200/50">Victoires</div>
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
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <Fish className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Prêt pour la pêche ?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Cliquez sur les poissons pour les attraper ! Attention aux déchets 🗑️
                </p>
                
                {/* Légende */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    <h4 className="text-green-400 font-semibold text-sm mb-2">🐟 Poissons</h4>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {FISH_TYPES.map((fish) => (
                        <div key={fish.type} className="text-center">
                          <span className="text-lg">{fish.emoji}</span>
                          <div className="text-xs text-green-400">+{fish.points}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <h4 className="text-red-400 font-semibold text-sm mb-2">🗑️ Pièges</h4>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {TRASH_TYPES.map((trash) => (
                        <div key={trash.type} className="text-center">
                          <span className="text-lg">{trash.emoji}</span>
                          <div className="text-xs text-red-400">{trash.points}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 rounded-lg p-3 mb-4 border border-amber-500/20">
                  <p className="text-xs text-amber-200">
                    ⚠️ Les poissons accélèrent toutes les 10 secondes ! Soyez rapide !
                  </p>
                </div>

                <Button 
                  onClick={startGameWithAd}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 text-lg px-8 shadow-lg shadow-blue-500/30"
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
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-3">
                      <h3 className="text-white font-bold">📢 Publicité</h3>
                      <p className="text-white/80 text-sm">Votre pêche commence dans {gameState.adTimeLeft}s</p>
                    </div>
                    <div className="p-4">
                      <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center mb-3">
                        <div className="text-center">
                          <div className="text-5xl mb-2">🎣</div>
                          <h4 className="text-lg font-bold text-white">LandPulse Fishing</h4>
                          <p className="text-gray-400 text-sm">Attrapez les poissons !</p>
                        </div>
                      </div>
                      <Button
                        onClick={skipAd}
                        disabled={gameState.adTimeLeft > 0}
                        className={`w-full ${gameState.adTimeLeft === 0 ? 'bg-gradient-to-r from-blue-500 to-cyan-600' : 'bg-gray-700'}`}
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
                <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-1">Recherche d&apos;adversaire...</h3>
                <p className="text-muted-foreground text-sm">Veuillez patienter</p>
              </div>
            )}

            {/* Phase Playing */}
            {gameState.phase === 'playing' && (
              <div className="space-y-3">
                {/* Warning accélération */}
                {gameState.showSpeedWarning && (
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
                  
                  {/* Indicateur de vitesse */}
                  {gameState.speedLevel > 1 && (
                    <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-full">
                      <span className="text-yellow-400 font-bold text-sm">⚡ x{gameState.speedLevel}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className={`text-center px-3 py-1 rounded-lg transition-all ${
                      gameState.lastPlayerCatch ? 'scale-110' : ''
                    } ${gameState.lastPlayerCatch?.points > 0 ? 'bg-green-500/30' : gameState.lastPlayerCatch?.points < 0 ? 'bg-red-500/30' : 'bg-green-500/10'}`}>
                      <div className="text-[10px] text-green-400">VOUS</div>
                      <div className="text-xl font-bold text-green-400">{gameState.playerScore}</div>
                    </div>
                    <span className="text-muted-foreground">VS</span>
                    <div className={`text-center px-3 py-1 rounded-lg transition-all ${
                      gameState.lastOpponentCatch ? 'scale-110' : ''
                    } ${gameState.lastOpponentCatch?.points > 0 ? 'bg-green-500/30' : 'bg-red-500/10'}`}>
                      <div className="text-[10px] text-red-400">ADV</div>
                      <div className="text-xl font-bold text-red-400">{gameState.opponentScore}</div>
                    </div>
                  </div>
                </div>

                {/* Zone de pêche */}
                <div 
                  className="peche-game-area relative rounded-xl overflow-hidden border-2 border-blue-400/30 select-none"
                  style={{ height: '280px', touchAction: 'auto' }}
                >
                  {/* Fond marin */}
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-400/30 via-blue-600/40 to-blue-900/60">
                    {/* Vagues animées */}
                    <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-blue-300/40 to-transparent">
                      <div className="absolute inset-0 animate-pulse opacity-50" />
                    </div>
                    
                    {/* Bulles */}
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-white/20 rounded-full animate-bounce"
                        style={{
                          left: `${10 + i * 12}%`,
                          bottom: `${Math.random() * 30}%`,
                          animationDelay: `${i * 0.3}s`,
                          animationDuration: `${2 + Math.random() * 2}s`,
                        }}
                      />
                    ))}
                    
                    {/* Algues */}
                    <div className="absolute bottom-0 inset-x-0 flex justify-around">
                      {['🌿', '🌱', '🌿', '🌱', '🌿'].map((emoji, i) => (
                        <span 
                          key={i} 
                          className="text-2xl opacity-60"
                          style={{ transform: `rotate(${Math.random() * 10 - 5}deg)` }}
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Poissons et déchets qui nagent */}
                  {gameState.swimmingItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={(e) => handleCatch(item, e)}
                      onTouchStart={(e) => handleCatch(item, e)}
                      className={`absolute transition-none cursor-pointer hover:scale-125 active:scale-90 p-2 -m-2 ${
                        item.type === 'trash' ? 'animate-pulse' : ''
                      }`}
                      style={{
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        transform: `translate(-50%, -50%) scaleX(${item.direction})`,
                        fontSize: `${item.size + 8}px`,
                        minWidth: `${item.size + 24}px`,
                        minHeight: `${item.size + 24}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        filter: item.type === 'trash' 
                          ? 'drop-shadow(0 0 5px rgba(255,0,0,0.3))' 
                          : item.points >= 50 
                            ? 'drop-shadow(0 0 10px gold)' 
                            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        touchAction: 'manipulation',
                      }}
                    >
                      {item.emoji}
                    </button>
                  ))}

                  {/* Message de capture */}
                  {gameState.lastPlayerCatch && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className={`text-2xl font-bold animate-bounce ${
                        gameState.lastPlayerCatch.points > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {gameState.lastPlayerCatch.emoji} {gameState.lastPlayerCatch.points > 0 ? '+' : ''}{gameState.lastPlayerCatch.points}
                      </div>
                    </div>
                  )}

                  {/* Indice */}
                  <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
                    <span className="text-xs text-blue-200 bg-black/30 px-2 py-1 rounded">
                      Touchez les poissons 🐟 • Évitez les déchets 🗑️
                    </span>
                  </div>
                </div>

                {/* Avertissement pièges */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 text-yellow-400" />
                  <span>Attention aux 🥫👢🛞🛍️🪼 qui font perdre des points !</span>
                </div>
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
                    <p className="text-muted-foreground text-sm mb-3">Vous êtes le meilleur pêcheur !</p>
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
                    <p className="text-muted-foreground text-sm">L&apos;adversaire a mieux pêché...</p>
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
                    <div className="text-2xl font-bold text-blue-400">{gameState.playerScore}</div>
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
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600"
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
