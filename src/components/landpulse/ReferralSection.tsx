'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GAME_CONFIG } from '@/lib/game-config';
import {
  Gift,
  Users,
  Copy,
  Check,
  Share2,
  Trophy,
  Star,
  Link2,
  Loader2,
  Sparkles,
  Percent,
  TrendingUp,
} from 'lucide-react';

interface ReferralData {
  code: string;
  link: string;
  stats: {
    count: number;
    max: number;
    remaining: number;
    earnings: number;
    commissionEarnings: number;
    totalEarnings: number;
  };
  referredUsers: Array<{
    wallet: string;
    date: string;
    commission: number;
  }>;
  campaign: {
    name: string;
    progress: number;
    required: number;
    completed: boolean;
    rewardClaimed: boolean;
    spotsRemaining: number;
    canWin: boolean;
  };
}

export function ReferralSection() {
  const { walletAddress } = useGameStore();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ success: boolean; message: string; parcel?: any } | null>(null);

  useEffect(() => {
    if (walletAddress) {
      fetchReferralData();
    }
  }, [walletAddress]);

  const fetchReferralData = async () => {
    try {
      const response = await fetch(`/api/referral?wallet=${walletAddress}`);
      const data = await response.json();
      if (data.success) {
        setReferralData(data.referral);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleApplyCode = async () => {
    if (!referralCode.trim()) return;
    
    setIsApplying(true);
    setApplyMessage(null);
    
    try {
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          code: referralCode.trim().toUpperCase(),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setApplyMessage({ type: 'success', text: data.message });
        fetchReferralData();
      } else {
        setApplyMessage({ type: 'error', text: data.message || 'Erreur lors de l\'application du code' });
      }
    } catch (error) {
      setApplyMessage({ type: 'error', text: 'Erreur de connexion' });
    } finally {
      setIsApplying(false);
    }
  };

  const shareOnTwitter = () => {
    if (!referralData) return;
    const text = `🎮 Rejoins LandPulse et gagne des terrains virtuels ! Utilise mon code ${referralData.code} pour obtenir 500 PB gratuits ! 🚀`;
    const url = referralData.link;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleClaimReward = async () => {
    if (!walletAddress) return;
    
    setIsClaiming(true);
    setClaimResult(null);
    
    try {
      const response = await fetch('/api/referral/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress }),
      });
      
      const data = await response.json();
      console.log('Claim response:', data);
      
      if (data.success) {
        setClaimResult({ success: true, message: data.message, parcel: data.parcel });
        fetchReferralData(); // Refresh data
      } else {
        // Handle error - show the message from API
        setClaimResult({ 
          success: false, 
          message: data.message || data.error || 'Erreur lors de la réclamation' 
        });
      }
    } catch (error) {
      console.error('Claim error:', error);
      setClaimResult({ success: false, message: 'Erreur de connexion' });
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-purple-500/20">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        </CardContent>
      </Card>
    );
  }

  if (!referralData) return null;

  const { code, link, stats, referredUsers, campaign } = referralData;

  return (
    <div className="space-y-4">
      {/* Main Referral Card */}
      <Card className="glass-card border-purple-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-yellow-400" />
              Parrainage
            </CardTitle>
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
              500 PB + 5% à vie
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="text-xl font-bold text-green-400">{stats.count}</div>
              <div className="text-xs text-muted-foreground">Filleuls</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="text-xl font-bold text-yellow-400">{stats.earnings}</div>
              <div className="text-xs text-muted-foreground">Bonus</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="text-xl font-bold text-emerald-400">{stats.commissionEarnings}</div>
              <div className="text-xs text-muted-foreground">Commissions</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="text-xl font-bold text-purple-400">{stats.remaining}</div>
              <div className="text-xs text-muted-foreground">Restants</div>
            </div>
          </div>
          
          {/* Commission Info */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-1">
            <Percent className="h-3 w-3 text-emerald-400" />
            <span>5% de commission à vie sur les achats de vos filleuls</span>
          </div>

          {/* Referral Code */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Votre code de parrainage</label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 font-mono text-lg text-center text-purple-300">
                {code}
              </div>
              <Button
                onClick={() => copyToClipboard(code)}
                variant="outline"
                className="border-purple-500/30 hover:bg-purple-500/10"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Share Link */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Lien à partager
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={link}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg bg-background/50 border border-purple-500/20 text-sm text-muted-foreground truncate"
              />
              <Button
                onClick={() => copyToClipboard(link)}
                variant="outline"
                className="border-purple-500/30 hover:bg-purple-500/10"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Share Button */}
          <Button
            onClick={shareOnTwitter}
            className="w-full gradient-bg"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Partager sur Twitter/X
          </Button>

          {/* Apply Code (for users who haven't been referred) */}
          {stats.count === 0 && (
            <div className="pt-3 border-t border-purple-500/10">
              <label className="text-sm text-muted-foreground mb-2 block">
                Vous avez un code de parrainage ?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Entrez le code"
                  maxLength={8}
                  className="flex-1 px-3 py-2 rounded-lg bg-background/50 border border-purple-500/20 text-sm font-mono uppercase"
                />
                <Button
                  onClick={handleApplyCode}
                  disabled={isApplying || !referralCode.trim()}
                  variant="outline"
                  className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                >
                  {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Appliquer'}
                </Button>
              </div>
              {applyMessage && (
                <p className={`text-sm mt-2 ${applyMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {applyMessage.text}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Card */}
      <Card className={`glass-card border-2 ${campaign.completed && !campaign.rewardClaimed ? 'border-yellow-500 animate-pulse' : 'border-orange-500/30'}`}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              {campaign.completed ? (
                <Trophy className="h-6 w-6 text-yellow-400" />
              ) : (
                <Star className="h-6 w-6 text-orange-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{campaign.name}</h3>
                {campaign.completed && (
                  <Badge className="bg-yellow-500 text-black text-xs">
                    🏆 GAGNÉ!
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {campaign.completed 
                  ? 'Félicitations ! Vous avez gagné une parcelle Légendaire !'
                  : `Parrainez ${campaign.required - campaign.progress} amis pour gagner une parcelle Légendaire !`
                }
              </p>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progression</span>
                  <span className="font-semibold">{campaign.progress}/{campaign.required}</span>
                </div>
                <Progress value={(campaign.progress / campaign.required) * 100} className="h-2" />
              </div>

              {/* Spots remaining */}
              {!campaign.completed && (
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <Users className="h-4 w-4 text-orange-400" />
                  <span className={campaign.spotsRemaining <= 10 ? 'text-red-400 font-semibold animate-pulse' : 'text-muted-foreground'}>
                    {campaign.spotsRemaining <= 0 
                      ? 'Campagne terminée'
                      : `${campaign.spotsRemaining} places restantes`
                    }
                  </span>
                </div>
              )}

              {/* Claim button */}
              {campaign.completed && !campaign.rewardClaimed && (
                <div className="mt-3">
                  <Button 
                    onClick={handleClaimReward}
                    disabled={isClaiming}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Réclamation en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Réclamer ma parcelle Légendaire
                      </>
                    )}
                  </Button>
                  {claimResult && (
                    <div className={`mt-2 p-2 rounded-lg text-sm text-center ${claimResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {claimResult.message}
                      {claimResult.parcel && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          📍 {claimResult.parcel.location}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Already claimed */}
              {campaign.completed && campaign.rewardClaimed && (
                <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-green-400 text-sm font-medium">
                    ✅ Parcelle Légendaire réclamée !
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission Summary */}
      {stats.commissionEarnings > 0 && (
        <Card className="glass-card border-emerald-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total des commissions gagnées</p>
                <p className="text-2xl font-bold text-emerald-400">{stats.commissionEarnings} PB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referred Users List */}
      {referredUsers.length > 0 && (
        <Card className="glass-card border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Vos filleuls ({stats.count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referredUsers.slice(0, 5).map((user, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-background/30">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-purple-300">{user.wallet}</span>
                    {user.commission > 0 && (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                        +{user.commission} PB
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(user.date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
              {referredUsers.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  +{referredUsers.length - 5} autres filleuls
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
