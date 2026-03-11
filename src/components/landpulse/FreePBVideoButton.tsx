'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Video,
  Gift,
  Clock,
  Loader2,
  CheckCircle,
  Tv,
} from 'lucide-react';
import { GAME_CONFIG } from '@/lib/game-config';

interface FreePBVideoState {
  lastWatchTime: number | null;
  videosWatchedToday: number;
  lastResetDate: string | null;
}

export function FreePBVideoButton() {
  const { user, walletAddress, setUser } = useGameStore();
  const [videoState, setVideoState] = useState<FreePBVideoState>({
    lastWatchTime: null,
    videosWatchedToday: 0,
    lastResetDate: null,
  });
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isVideoComplete, setIsVideoComplete] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [isClaiming, setIsClaiming] = useState(false);

  // Load video state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('freePBVideo');
      if (stored) {
        const parsed = JSON.parse(stored);
        const today = new Date().toDateString();
        
        // Reset daily counter if new day
        if (parsed.lastResetDate !== today) {
          setVideoState({
            lastWatchTime: null,
            videosWatchedToday: 0,
            lastResetDate: today,
          });
        } else {
          setVideoState(parsed);
        }
      } else {
        setVideoState({
          lastWatchTime: null,
          videosWatchedToday: 0,
          lastResetDate: new Date().toDateString(),
        });
      }
    }
  }, []);

  // Save video state to localStorage
  const saveVideoState = (state: FreePBVideoState) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('freePBVideo', JSON.stringify(state));
    }
    setVideoState(state);
  };

  // Calculate cooldown remaining
  const getCooldownRemaining = (): number => {
    if (!videoState.lastWatchTime) return 0;
    const elapsed = Date.now() - videoState.lastWatchTime;
    const cooldownMs = GAME_CONFIG.FREE_PB_VIDEO.cooldown * 60 * 1000;
    return Math.max(0, cooldownMs - elapsed);
  };

  const [cooldownRemaining, setCooldownRemaining] = useState(getCooldownRemaining());

  // Update cooldown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldownRemaining(getCooldownRemaining());
    }, 1000);
    return () => clearInterval(interval);
  }, [videoState.lastWatchTime]);

  // Check if can watch
  const canWatch = 
    cooldownRemaining === 0 && 
    videoState.videosWatchedToday < GAME_CONFIG.FREE_PB_VIDEO.maxPerDay;

  // Format cooldown time
  const formatCooldown = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle watch video
  const handleWatchVideo = () => {
    if (!canWatch) return;
    setShowVideoModal(true);
    setVideoProgress(0);
    setCountdown(15);
    setIsVideoComplete(false);
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
        return prev + (100 / 15);
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

  // Claim reward
  const claimReward = async () => {
    if (!walletAddress || !user) return;
    
    setIsClaiming(true);
    try {
      const response = await fetch('/api/user/pulsebucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          amount: GAME_CONFIG.FREE_PB_VIDEO.reward,
          reason: 'free_video',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update user
        setUser({
          ...user,
          pulseBucks: data.pulseBucks,
        });

        // Update video state
        const newState: FreePBVideoState = {
          lastWatchTime: Date.now(),
          videosWatchedToday: videoState.videosWatchedToday + 1,
          lastResetDate: new Date().toDateString(),
        };
        saveVideoState(newState);

        setShowVideoModal(false);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <>
      <Card className="glass-card border-green-500/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-400" />
            Vidéo Gratuite
          </CardTitle>
          <CardDescription>
            Regardez une vidéo pour gagner <strong className="text-yellow-400">1 PB</strong> gratuitement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-400">+1 PB</div>
              <div className="text-xs text-muted-foreground">Par vidéo</div>
            </div>
            <div className="glass-card rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-cyan-400">
                {videoState.videosWatchedToday}/{GAME_CONFIG.FREE_PB_VIDEO.maxPerDay}
              </div>
              <div className="text-xs text-muted-foreground">Aujourd'hui</div>
            </div>
            <div className="glass-card rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-400">
                {GAME_CONFIG.FREE_PB_VIDEO.cooldown} min
              </div>
              <div className="text-xs text-muted-foreground">Cooldown</div>
            </div>
          </div>

          {/* Cooldown progress */}
          {cooldownRemaining > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Prochaine vidéo dans
                </span>
                <span className="text-cyan-400 font-mono">{formatCooldown(cooldownRemaining)}</span>
              </div>
              <Progress 
                value={100 - (cooldownRemaining / (GAME_CONFIG.FREE_PB_VIDEO.cooldown * 60 * 1000)) * 100}
                className="h-2"
              />
            </div>
          )}

          {/* Watch button */}
          <Button
            onClick={handleWatchVideo}
            disabled={!canWatch}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold"
          >
            {!canWatch ? (
              cooldownRemaining > 0 ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Patientez {formatCooldown(cooldownRemaining)}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Limite journalière atteinte
                </>
              )
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Regarder une vidéo (+1 PB)
              </>
            )}
          </Button>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            🎁 Cette vidéo donne uniquement 1 PB, pas de boost supplémentaire
          </p>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-green-500/30">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Tv className="h-8 w-8 text-green-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {isVideoComplete ? 'Vidéo terminée !' : 'Publicité'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isVideoComplete 
                  ? 'Vous pouvez récupérer votre récompense'
                  : `Regardez cette vidéo pour gagner 1 PB (${countdown}s)`
                }
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
              
              {/* Action Button */}
              {isVideoComplete ? (
                <Button
                  onClick={claimReward}
                  disabled={isClaiming}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Créditation...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Récupérer +1 PB
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  Veuillez patienter {countdown} secondes...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
