'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Timer, Users, RotateCcw, Brain } from 'lucide-react';

// Types
interface Card {
  id: number;
  typeId: string;
  emoji: string;
  points: number;
  isFlipped: boolean;
  isMatched: boolean;
}

interface GameState {
  phase: 'waiting' | 'ad' | 'matching' | 'playing' | 'result';
  playerScore: number;
  opponentScore: number;
  timeLeft: number;
  playerCards: Card[];
  opponentCards: Card[];
  flippedCards: number[];
  playerMatches: number;
  opponentMatches: number;
  isPlayerTurn: boolean;
  lastMatch: { player: string; cards: Card[] } | null;
  victories: number;
  totalGames: number;
  adTimeLeft: number;
}

// Types de cartes
const CARD_TYPES = [
  { id: 'legendary', emoji: '🟠', points: 50 },
  { id: 'epic', emoji: '🟣', points: 30 },
  { id: 'rare', emoji: '🔵', points: 20 },
  { id: 'common', emoji: '🟢', points: 10 },
  { id: 'house', emoji: '🏠', points: 15 },
  { id: 'coin', emoji: '💰', points: 25 },
  { id: 'star', emoji: '⭐', points: 40 },
  { id: 'diamond', emoji: '💎', points: 60 },
];

const POINTS_PER_PAIR = 10;
const GRID_SIZE = 4; // 4x4 = 16 cartes = 8 paires

// Récompenses selon victoires
const VICTORY_REWARDS = [
  { victories: 5, reward: 20 },
  { victories: 10, reward: 50 },
  { victories: 20, reward: 120 },
  { victories: 30, reward: 200 },
  { victories: 50, reward: 400 },
];

// Générer un deck de cartes mélangées
function generateDeck(): Card[] {
  const pairs = CARD_TYPES.slice(0, (GRID_SIZE * GRID_SIZE) / 2);
  const cards: Card[] = [];
  let id = 0;
  
  pairs.forEach(type => {
    // Ajouter 2 cartes de chaque type
    for (let i = 0; i < 2; i++) {
      cards.push({
        id: id++,
        typeId: type.id,
        emoji: type.emoji,
        points: type.points,
        isFlipped: false,
        isMatched: false,
      });
    }
  });
  
  // Mélanger
  return cards.sort(() => Math.random() - 0.5);
}

