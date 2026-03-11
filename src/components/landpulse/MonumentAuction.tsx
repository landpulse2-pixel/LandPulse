'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Landmark,
  Gavel,
  Clock,
  Trophy,
  Lock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface Monument {
  id: string;
  name: string;
  city: string;
  country: string;
  emoji: string;
  rarity: 'mythic' | 'legendary';
  basePricePB: number;
  description: string;
  incomeMultiplier: number;
  status: 'locked' | 'upcoming' | 'auction_live' | 'sold';
  currentBidPB: number;
  auctionStart: string | null;
  auctionEnd: string | null;
  winnerId: string | null;
  soldPricePB: number;
  soldAt: string | null;
}

interface MonumentAuctionData {
  monuments: Monument[];
  userBids: Array<{
    monumentId: string;
    monumentName: string;
    amountPB: number;
    isWinning: boolean;
    date: string;
  }>;
  upcomingMonument: Monument | null;
  liveAuction: Monument | null;
  stats: {
    total: number;
    locked: number;
    upcoming: number;
    live: number;
    sold: number;
  };
}

export function MonumentAuction() {
  const { walletAddress, user } = useGameStore();
  const [data, setData] = useState<MonumentAuctionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMonument, setExpandedMonument] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<Record<string, number>>({});
  const [biddingMonument, setBiddingMonument] = useState<string | null>(null);
  const [bidResult, setBidResult] = useState<{ monumentId: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (walletAddress) {
      fetchMonuments();
    }
  }, [walletAddress]);

  const fetchMonuments = async () => {
    try {
      const response = await fetch(`/api/monuments/auction?wallet=${walletAddress}`);
      const result = await response.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching monuments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBid = async (monumentId: string) => {
    if (!walletAddress) return;
    
    const amount = bidAmount[monumentId];
    if (!amount || amount <= 0) return;

    setBiddingMonument(monumentId);
    setBidResult(null);

    try {
      const response = await fetch('/api/monuments/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          monumentId,
          bidAmount: amount,
        }),
      });

      const result = await response.json();

      setBidResult({
        monumentId,
        success: result.success,
        message: result.message || result.error,
      });

      if (result.success) {
        fetchMonuments();
        setBidAmount({ ...bidAmount, [monumentId]: 0 });
      }
    } catch (error) {
      setBidResult({
        monumentId,
        success: false,
        message: 'Erreur de connexion',
      });
    } finally {
      setBiddingMonument(null);
    }
  };

  const getStatusBadge = (monument: Monument) => {
    switch (monument.status) {
      case 'locked':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><Lock className="h-3 w-3 mr-1" />Verrouillé</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="h-3 w-3 mr-1" />À venir</Badge>;
      case 'auction_live':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse"><Gavel className="h-3 w-3 mr-1" />Enchère en cours</Badge>;
      case 'sold':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Trophy className="h-3 w-3 mr-1" />Vendu</Badge>;
      default:
        return null;
    }
  };

  const getRarityBadge = (rarity: 'mythic' | 'legendary') => {
    if (rarity === 'mythic') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🔴 Mythique x10</Badge>;
    }
    return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">🟠 Légendaire x5</Badge>;
  };

  const formatTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Terminé';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-amber-500/20">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Show only active auction prominently, then expandable list
  const liveAuction = data.liveAuction;
  const upcomingMonument = data.upcomingMonument;
  const otherMonuments = data.monuments.filter(m => 
    m.status !== 'auction_live' && m.status !== 'upcoming'
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="glass-card border-amber-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark className="h-5 w-5 text-amber-400" />
              Monuments Historiques
            </CardTitle>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                {data.stats.live} en cours
              </Badge>
              <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
                {data.stats.sold} vendus
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Les monuments historiques sont vendus aux enchères. Ils génèrent des revenus x5 (Légendaire) ou x10 (Mythique).
          </p>
        </CardContent>
      </Card>

      {/* Live Auction - Prominent */}
      {liveAuction && (
        <Card className="glass-card border-2 border-green-500/50 bg-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <div className="text-5xl">{liveAuction.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">{liveAuction.name}</h3>
                  {getStatusBadge(liveAuction)}
                  {getRarityBadge(liveAuction.rarity)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {liveAuction.city}, {liveAuction.country} • {liveAuction.description}
                </p>

                {/* Auction details */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="glass-card rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Enchère actuelle</div>
                    <div className="text-xl font-bold text-green-400">{liveAuction.currentBidPB.toLocaleString()} PB</div>
                  </div>
                  <div className="glass-card rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Temps restant</div>
                    <div className="text-xl font-bold text-orange-400">
                      {liveAuction.auctionEnd && formatTimeRemaining(liveAuction.auctionEnd)}
                    </div>
                  </div>
                  <div className="glass-card rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Vos PB</div>
                    <div className="text-xl font-bold text-yellow-400">{Math.floor(user?.pulseBucks || 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Bid input */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={bidAmount[liveAuction.id] || ''}
                    onChange={(e) => setBidAmount({ ...bidAmount, [liveAuction.id]: parseInt(e.target.value) || 0 })}
                    placeholder={`Min: ${(liveAuction.currentBidPB + 100).toLocaleString()} PB`}
                    className="flex-1 px-4 py-2 rounded-lg bg-background/50 border border-green-500/30 text-sm"
                  />
                  <Button
                    onClick={() => handleBid(liveAuction.id)}
                    disabled={biddingMonument === liveAuction.id || !bidAmount[liveAuction.id]}
                    className="bg-green-500 hover:bg-green-600 text-black"
                  >
                    {biddingMonument === liveAuction.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Gavel className="h-4 w-4 mr-2" />
                        Enchérir
                      </>
                    )}
                  </Button>
                </div>

                {bidResult?.monumentId === liveAuction.id && (
                  <div className={`mt-2 p-2 rounded-lg text-sm ${bidResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {bidResult.message}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Auction */}
      {upcomingMonument && (
        <Card className="glass-card border-blue-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{upcomingMonument.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{upcomingMonument.name}</h3>
                  {getStatusBadge(upcomingMonument)}
                  {getRarityBadge(upcomingMonument.rarity)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {upcomingMonument.city}, {upcomingMonument.country} • Prix de départ: {upcomingMonument.basePricePB.toLocaleString()} PB
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-blue-400 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Monuments - Collapsible */}
      {otherMonuments.length > 0 && (
        <Card className="glass-card border-amber-500/20">
          <CardContent className="pt-4">
            <button
              onClick={() => setExpandedMonument(expandedMonument ? null : 'list')}
              className="w-full flex items-center justify-between"
            >
              <span className="text-sm font-medium">Tous les monuments ({otherMonuments.length})</span>
              {expandedMonument === 'list' ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expandedMonument === 'list' && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {otherMonuments.map((monument) => (
                  <div
                    key={monument.id}
                    className="glass-card rounded-lg p-3 text-center"
                  >
                    <div className="text-2xl mb-1">{monument.emoji}</div>
                    <div className="text-sm font-medium truncate">{monument.name}</div>
                    <div className="text-xs text-muted-foreground">{monument.city}</div>
                    <div className="mt-2 flex justify-center">
                      {getStatusBadge(monument)}
                    </div>
                    {monument.status === 'sold' && monument.soldPricePB > 0 && (
                      <div className="text-xs text-yellow-400 mt-1">
                        Vendu: {monument.soldPricePB.toLocaleString()} PB
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User's Bids */}
      {data.userBids.length > 0 && (
        <Card className="glass-card border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Mes enchères ({data.userBids.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.userBids.slice(0, 5).map((bid, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-background/30">
                  <div>
                    <span className="font-medium">{bid.monumentName}</span>
                    {bid.isWinning && (
                      <Badge className="ml-2 bg-green-500/20 text-green-400 text-xs">Gagnant</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-yellow-400">{bid.amountPB.toLocaleString()} PB</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(bid.date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
