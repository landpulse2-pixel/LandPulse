'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GAME_CONFIG } from '@/lib/game-config';
import { AnneauRoyal } from './AnneauRoyal';
import { PecheParcelles } from './PecheParcelles';
import { MotoCourse } from './MotoCourse';
import { MemoryParcelles } from './MemoryParcelles';
import DragRaceGame from '@/components/mini-games/DragRaceGame';
import {
  Calendar,
  Trophy,
  Target,
  Fish,
  Timer,
  Users,
  Zap,
  Gift,
  ArrowLeft,
  Crown,
  Medal,
} from 'lucide-react';

// Types
type GameType = 'anneau_royal' | 'peche_parcelles' | 'moto_course' | 'memory_parcelles' | 'drag_race';

interface GameInfo {
  id: GameType;
  name: string;
  description: string;
  emoji: string;
  duration: number;
  color: string;
}

const GAMES: GameInfo[] = [
  {
    id: 'drag_race',
    name: 'Drag Race',
    description: 'Passage de vitesses - Timing parfait = victoire !',
    emoji: '🏁',
    duration: 60,
    color: 'red',
  },
  {
    id: 'anneau_royal',
    name: 'Anneau Royal',
    description: 'Duel de lancer d\'anneau 1v1 - Visez les dorés !',
    emoji: '🎯',
    duration: 60,
    color: 'yellow',
  },
  {
    id: 'peche_parcelles',
    name: 'Pêche aux Parcelles',
    description: 'Pêchez des parcelles rares ! Plus c\'est rare, plus ça rapporte !',
    emoji: '🎣',
    duration: 45,
    color: 'blue',
  },
  {
    id: 'moto_course',
    name: 'Moto Course',
    description: 'Course de moto 1v1 - Passez les vitesses au bon moment !',
    emoji: '🏍️',
    duration: 45,
    color: 'orange',
  },
  {
    id: 'memory_parcelles',
    name: 'Memory Parcelles',
    description: 'Retrouvez les paires de parcelles identiques !',
    emoji: '🧠',
    duration: 90,
    color: 'purple',
  },
];

// Mock leaderboard data
const MOCK_LEADERBOARD = [
  { rank: 1, name: 'DragonSlayer', wins: 47, avatar: '🐉' },
  { rank: 2, name: 'CryptoKing', wins: 42, avatar: '👑' },
  { rank: 3, name: 'LandBaron', wins: 38, avatar: '🏰' },
  { rank: 4, name: 'PixelMaster', wins: 35, avatar: '🎮' },
  { rank: 5, name: 'SolHunter', wins: 31, avatar: '💎' },
  { rank: 6, name: 'PlotLord', wins: 28, avatar: '📍' },
  { rank: 7, name: 'GeoTrader', wins: 25, avatar: '🌍' },
  { rank: 8, name: 'MapMaker', wins: 22, avatar: '🗺️' },
  { rank: 9, name: 'ZoneSeeker', wins: 19, avatar: '🔍' },
  { rank: 10, name: 'You', wins: 15, avatar: '👤', isUser: true },
];