export function MemoryParcelles() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    playerScore: 0,
    opponentScore: 0,
    timeLeft: 90,
    playerCards: [],
    opponentCards: [],
    flippedCards: [],
    playerMatches: 0,
    opponentMatches: 0,
    isPlayerTurn: true,
    lastMatch: null,
    victories: 0,
    totalGames: 0,
    adTimeLeft: 5,
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const opponentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const adLoopRef = useRef<NodeJS.Timeout | null>(null);

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

  // Vérifier si toutes les paires sont trouvées
  const checkGameEnd = useCallback((cards: Card[]) => {
    return cards.every(card => card.isMatched);
  }, []);

  // IA adversaire
  useEffect(() => {
    if (gameState.phase !== 'playing' || gameState.isPlayerTurn) return;
    
    // L'IA joue après un délai
    opponentTimeoutRef.current = setTimeout(() => {
      const availableCards = gameState.playerCards.filter(c => !c.isMatched && !c.isFlipped);
      if (availableCards.length < 2) return;
      
      // IA: choisir 2 cartes aléatoires
      const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
      const first = shuffled[0];
      const second = shuffled[1];
      
      // Retourner les cartes
      setGameState(prev => ({
        ...prev,
        playerCards: prev.playerCards.map(c => 
          c.id === first.id || c.id === second.id ? { ...c, isFlipped: true } : c
        ),
        flippedCards: [first.id, second.id],
      }));
      
      // Vérifier le match après un délai
      setTimeout(() => {
        setGameState(prev => {
          const isMatch = first.typeId === second.typeId;
          const cardType = CARD_TYPES.find(t => t.id === first.typeId)!;
          
          if (isMatch) {
            const newCards = prev.playerCards.map(c => 
              c.id === first.id || c.id === second.id 
                ? { ...c, isFlipped: false, isMatched: true } 
                : c
            );
            
            const newState = {
              ...prev,
              playerCards: newCards,
              opponentScore: prev.opponentScore + cardType.points + POINTS_PER_PAIR,
              opponentMatches: prev.opponentMatches + 1,
              flippedCards: [],
              isPlayerTurn: true,
              lastMatch: { player: 'opponent', cards: [first, second] },
            };
            
            // Vérifier fin de partie
            if (checkGameEnd(newCards)) {
              return {
                ...newState,
                phase: 'result',
                victories: prev.opponentScore + cardType.points + POINTS_PER_PAIR > prev.playerScore 
                  ? prev.victories 
                  : prev.victories + 1,
                totalGames: prev.totalGames + 1,
              };
            }
            
            return newState;
          } else {
            return {
              ...prev,
              playerCards: prev.playerCards.map(c => 
                c.id === first.id || c.id === second.id ? { ...c, isFlipped: false } : c
              ),
              flippedCards: [],
              isPlayerTurn: true,
            };
          }
        });
      }, 1000);
    }, 1500);
    
    return () => {
      if (opponentTimeoutRef.current) clearTimeout(opponentTimeoutRef.current);
    };
  }, [gameState.phase, gameState.isPlayerTurn, gameState.playerCards, checkGameEnd]);

  // Joueur retourne une carte
  const handleCardClick = useCallback((cardId: number) => {
    if (gameState.phase !== 'playing' || !gameState.isPlayerTurn) return;
    
    const card = gameState.playerCards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    
    // Retourner la carte
    const newFlippedCards = [...gameState.flippedCards, cardId];
    
    setGameState(prev => ({
      ...prev,
      playerCards: prev.playerCards.map(c => 
        c.id === cardId ? { ...c, isFlipped: true } : c
      ),
      flippedCards: newFlippedCards,
    }));
    
    // Si 2 cartes retournées
    if (newFlippedCards.length === 2) {
      const [firstId, secondId] = newFlippedCards;
      const firstCard = gameState.playerCards.find(c => c.id === firstId)!;
      const secondCard = gameState.playerCards.find(c => c.id === secondId)!;
      
      setTimeout(() => {
        setGameState(prev => {
          const isMatch = firstCard.typeId === secondCard.typeId;
          const cardType = CARD_TYPES.find(t => t.id === firstCard.typeId)!;
          
          if (isMatch) {
            const newCards = prev.playerCards.map(c => 
              c.id === firstId || c.id === secondId 
                ? { ...c, isFlipped: false, isMatched: true } 
                : c
            );
            
            const newState = {
              ...prev,
              playerCards: newCards,
              playerScore: prev.playerScore + cardType.points + POINTS_PER_PAIR,
              playerMatches: prev.playerMatches + 1,
              flippedCards: [],
              lastMatch: { player: 'player', cards: [firstCard, secondCard] },
              // Le joueur continue de jouer après un match
            };
            
            // Vérifier fin de partie
            if (checkGameEnd(newCards)) {
              return {
                ...newState,
                phase: 'result',
                victories: prev.playerScore + cardType.points + POINTS_PER_PAIR > prev.opponentScore 
                  ? prev.victories + 1 
                  : prev.victories,
                totalGames: prev.totalGames + 1,
              };
            }
            
            return newState;
          } else {
            // Pas de match, tour de l'adversaire
            return {
              ...prev,
              playerCards: prev.playerCards.map(c => 
                c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
              ),
              flippedCards: [],
              isPlayerTurn: false,
            };
          }
        });
      }, 800);
    }
  }, [gameState, checkGameEnd]);

  // Démarrer une nouvelle partie
  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      playerScore: 0,
      opponentScore: 0,
      timeLeft: 90,
      playerCards: generateDeck(),
      opponentCards: [],
      flippedCards: [],
      playerMatches: 0,
      opponentMatches: 0,
      isPlayerTurn: true,
      lastMatch: null,
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
      <Card className="glass-card border-purple-500/30">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Brain className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-purple-400">Memory Parcelles</h2>
                <p className="text-sm text-muted-foreground">Événement 2h • TOP 100</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{gameState.victories}</div>
                <div className="text-xs text-muted-foreground">Victoires</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{gameState.totalGames}</div>
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
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Brain className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Testez votre mémoire !</h3>
              <p className="text-muted-foreground mb-6">
                Retrouvez les paires de parcelles identiques le plus vite possible !
              </p>
              
              <div className="grid grid-cols-4 gap-2 mb-8 max-w-md mx-auto">
                {CARD_TYPES.slice(0, 8).map((type) => (
                  <div key={type.id} className="text-center p-2 rounded-lg bg-background/50">
                    <div className="text-2xl">{type.emoji}</div>
                    <div className="text-xs text-muted-foreground">+{type.points + POINTS_PER_PAIR}</div>
                  </div>
                ))}
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
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
                    <h3 className="text-white font-bold text-lg">📢 Publicité</h3>
                    <p className="text-white/80 text-sm">Votre memory commence dans {gameState.adTimeLeft}s</p>
                  </div>
                  <div className="p-6">
                    <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🧠</div>
                        <h4 className="text-xl font-bold text-white mb-2">LandPulse Memory</h4>
                        <p className="text-gray-400">Retrouvez les paires !</p>
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
              <Loader2 className="h-16 w-16 animate-spin text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Recherche d&apos;adversaire...</h3>
              <p className="text-muted-foreground">Veuillez patienter</p>
            </div>
          )}

          {/* Phase Playing */}
          {gameState.phase === 'playing' && (
            <div className="space-y-6">
              {/* Timer et indicateur de tour */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-purple-400" />
                  <span className="text-3xl font-mono font-bold text-purple-400">
                    {gameState.timeLeft}s
                  </span>
                </div>
                <Badge 
                  className={`${gameState.isPlayerTurn ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}
                >
                  {gameState.isPlayerTurn ? 'Votre tour' : 'Tour adverse'}
                </Badge>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                {/* Joueur */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  gameState.lastMatch?.player === 'player' ? 'border-green-400 bg-green-500/20' : 'border-purple-500/30 bg-purple-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-400 font-semibold">VOUS</span>
                    {gameState.lastMatch?.player === 'player' && (
                      <span className="text-green-400 text-sm">
                        ✓ {gameState.lastMatch.cards.map(c => c.emoji).join(' ')}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-center">{gameState.playerScore}</div>
                  <div className="text-xs text-center text-muted-foreground mt-1">
                    {gameState.playerMatches}/8 paires
                  </div>
                </div>

                {/* Adversaire */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  gameState.lastMatch?.player === 'opponent' ? 'border-red-400 bg-red-500/20' : 'border-red-500/30 bg-red-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-400 font-semibold">ADVERSAIRE</span>
                    {gameState.lastMatch?.player === 'opponent' && (
                      <span className="text-green-400 text-sm">
                        ✓ {gameState.lastMatch.cards.map(c => c.emoji).join(' ')}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-center">{gameState.opponentScore}</div>
                  <div className="text-xs text-center text-muted-foreground mt-1">
                    {gameState.opponentMatches}/8 paires
                  </div>
                </div>
              </div>

              {/* Grille de cartes */}
              <div className="memory-game-area grid grid-cols-4 gap-3 max-w-md mx-auto" style={{ touchAction: 'auto' }}>
                {gameState.playerCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(card.id)}
                    disabled={!gameState.isPlayerTurn || card.isFlipped || card.isMatched}
                    className={`aspect-square rounded-lg transition-all duration-300 flex items-center justify-center text-3xl
                      ${card.isMatched 
                        ? 'bg-green-500/20 border-2 border-green-500/50 cursor-default' 
                        : card.isFlipped 
                          ? 'bg-purple-500/30 border-2 border-purple-500/50 cursor-default' 
                          : gameState.isPlayerTurn
                            ? 'bg-purple-900/50 border-2 border-purple-500/30 hover:border-purple-500 hover:bg-purple-800/50 cursor-pointer'
                            : 'bg-purple-900/30 border-2 border-purple-500/20 cursor-not-allowed'
                      }
                    `}
                  >
                    {(card.isFlipped || card.isMatched) ? card.emoji : '?'}
                  </button>
                ))}
              </div>

              {/* Dernier match */}
              {gameState.lastMatch && (
                <div className="text-center text-sm text-muted-foreground animate-pulse">
                  {gameState.lastMatch.player === 'player' 
                    ? (() => {
                        const cardType = CARD_TYPES.find(t => t.id === gameState.lastMatch?.cards[0]?.typeId);
                        const points = cardType?.points ?? 0;
                        return `🎉 Vous avez trouvé une paire ! +${points + POINTS_PER_PAIR} points`;
                      })()
                    : `L'adversaire a trouvé une paire...`
                  }
                </div>
              )}
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
                  <p className="text-muted-foreground mb-4">Vous avez le meilleur score !</p>
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
                  <p className="text-muted-foreground mb-4">L&apos;adversaire a eu une meilleure mémoire...</p>
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
                  <div className="text-3xl font-bold text-purple-400">{gameState.playerScore}</div>
                  <div className="text-xs text-muted-foreground">{gameState.playerMatches} paires</div>
                </div>
                <div className="text-4xl font-bold self-center">VS</div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Adversaire</div>
                  <div className="text-3xl font-bold text-red-400">{gameState.opponentScore}</div>
                  <div className="text-xs text-muted-foreground">{gameState.opponentMatches} paires</div>
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
