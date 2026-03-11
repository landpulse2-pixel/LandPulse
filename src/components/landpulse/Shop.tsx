'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { GAME_CONFIG, formatNumber, formatDollarsCompact, getDailyDollars } from '@/lib/game-config';
import { AnimatedCounter } from './AnimatedCounter';
import { 
  isPhantomAvailable, 
  getPhantomProvider, 
  getUsdcBalance, 
  sendUsdcViaPhantom,
  TREASURY_WALLET 
} from '@/lib/phantom-payment';
import {
  Coins,
  CreditCard,
  Home,
  Sparkles,
  Star,
  Check,
  Gift,
  Zap,
  ArrowUpRight,
  MapPin,
  TrendingUp,
  ChevronUp,
  Loader2,
  Wallet,
  X,
  ExternalLink,
  Video,
} from 'lucide-react';
import { FreePBVideoButton } from './FreePBVideoButton';

export function Shop() {
  // Use specific selectors for better reactivity
  const user = useGameStore((state) => state.user);
  const userParcels = useGameStore((state) => state.userParcels);
  const buildings = useGameStore((state) => state.buildings);
  const walletAddress = useGameStore((state) => state.walletAddress);
  const setUser = useGameStore((state) => state.setUser);
  const [isBuying, setIsBuying] = useState(false);
  const [buyingPackage, setBuyingPackage] = useState<number | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isPhantomDetected, setIsPhantomDetected] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | null>(null);

  // Check Phantom and USDC balance
  useEffect(() => {
    const checkPhantom = async () => {
      setIsPhantomDetected(isPhantomAvailable());
      
      if (walletAddress && isPhantomAvailable()) {
        try {
          const balance = await getUsdcBalance(walletAddress);
          setUsdcBalance(balance);
        } catch (error) {
          console.error('Error fetching USDC balance:', error);
        }
      }
    };
    
    checkPhantom();
  }, [walletAddress]);

  // Count parcels by rarity
  const parcelsByRarity = {
    common: userParcels.filter(p => p.level === 'common').length,
    rare: userParcels.filter(p => p.level === 'rare').length,
    epic: userParcels.filter(p => p.level === 'epic').length,
    legendary: userParcels.filter(p => p.level === 'legendary').length,
  };

  // Count houses owned
  const houseCount = buildings.filter(b => b.type === 'house').length;
  const currentBoost = GAME_CONFIG.getHouseBoost(houseCount);
  const houseTitle = GAME_CONFIG.getHouseTitle(houseCount);
  
  // Check if user can buy a house (needs at least 1 parcel)
  const canBuyHouse = userParcels.length > houseCount && user && user.pulseBucks >= GAME_CONFIG.HOUSE.price;

  // Buy house function
  const buyHouse = async () => {
    if (!walletAddress || !user || user.pulseBucks < GAME_CONFIG.HOUSE.price) return;
    
    setIsBuying(true);
    try {
      const response = await fetch('/api/buildings/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          buildingType: 'house',
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh user data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error buying house:', error);
    } finally {
      setIsBuying(false);
    }
  };

  // Open payment modal for a package
  const openPaymentModal = (packageIndex: number) => {
    setSelectedPackage(packageIndex);
    setPaymentStatus('idle');
    setTxSignature(null);
    setShowPaymentModal(true);
  };

  // Execute USDC payment via Phantom
  const executePayment = async () => {
    if (selectedPackage === null || !walletAddress) return;
    
    const pkg = GAME_CONFIG.PB_PACKAGES[selectedPackage];
    
    setPaymentStatus('pending');
    setPurchaseMessage(null);
    
    try {
      // Send USDC via Phantom
      const result = await sendUsdcViaPhantom(pkg.price, TREASURY_WALLET.toString());
      
      if (!result.success) {
        setPaymentStatus('error');
        setPurchaseMessage({ type: 'error', text: result.error || 'Erreur lors du paiement' });
        return;
      }
      
      setTxSignature(result.signature || null);
      setPaymentStatus('confirming');
      
      // Confirm payment with backend
      const response = await fetch('/api/purchase/usdc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          packageIndex: selectedPackage,
          txHash: result.signature,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update user in store
        if (user) {
          setUser({
            ...user,
            pulseBucks: data.pulseBucks,
          });
        }
        setPaymentStatus('success');
        setPurchaseMessage({ 
          type: 'success', 
          text: `✅ Achat réussi ! +${data.transaction.amount} PulseBucks crédités` 
        });
        
        // Refresh USDC balance
        const newBalance = await getUsdcBalance(walletAddress);
        setUsdcBalance(newBalance);
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowPaymentModal(false);
        }, 2000);
      } else {
        setPaymentStatus('error');
        setPurchaseMessage({ 
          type: 'error', 
          text: data.error || 'Erreur lors de la confirmation' 
        });
      }
    } catch (error) {
      console.error('Error executing payment:', error);
      setPaymentStatus('error');
      setPurchaseMessage({ 
        type: 'error', 
        text: 'Erreur de connexion' 
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Gift className="h-6 w-6" />
            Boutique
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Achetez des Maisons pour booster vos revenus
          </p>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg">
          <Coins className="h-5 w-5 text-yellow-400" />
          <span className="font-bold text-yellow-400">
            <AnimatedCounter
              value={user?.pulseBucks || 0}
              decimals={0}
              duration={300}
              formatFn={formatNumber}
            />
            {' PB'}
          </span>
        </div>
      </div>

      <Tabs defaultValue="houses" className="w-full">
        <TabsList className="grid w-full grid-cols-3 glass-card">
          <TabsTrigger value="houses">🏠 Maisons</TabsTrigger>
          <TabsTrigger value="packs">💰 Packs PB</TabsTrigger>
          <TabsTrigger value="upgrades">⬆️ Améliorations</TabsTrigger>
        </TabsList>

        {/* Maisons - Onglet Principal */}
        <TabsContent value="houses" className="space-y-4 mt-6">
          {/* Maison Card */}
          <Card className="glass-card border-purple-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center text-4xl">
                    🏠
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Maison</CardTitle>
                    <CardDescription>
                      La clé pour booster vos revenus fonciers
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-yellow-400">{GAME_CONFIG.HOUSE.price} PB</div>
                  <div className="text-xs text-muted-foreground">par maison</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats actuelles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">{houseCount}</div>
                  <div className="text-xs text-muted-foreground">Maisons possédées</div>
                </div>
                <div className="glass-card rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-400">+{currentBoost}%</div>
                  <div className="text-xs text-muted-foreground">Boost actuel</div>
                </div>
                <div className="glass-card rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-cyan-400">{userParcels.length}</div>
                  <div className="text-xs text-muted-foreground">Parcelles total</div>
                </div>
                <div className="glass-card rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">{houseTitle.title}</div>
                  <div className="text-xs text-muted-foreground">Votre titre</div>
                </div>
              </div>

              {/* Paliers de boost */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  Paliers de Boost
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {GAME_CONFIG.HOUSE_TIERS.map((tier, index) => {
                    const isActive = houseCount >= tier.minHouses && houseCount <= tier.maxHouses;
                    const isPast = houseCount > tier.maxHouses;
                    const maxHousesDisplay = tier.maxHouses === Infinity ? '∞' : tier.maxHouses;
                    
                    return (
                      <div 
                        key={index}
                        className={`glass-card rounded-lg p-3 text-center transition-all ${
                          isActive ? 'border-purple-500 bg-purple-500/20' : 
                          isPast ? 'border-green-500/50 bg-green-500/10' : ''
                        }`}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {tier.minHouses}-{maxHousesDisplay}
                        </div>
                        <div className={`text-xl font-bold ${isActive ? 'text-purple-400' : isPast ? 'text-green-400' : 'text-gray-400'}`}>
                          +{tier.boost}%
                        </div>
                        <div className="text-xs mt-1 truncate" title={tier.title}>
                          {tier.title}
                        </div>
                        {isActive && (
                          <Badge className="mt-2 bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                            Actuel
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prochain palier */}
              {houseTitle.nextTitle && (
                <div className="glass-card rounded-lg p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/30">
                  <div className="flex items-center gap-3">
                    <ChevronUp className="h-5 w-5 text-cyan-400" />
                    <div>
                      <div className="font-semibold text-cyan-400">Prochain palier: {houseTitle.nextTitle}</div>
                      <div className="text-sm text-muted-foreground">
                        Achetez encore <strong className="text-yellow-400">{houseTitle.housesToNext} maison{houseTitle.housesToNext > 1 ? 's' : ''}</strong> pour atteindre +{GAME_CONFIG.getHouseBoost(houseCount + houseTitle.housesToNext)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alerte si pas assez de parcelles */}
              {userParcels.length <= houseCount && (
                <div className="p-4 rounded-lg bg-orange-500/20 border border-orange-500/30">
                  <div className="flex items-center gap-2 text-orange-400">
                    <span className="text-lg">⚠️</span>
                    <span className="font-medium">Achetez plus de parcelles !</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vous avez {houseCount} maison{houseCount > 1 ? 's' : ''} et {userParcels.length} parcelle{userParcels.length > 1 ? 's' : ''}. 
                    Achetez plus de parcelles pour pouvoir construire d'autres maisons.
                  </p>
                </div>
              )}

              {/* Bouton d'achat */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Button 
                  onClick={buyHouse}
                  disabled={!canBuyHouse || isBuying}
                  className="w-full sm:w-auto gradient-bg text-lg py-6 px-8"
                >
                  {isBuying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Achat en cours...
                    </>
                  ) : userParcels.length <= houseCount ? (
                    <>
                      <Home className="mr-2 h-5 w-5" />
                      Achetez plus de parcelles
                    </>
                  ) : user && user.pulseBucks < GAME_CONFIG.HOUSE.price ? (
                    <>
                      <Coins className="mr-2 h-5 w-5" />
                      PB insuffisants ({formatNumber(user.pulseBucks)}/{GAME_CONFIG.HOUSE.price})
                    </>
                  ) : (
                    <>
                      <Home className="mr-2 h-5 w-5" />
                      Acheter 1 Maison - {GAME_CONFIG.HOUSE.price} PB
                    </>
                  )}
                </Button>
                <div className="text-sm text-muted-foreground">
                  <Check className="inline h-4 w-4 text-green-400 mr-1" />
                  Boost permanent sur toutes vos parcelles
                </div>
              </div>

              {/* Explication */}
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="font-semibold text-blue-400 mb-2">💡 Comment ça marche ?</h4>
                <p className="text-sm text-muted-foreground">
                  Chaque maison coûte <strong className="text-yellow-400">200 PB</strong> et <strong className="text-purple-400">booste les revenus de TOUTES vos parcelles</strong>.
                  Le boost est permanent et cumulatif : plus vous avez de maisons, plus le pourcentage de boost augmente !
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong className="text-green-400">Exemple :</strong> Avec <strong>15 maisons</strong>, toutes vos parcelles génèrent <strong>+10%</strong> de revenus en plus.
                  Avec <strong>50 maisons</strong>, le boost passe à <strong>+15%</strong> !
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong className="text-cyan-400">⚠️ Note :</strong> Chaque maison doit être placée sur une parcelle que vous possédez. 
                  Cette parcelle continue de générer des revenus (avec le boost appliqué).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Revenus des parcelles */}
          <Card className="glass-card border-green-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Revenus des Parcelles par Rareté
              </CardTitle>
              <CardDescription>
                Combien rapporte chaque type de parcelle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(GAME_CONFIG.RARITY_LEVELS).map(([key, config]) => {
                  const dailyDollars = getDailyDollars(key as keyof typeof GAME_CONFIG.RARITY_LEVELS);
                  
                  return (
                    <div 
                      key={key}
                      className="glass-card rounded-lg p-4 text-center"
                      style={{ borderColor: `${config.color}40` }}
                    >
                      <div className="text-3xl mb-2">{config.emoji}</div>
                      <div className="font-semibold" style={{ color: config.color }}>{config.name}</div>
                      <div className="mt-2 space-y-1">
                        <div className="text-sm text-cyan-400 font-mono">
                          {formatDollarsCompact(dailyDollars)}/jour
                        </div>
                        <div className="text-xs text-muted-foreground">
                          x{config.incomeMultiplier} revenus
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packs PulseBucks */}
        <TabsContent value="packs" className="space-y-4 mt-6">
          {/* Free PB Video */}
          <FreePBVideoButton />

          {/* Purchase message */}
          {purchaseMessage && (
            <div className={`p-4 rounded-lg ${purchaseMessage.type === 'success' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
              <div className={`flex items-center gap-2 ${purchaseMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {purchaseMessage.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                <span>{purchaseMessage.text}</span>
              </div>
            </div>
          )}

          <Card className="glass-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-400" />
                Acheter des PulseBucks
              </CardTitle>
              <CardDescription>
                Paiement en USDC (Testnet) - Connectez Phantom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {GAME_CONFIG.PB_PACKAGES.map((pkg, index) => (
                  <div
                    key={index}
                    className={`glass-card rounded-lg p-4 flex flex-col items-center text-center hover:border-yellow-500/50 transition-all ${buyingPackage === index ? 'border-yellow-500' : ''}`}
                  >
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-3">
                      <Coins className="h-8 w-8 text-yellow-400" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{pkg.total}</div>
                    <div className="text-xs text-muted-foreground mb-2">PulseBucks</div>
                    {pkg.bonus > 0 && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-2">
                        +{Math.round((pkg.bonus / pkg.pb) * 100)}% BONUS
                      </Badge>
                    )}
                    <div className="text-xl font-bold mt-auto">${pkg.price} USDC</div>
                    <Button 
                      className="w-full mt-3" 
                      size="sm"
                      onClick={() => openPaymentModal(index)}
                      disabled={buyingPackage !== null || !walletAddress}
                    >
                      {buyingPackage === index ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Achat...
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4 mr-2" />
                          Acheter
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Wallet info */}
              <div className="mt-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-purple-300">
                      {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'Non connecté'}
                    </span>
                  </div>
                  <div className="text-xs text-purple-400">
                    {walletAddress ? '✓ Prêt à acheter' : 'Connectez Phantom'}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-4 text-center">
                💰 Mode Testnet - Utilisez vos USDC de test pour acheter des PulseBucks
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Améliorations */}
        <TabsContent value="upgrades" className="space-y-4 mt-6">
          <Card className="glass-card border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-orange-400" />
                Amélioration de Parcelle
              </CardTitle>
              <CardDescription>
                Transformez une parcelle en Légendaire pour plus de revenus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upgrade Card */}
                <div className="glass-card rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-3xl">
                      🟠
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Parcelle Légendaire</h3>
                      <p className="text-muted-foreground">Revenus x4 par rapport à Commun</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-muted-foreground">Prix de l&apos;amélioration</span>
                      <span className="text-2xl font-bold text-yellow-400">{formatNumber(GAME_CONFIG.PARCEL_UPGRADE_TO_LEGENDARY)} PB</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {Object.entries(GAME_CONFIG.RARITY_LEVELS).map(([key, config]) => (
                      <div 
                        key={key}
                        className={`p-2 rounded-lg text-center ${
                          key === 'legendary' 
                            ? 'bg-orange-500/20 border border-orange-500' 
                            : 'bg-background/50'
                        }`}
                      >
                        <div className="text-lg">{config.emoji}</div>
                        <div className="text-xs" style={{ color: config.color }}>{config.name}</div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className="w-full gradient-bg"
                    disabled={!user || user.pulseBucks < GAME_CONFIG.PARCEL_UPGRADE_TO_LEGENDARY || userParcels.length === 0}
                  >
                    {!user ? (
                      'Connectez votre wallet'
                    ) : userParcels.length === 0 ? (
                      'Aucune parcelle à améliorer'
                    ) : user.pulseBucks < GAME_CONFIG.PARCEL_UPGRADE_TO_LEGENDARY ? (
                      <>
                        <Coins className="mr-2 h-4 w-4" />
                        PB insuffisants
                      </>
                    ) : (
                      <>
                        <Star className="mr-2 h-4 w-4" />
                        Améliorer une parcelle
                      </>
                    )}
                  </Button>
                </div>

                {/* User Parcels Summary */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    Vos parcelles ({userParcels.length})
                  </h4>

                  {userParcels.length === 0 ? (
                    <div className="glass-card rounded-lg p-6 text-center">
                      <div className="text-4xl mb-3">🗺️</div>
                      <p className="text-muted-foreground">
                        Vous n&apos;avez pas encore de parcelle.<br />
                        Allez sur la carte pour en acheter !
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(GAME_CONFIG.RARITY_LEVELS).map(([key, config]) => (
                        <div 
                          key={key}
                          className="glass-card rounded-lg p-3"
                          style={{ borderColor: `${config.color}40` }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{config.emoji}</span>
                            <span className="font-medium" style={{ color: config.color }}>{config.name}</span>
                          </div>
                          <div className="text-2xl font-bold">
                            {parcelsByRarity[key as keyof typeof parcelsByRarity]}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      {showPaymentModal && selectedPackage !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="glass-card w-full max-w-md mx-4 border-yellow-500/30">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Confirmation d'achat
                </h3>
                {paymentStatus === 'idle' && (
                  <Button variant="ghost" size="sm" onClick={() => setShowPaymentModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Package Info */}
              <div className="glass-card rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {GAME_CONFIG.PB_PACKAGES[selectedPackage].total} PB
                    </div>
                    {GAME_CONFIG.PB_PACKAGES[selectedPackage].bonus > 0 && (
                      <div className="text-sm text-green-400">
                        +{GAME_CONFIG.PB_PACKAGES[selectedPackage].bonus} bonus
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      ${GAME_CONFIG.PB_PACKAGES[selectedPackage].price} USDC
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet & Balance */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10">
                  <span className="text-purple-300 flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Votre solde USDC
                  </span>
                  <span className="font-bold text-purple-400">
                    {usdcBalance !== null ? `${usdcBalance.toFixed(2)} USDC` : '...'}
                  </span>
                </div>
                
                {usdcBalance !== null && usdcBalance < GAME_CONFIG.PB_PACKAGES[selectedPackage].price && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <span className="text-red-400 text-sm">
                      ⚠️ Solde insuffisant. Vous avez besoin de {GAME_CONFIG.PB_PACKAGES[selectedPackage].price} USDC.
                    </span>
                  </div>
                )}
              </div>

              {/* Status Display */}
              {paymentStatus === 'pending' && (
                <div className="flex flex-col items-center py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-yellow-400 mb-3" />
                  <p className="text-yellow-400 font-medium">Transaction en cours...</p>
                  <p className="text-sm text-muted-foreground">Veuillez confirmer dans Phantom</p>
                </div>
              )}

              {paymentStatus === 'confirming' && (
                <div className="flex flex-col items-center py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-green-400 mb-3" />
                  <p className="text-green-400 font-medium">Confirmation...</p>
                  <p className="text-sm text-muted-foreground">Vérification du paiement</p>
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="flex flex-col items-center py-6">
                  <Check className="h-10 w-10 text-green-400 mb-3" />
                  <p className="text-green-400 font-medium">Paiement réussi !</p>
                  <p className="text-sm text-muted-foreground">
                    +{GAME_CONFIG.PB_PACKAGES[selectedPackage].total} PulseBucks crédités
                  </p>
                </div>
              )}

              {paymentStatus === 'error' && purchaseMessage && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                  <p className="text-red-400">{purchaseMessage.text}</p>
                </div>
              )}

              {/* Action Button */}
              {paymentStatus === 'idle' && (
                <Button
                  className="w-full gradient-bg py-6"
                  onClick={executePayment}
                  disabled={
                    !isPhantomDetected || 
                    !walletAddress || 
                    (usdcBalance !== null && usdcBalance < GAME_CONFIG.PB_PACKAGES[selectedPackage].price)
                  }
                >
                  {!isPhantomDetected ? (
                    'Phantom non détecté'
                  ) : !walletAddress ? (
                    'Connectez Phantom'
                  ) : usdcBalance !== null && usdcBalance < GAME_CONFIG.PB_PACKAGES[selectedPackage].price ? (
                    'Solde USDC insuffisant'
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Payer ${GAME_CONFIG.PB_PACKAGES[selectedPackage].price} USDC
                    </>
                  )}
                </Button>
              )}

              {paymentStatus === 'error' && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowPaymentModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="flex-1 gradient-bg"
                    onClick={() => {
                      setPaymentStatus('idle');
                      setPurchaseMessage(null);
                    }}
                  >
                    Réessayer
                  </Button>
                </div>
              )}

              {/* Testnet Info */}
              <p className="text-xs text-muted-foreground text-center mt-4">
                🔧 Mode Testnet - Phantom doit être sur Devnet
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
