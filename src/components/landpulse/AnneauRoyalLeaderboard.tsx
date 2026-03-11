'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Crown, Timer, Users } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  victories: number;
  defeats: number;
  totalGames: number;
  totalScore: number;
}

interface EventInfo {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  participants: number;
  status: string;
}

interface UserStats {
  victories: number;
  defeats: number;
  draws: number;
  totalGames: number;
  totalScore: number;
  rank: number | null;
}

interface AnneauRoyalLeaderboardProps {
  eventId?: string;
  wallet?: string;
}

export function AnneauRoyalLeaderboard({ eventId, wallet }: AnneauRoyalLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [eventId, wallet]);

  useEffect(() => {
    if (!event?.endTime) return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(event.endTime);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Terminé');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [event?.endTime]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (eventId) params.append('eventId', eventId);
      if (wallet) params.append('wallet', wallet);

      const response = await fetch(`/api/events/anneau-royal?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setLeaderboard(data.leaderboard || []);
        setEvent(data.event);
        setUserStats(data.userStats);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
    if (rank === 2) return 'bg-gray-400/20 border-gray-400/50 text-gray-300';
    if (rank === 3) return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
    if (rank <= 10) return 'bg-purple-500/20 border-purple-500/50 text-purple-400';
    if (rank <= 50) return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
    return 'bg-background/50 border-border text-muted-foreground';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-400" />;
    return <span className="text-sm font-bold">#{rank}</span>;
  };

  if (loading) {
    return (
      <Card className="glass-card border-yellow-500/20">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">Chargement du classement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-yellow-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Trophy className="h-5 w-5" />
            Classement TOP 100
          </CardTitle>
          {event && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>{timeLeft}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{event.participants} joueurs</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* User Stats */}
        {userStats && (
          <div className="mb-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Votre classement</span>
                <div className="text-2xl font-bold text-purple-400">
                  #{userStats.rank || '--'}
                </div>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-green-400">{userStats.victories}</div>
                  <div className="text-xs text-muted-foreground">Victoires</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-400">{userStats.defeats}</div>
                  <div className="text-xs text-muted-foreground">Défaites</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-400">{userStats.totalGames}</div>
                  <div className="text-xs text-muted-foreground">Parties</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun classement disponible. Soyez le premier à jouer !
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {leaderboard.map((entry, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${getRankStyle(entry.rank)}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {entry.rank <= 3 ? (
                        <Badge className={`${getRankStyle(entry.rank)} border-0`}>
                          {entry.rank === 1 ? 'Empereur' : entry.rank === 2 ? 'Duc' : 'Baron'}
                        </Badge>
                      ) : (
                        `Joueur #${entry.rank}`
                      )}
                    </div>
                    <div className="text-xs opacity-75">
                      Score total: {entry.totalScore.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{entry.victories}</div>
                  <div className="text-xs opacity-75">victoires</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rewards Info */}
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <h4 className="text-sm font-semibold text-yellow-400 mb-2">🎁 Récompenses TOP 100</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>🥇 #1: +500 PB + Titre</div>
            <div>🥈 #2-3: +300 PB</div>
            <div>🥉 #4-10: +150 PB</div>
            <div>📊 #11-50: +75 PB</div>
            <div>📈 #51-100: +40 PB</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