export function MiniGamesPanel() {
  const { user } = useGameStore();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'leaderboard' | 'rewards'>('games');

  console.log('🎮 MiniGamesPanel rendered, selectedGame:', selectedGame, 'activeTab:', activeTab);

  // Calculer le temps restant de l'événement (mock: 2 heures)
  const getEventTimeRemaining = () => {
    const hours = 1;
    const minutes = 47;
    return `${hours}h ${minutes}min`;
  };

  // Obtenir la couleur du jeu
  const getGameColorClass = (gameId: GameType) => {
    const colors: Record<GameType, string> = {
      drag_race: 'border-red-500/30 hover:border-red-500/60',
      anneau_royal: 'border-yellow-500/30 hover:border-yellow-500/60',
      peche_parcelles: 'border-blue-500/30 hover:border-blue-500/60',
      moto_course: 'border-orange-500/30 hover:border-orange-500/60',
      memory_parcelles: 'border-purple-500/30 hover:border-purple-500/60',
    };
    return colors[gameId];
  };

  // Si un jeu est sélectionné, afficher le jeu
  if (selectedGame) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header avec bouton retour */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setSelectedGame(null)}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux jeux
          </Button>
          <Badge variant="outline" className="border-green-500/30 text-green-400">
            <Timer className="h-3 w-3 mr-1" />
            {getEventTimeRemaining()} restant
          </Badge>
        </div>

        {/* Afficher le jeu sélectionné */}
        {selectedGame === 'drag_race' && <DragRaceGame />}
        {selectedGame === 'anneau_royal' && <AnneauRoyal />}
        {selectedGame === 'peche_parcelles' && <PecheParcelles />}
        {selectedGame === 'moto_course' && <MotoCourse />}
        {selectedGame === 'memory_parcelles' && <MemoryParcelles />}
      </div>
    );
  }

  // Afficher le panneau principal
  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Mini-Jeux Événement
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Participez aux événements pour gagner des PulseBucks !
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-green-500/30 text-green-400">
            <Zap className="h-3 w-3 mr-1 text-green-400" />
            Événement en cours
          </Badge>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
            <Timer className="h-3 w-3 mr-1" />
            {getEventTimeRemaining()}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="games">Jeux</TabsTrigger>
          <TabsTrigger value="leaderboard">Classement</TabsTrigger>
          <TabsTrigger value="rewards">Récompenses</TabsTrigger>
        </TabsList>

        {/* Tab: Jeux */}
        <TabsContent value="games" className="space-y-4">
          {/* Info événement */}
          <Card className="glass-card border-cyan-500/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Trophy className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Événement Spécial 2H</h3>
                  <p className="text-sm text-muted-foreground">
                    Affrontez d&apos;autres joueurs dans 4 mini-jeux différents. 
                    Gagnez des victoires pour débloquer des récompenses !
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grille des jeux */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GAMES.map((game) => (
              <Card 
                key={game.id}
                className={`glass-card ${getGameColorClass(game.id)} cursor-pointer transition-all hover:scale-[1.02]`}
                onClick={() => setSelectedGame(game.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center text-2xl">
                      {game.emoji}
                    </div>
                    <Badge variant="outline" className="border-muted">
                      {game.duration}s
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{game.name}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full gradient-bg">
                    <Target className="mr-2 h-4 w-4" />
                    Jouer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Classement */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card className="glass-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                TOP 100 - Événement Actuel
              </CardTitle>
              <CardDescription>
                Les 100 meilleurs joueurs remportent des récompenses !
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {MOCK_LEADERBOARD.map((player) => (
                  <div 
                    key={player.rank}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.isUser 
                        ? 'bg-purple-500/20 border border-purple-500/30' 
                        : player.rank <= 3 
                          ? 'bg-yellow-500/10' 
                          : 'bg-background/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        player.rank === 1 ? 'bg-yellow-500 text-black' :
                        player.rank === 2 ? 'bg-gray-400 text-black' :
                        player.rank === 3 ? 'bg-amber-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {player.rank <= 3 ? (
                          <Medal className="h-4 w-4" />
                        ) : (
                          player.rank
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{player.avatar}</span>
                        <span className={`font-medium ${player.isUser ? 'text-purple-400' : ''}`}>
                          {player.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <span className="font-mono font-bold">{player.wins}</span>
                      <span className="text-muted-foreground text-sm">victoires</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bouton voir plus */}
              <Button variant="outline" className="w-full mt-4">
                Voir le classement complet (TOP 100)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Récompenses */}
        <TabsContent value="rewards" className="space-y-4">
          {/* Récompenses par victoires */}
          <Card className="glass-card border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-400" />
                Récompenses par Victoires
              </CardTitle>
              <CardDescription>
                Gagnez des parties pour débloquer ces récompenses !
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {GAME_CONFIG.GAME_EVENTS.anneau_royal.rewards.victories.map((reward, index) => (
                  <div 
                    key={reward.count}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                        {reward.count}✓
                      </div>
                      <div>
                        <span className="font-medium">{reward.count} victoires</span>
                        <p className="text-sm text-muted-foreground">
                          {index === 0 ? 'Débutant' : 
                           index === 1 ? 'Apprenti' :
                           index === 2 ? 'Joueur' :
                           index === 3 ? 'Expert' : 'Maître'}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      +{reward.reward} PB
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Récompenses par classement */}
          <Card className="glass-card border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-400" />
                Récompenses TOP 100
              </CardTitle>
              <CardDescription>
                À la fin de l&apos;événement, les meilleurs joueurs gagnent :
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {GAME_CONFIG.GAME_EVENTS.anneau_royal.rewards.ranking.map((reward, index) => {
                  const getRankLabel = () => {
                    if (typeof reward.rank === 'number') {
                      return reward.rank === 1 ? '🥇 1er' : `${reward.rank}e`;
                    }
                    return `${reward.rank[0]}-${reward.rank[1]}`;
                  };
                  
                  const getLabel = () => {
                    if (index === 0) return 'Champion + Titre exclusif';
                    if (index === 1) return 'Finalistes';
                    if (index === 2) return 'Demi-finalistes';
                    if (index === 3) return 'Quarts de finale';
                    return 'Participants TOP 100';
                  };
                  
                  return (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-background/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-purple-500/20 text-purple-400' :
                          'bg-muted'
                        }`}>
                          {getRankLabel()}
                        </div>
                        <span className="font-medium">{getLabel()}</span>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        +{reward.reward} PB
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="glass-card border-cyan-500/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Comment ça marche ?</h3>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Regardez une publicité avant chaque partie</li>
                    <li>• Affrontez d&apos;autres joueurs en 1v1</li>
                    <li>• Gagnez des victoires pour débloquer des récompenses</li>
                    <li>• Grimpez dans le TOP 100 pour des bonus supplémentaires</li>
                    <li>• Les récompenses sont créditées à la fin de l&apos;événement</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
