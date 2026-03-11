'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { GAME_CONFIG } from '@/lib/game-config';
import { Gift, Loader2, CheckCircle, Clock } from 'lucide-react';

export function DailyBonus() {
  const { user, updatePulseBucks, setUser } = useGameStore();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const canClaim = () => {
    if (!user?.lastDailyBonus) return true;
    const lastClaim = new Date(user.lastDailyBonus).getTime();
    const now = Date.now();
    const cooldown = GAME_CONFIG.DAILY_BONUS_COOLDOWN;
    return now - lastClaim >= cooldown;
  };

  const getTimeUntilNextClaim = () => {
    if (!user?.lastDailyBonus) return null;
    const lastClaim = new Date(user.lastDailyBonus).getTime();
    const now = Date.now();
    const cooldown = GAME_CONFIG.DAILY_BONUS_COOLDOWN;
    const remaining = cooldown - (now - lastClaim);
    
    if (remaining <= 0) return null;
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleClaim = async () => {
    if (!user || !canClaim()) return;

    setIsClaiming(true);
    try {
      const response = await fetch('/api/user/daily-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: user.walletAddress }),
      });

      const data = await response.json();
      if (response.ok) {
        updatePulseBucks(GAME_CONFIG.DAILY_BONUS);
        setUser({
          ...user,
          lastDailyBonus: new Date().toISOString(),
        });
        setClaimed(true);
        setTimeout(() => setClaimed(false), 3000);
      }
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  const timeRemaining = getTimeUntilNextClaim();

  if (claimed) {
    return (
      <Button variant="outline" className="border-green-500/30 text-green-400" disabled>
        <CheckCircle className="h-4 w-4 mr-2" />
        +{GAME_CONFIG.DAILY_BONUS} PB réclamés!
      </Button>
    );
  }

  if (!canClaim()) {
    return (
      <Button variant="outline" className="border-muted text-muted-foreground" disabled>
        <Clock className="h-4 w-4 mr-2" />
        Prochain bonus: {timeRemaining}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClaim}
      disabled={isClaiming}
      className="gradient-bg"
    >
      {isClaiming ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Réclamation...
        </>
      ) : (
        <>
          <Gift className="h-4 w-4 mr-2" />
          Bonus quotidien (+{GAME_CONFIG.DAILY_BONUS} PB)
        </>
      )}
    </Button>
  );
}
