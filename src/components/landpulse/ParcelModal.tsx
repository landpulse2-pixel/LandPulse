'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Parcel, Building } from '@/store/gameStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GAME_CONFIG,
  formatNumber,
  formatDollars,
  formatDollarsCompact,
  generateParcelName,
  getDollarsPerSecond,
} from '@/lib/game-config';
import {
  MapPin,
  Coins,
  Building2,
  Sparkles,
  Loader2,
  CheckCircle,
  Lock,
  Crown,
  Factory,
  Building as BuildingIcon,
  Home,
  Gift,
  HelpCircle,
  Landmark,
  AlertTriangle,
  ArrowUpCircle,
  Star,
} from 'lucide-react';

interface ParcelModalProps {
  onRefresh: () => void;
}

export function ParcelModal({ onRefresh }: ParcelModalProps) {
  const { selectedParcel, setSelectedParcel, user, updatePulseBucks, addParcel, setUserParcels, userParcels } = useGameStore();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchasedRarity, setPurchasedRarity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parcelBuildings, setParcelBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const isOpen = selectedParcel !== null;
  
  const upgradeCost = GAME_CONFIG.PARCEL_UPGRADE_TO_LEGENDARY || 2500;
  const canUpgrade = user && selectedParcel?.isOwnedByUser && 
                     selectedParcel.level !== 'legendary' && 
                     user.pulseBucks >= upgradeCost;

  useEffect(() => {
    if (selectedParcel?.buildings) {
      setParcelBuildings(selectedParcel.buildings);
    } else {
      setParcelBuildings([]);
    }
  }, [selectedParcel]);

  const handleClose = () => {
    setSelectedParcel(null);
    setPurchaseSuccess(false);
    setPurchasedRarity(null);
    setError(null);
    setSelectedBuilding(null);
    setUpgradeSuccess(false);
  };

  const handleUpgrade = async () => {
    if (!selectedParcel || !user || !selectedParcel.isOwnedByUser) return;

    if (user.pulseBucks < upgradeCost) {
      setError(`PulseBucks insuffisants! (${user.pulseBucks.toFixed(0)}/${upgradeCost})`);
      return;
    }

    setIsUpgrading(true);
    setError(null);

    try {
      const response = await fetch('/api/parcels/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: user.walletAddress,
          parcelId: selectedParcel.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        updatePulseBucks(-upgradeCost);
        setUpgradeSuccess(true);
        
        // Update parcel in store
        const updatedParcel: Parcel = {
          ...selectedParcel,
          level: 'legendary',
          dollarsPerSecond: data.parcel.dollarsPerSecond,
        };
        
        // Update in userParcels array
        setUserParcels(
          userParcels.map(p => p.id === selectedParcel.id ? updatedParcel : p)
        );
        
        setSelectedParcel(updatedParcel);
        onRefresh();
      } else {
        setError(data.error || 'Erreur lors de l\'amélioration');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error(err);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedParcel || !user) return;

    if (user.pulseBucks < selectedParcel.price) {
      setError('PulseBucks insuffisants!');
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const response = await fetch('/api/parcels/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: user.walletAddress,
          lat: selectedParcel.lat,
          lng: selectedParcel.lng,
          price: selectedParcel.price,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPurchasedRarity(data.parcel.level);
        setPurchaseSuccess(true);
        updatePulseBucks(-selectedParcel.price);
        
        const updatedParcel: Parcel = {
          ...selectedParcel,
          id: data.parcel.id,
          lat: data.parcel.lat, // Use grid-aligned coordinates from API
          lng: data.parcel.lng, // Use grid-aligned coordinates from API
          name: generateParcelName(data.parcel.lat, data.parcel.lng), // Regenerate name with aligned coords
          level: data.parcel.level,
          dollarsPerSecond: data.parcel.dollarsPerSecond,
          isOwned: true,
          isOwnedByUser: true,
          ownerId: user.id,
        };
        
        addParcel(updatedParcel);
        onRefresh();
      } else {
        setError(data.error || 'Erreur lors de l\'achat');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error(err);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleBuild = async () => {
    if (!selectedBuilding || !selectedParcel || !user) return;

    const buildingConfig = GAME_CONFIG.BUILDINGS[selectedBuilding as keyof typeof GAME_CONFIG.BUILDINGS];
    
    if (user.pulseBucks < buildingConfig.price) {
      setError('PulseBucks insuffisants!');
      return;
    }

    setIsBuilding(true);
    setError(null);

    try {
      const response = await fetch('/api/buildings/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: user.walletAddress,
          parcelId: selectedParcel.id,
          buildingType: selectedBuilding,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        updatePulseBucks(-buildingConfig.price);
        setParcelBuildings([...parcelBuildings, data.building]);
        onRefresh();
      } else {
        setError(data.error || 'Erreur lors de la construction');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error(err);
    } finally {
      setIsBuilding(false);
    }
  };

  const getBuildingIcon = (type: string) => {
    switch (type) {
      case 'house': return <Home className="h-5 w-5" />;
      case 'office': return <BuildingIcon className="h-5 w-5" />;
      case 'factory': return <Factory className="h-5 w-5" />;
      case 'castle': return <Crown className="h-5 w-5" />;
      case 'citadel': return <Landmark className="h-5 w-5" />;
      default: return <Building2 className="h-5 w-5" />;
    }
  };

  // Check if user can build a specific building type
  const canBuildBuilding = (buildingType: string): { canBuild: boolean; reason?: string } => {
    if (!user) return { canBuild: false, reason: 'Utilisateur non connecté' };
    
    const config = GAME_CONFIG.BUILDINGS[buildingType as keyof typeof GAME_CONFIG.BUILDINGS];
    
    if (user.pulseBucks < config.price) {
      return { canBuild: false, reason: `PulseBucks insuffisants (${user.pulseBucks.toFixed(0)}/${config.price})` };
    }
    
    // Special requirement for Citadel
    if (buildingType === 'citadel') {
      // This will be checked server-side, but we show a warning
      return { canBuild: true }; // Let server validate
    }
    
    return { canBuild: true };
  };

  if (!selectedParcel) return null;

  const canPurchase = !selectedParcel.isOwned && user && user.pulseBucks >= selectedParcel.price;

  // Upgrade success screen
  if (upgradeSuccess) {
    const legendaryConfig = GAME_CONFIG.RARITY_LEVELS.legendary;
    const dailyDollars = getDollarsPerSecond('legendary') * 86400;
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="glass-card border-orange-500/30 max-w-lg">
          <div className="py-8 text-center">
            {/* Legendary reveal animation */}
            <div 
              className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl animate-pulse"
              style={{ 
                backgroundColor: `${legendaryConfig.color}30`, 
                boxShadow: `0 0 60px ${legendaryConfig.color}70, 0 0 100px ${legendaryConfig.color}40` 
              }}
            >
              {legendaryConfig.emoji}
            </div>
            
            <h3 className="text-2xl font-bold mb-2">✨ Amélioration réussie!</h3>
            
            <div className="mb-4">
              <Badge 
                style={{ 
                  backgroundColor: `${legendaryConfig.color}20`, 
                  borderColor: legendaryConfig.color, 
                  color: legendaryConfig.color,
                  fontSize: '1rem',
                  padding: '8px 16px',
                }}
                variant="outline"
              >
                {legendaryConfig.emoji} {legendaryConfig.name}
              </Badge>
            </div>
            
            <p className="text-muted-foreground mb-2">
              <span className="text-lg font-semibold text-cyan-400">
                {formatDollarsCompact(dailyDollars)}/jour
              </span>
            </p>
            
            <p className="text-sm text-muted-foreground mb-6">
              Multiplicateur: x{legendaryConfig.incomeMultiplier}
            </p>
            
            <div className="glass-card rounded-lg p-4 mb-6 text-left">
              <div className="text-xs text-muted-foreground mb-1">Parcelle améliorée</div>
              <div className="font-semibold">{selectedParcel.name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {selectedParcel.lat.toFixed(4)}°, {selectedParcel.lng.toFixed(4)}°
              </div>
            </div>
            
            <Button onClick={handleClose} className="gradient-bg w-full" size="lg">
              <CheckCircle className="mr-2 h-4 w-4" />
              Continuer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Success screen with revealed rarity
  if (purchaseSuccess && purchasedRarity) {
    const rarityConfig = GAME_CONFIG.RARITY_LEVELS[purchasedRarity as keyof typeof GAME_CONFIG.RARITY_LEVELS];
    const dailyDollars = getDollarsPerSecond(purchasedRarity as keyof typeof GAME_CONFIG.RARITY_LEVELS) * 86400;
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="glass-card border-purple-500/30 max-w-lg">
          <div className="py-8 text-center">
            {/* Mystery reveal animation */}
            <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl animate-pulse"
              style={{ backgroundColor: `${rarityConfig.color}30`, boxShadow: `0 0 40px ${rarityConfig.color}50` }}
            >
              {rarityConfig.emoji}
            </div>
            
            <h3 className="text-2xl font-bold mb-2">🎉 Parcelle achetée!</h3>
            
            <div className="mb-4">
              <Badge 
                style={{ 
                  backgroundColor: `${rarityConfig.color}20`, 
                  borderColor: rarityConfig.color, 
                  color: rarityConfig.color,
                  fontSize: '1rem',
                  padding: '8px 16px',
                }}
                variant="outline"
              >
                {rarityConfig.emoji} {rarityConfig.name}
              </Badge>
            </div>
            
            <p className="text-muted-foreground mb-2">
              <span className="text-lg font-semibold text-cyan-400">
                {formatDollarsCompact(dailyDollars)}/jour
              </span>
            </p>
            
            <p className="text-sm text-muted-foreground mb-6">
              Multiplicateur: x{rarityConfig.incomeMultiplier}
            </p>
            
            <div className="glass-card rounded-lg p-4 mb-6 text-left">
              <div className="text-xs text-muted-foreground mb-1">Emplacement</div>
              <div className="font-semibold">{selectedParcel.name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {selectedParcel.lat.toFixed(4)}°, {selectedParcel.lng.toFixed(4)}°
              </div>
            </div>
            
            <Button onClick={handleClose} className="gradient-bg w-full" size="lg">
              <CheckCircle className="mr-2 h-4 w-4" />
              Continuer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Owned parcel view (show all info)
  if (selectedParcel.isOwnedByUser) {
    const rarityConfig = GAME_CONFIG.RARITY_LEVELS[selectedParcel.level];
    const dailyDollars = (selectedParcel.dollarsPerSecond || 0) * 86400;
    const legendaryDailyDollars = getDollarsPerSecond('legendary') * 86400;
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="glass-card border-purple-500/30 max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${rarityConfig.color}20` }}
              >
                {rarityConfig.emoji}
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedParcel.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <MapPin className="h-3 w-3" />
                  {selectedParcel.lat.toFixed(4)}°, {selectedParcel.lng.toFixed(4)}°
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-3 glass-card">
              <TabsTrigger value="info">Informations</TabsTrigger>
              <TabsTrigger value="upgrade" disabled={selectedParcel.level === 'legendary'}>
                {selectedParcel.level === 'legendary' ? 'Max' : 'Améliorer'}
              </TabsTrigger>
              <TabsTrigger value="build" disabled={!!selectedParcel.occupiedByBuildingId}>
                {selectedParcel.occupiedByBuildingId ? 'Occupé' : 'Construire'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  style={{ borderColor: rarityConfig.color, color: rarityConfig.color }}
                >
                  {rarityConfig.emoji} {rarityConfig.name}
                </Badge>
                <span className="text-xs text-muted-foreground">x{rarityConfig.incomeMultiplier} revenus</span>
              </div>
              
              {/* Occupied warning */}
              {selectedParcel.occupiedByBuildingId && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-400 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Cette parcelle est occupée par un bâtiment
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">$/sec</div>
                  <div className="text-lg font-semibold text-cyan-400">
                    {formatDollars(selectedParcel.dollarsPerSecond || 0)}
                  </div>
                </div>
                <div className="glass-card rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Par jour</div>
                  <div className="text-lg font-semibold text-cyan-400">
                    {formatDollarsCompact(dailyDollars)}
                  </div>
                </div>
              </div>

              {/* Quick upgrade button for non-legendary */}
              {selectedParcel.level !== 'legendary' && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-orange-400" />
                      <span className="text-sm">Passez en Légendaire!</span>
                    </div>
                    <span className="text-orange-400 font-semibold">{upgradeCost} PB</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    x4 revenus • {formatDollarsCompact(legendaryDailyDollars)}/jour
                  </p>
                </div>
              )}

              {parcelBuildings.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Bâtiments ({parcelBuildings.length})</div>
                  <div className="flex gap-2">
                    {parcelBuildings.map((building) => (
                      <div key={building.id} className="glass-card rounded-lg p-2 flex items-center gap-2">
                        {getBuildingIcon(building.type)}
                        <span className="text-sm">{building.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upgrade" className="space-y-4 mt-4">
              {selectedParcel.level === 'legendary' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                    style={{ backgroundColor: `${GAME_CONFIG.RARITY_LEVELS.legendary.color}30` }}
                  >
                    {GAME_CONFIG.RARITY_LEVELS.legendary.emoji}
                  </div>
                  <p className="text-lg font-semibold text-orange-400">Cette parcelle est déjà Légendaire!</p>
                  <p className="text-sm text-muted-foreground mt-1">Elle génère le maximum de revenus.</p>
                </div>
              ) : (
                <>
                  {/* Current rarity */}
                  <div className="flex items-center justify-between p-3 glass-card rounded-lg">
                    <span className="text-muted-foreground">Rareté actuelle</span>
                    <Badge 
                      variant="outline" 
                      style={{ borderColor: rarityConfig.color, color: rarityConfig.color }}
                    >
                      {rarityConfig.emoji} {rarityConfig.name}
                    </Badge>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <ArrowUpCircle className="h-8 w-8 text-orange-400 animate-bounce" />
                  </div>

                  {/* Target rarity */}
                  <div className="p-4 rounded-lg border-2 border-orange-500/50 bg-orange-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold">Améliorer en</span>
                      <Badge 
                        style={{ 
                          backgroundColor: `${GAME_CONFIG.RARITY_LEVELS.legendary.color}20`, 
                          borderColor: GAME_CONFIG.RARITY_LEVELS.legendary.color, 
                          color: GAME_CONFIG.RARITY_LEVELS.legendary.color 
                        }}
                      >
                        {GAME_CONFIG.RARITY_LEVELS.legendary.emoji} {GAME_CONFIG.RARITY_LEVELS.legendary.name}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-background/50 rounded p-2">
                        <div className="text-muted-foreground">Revenus actuels</div>
                        <div className="font-semibold">{formatDollarsCompact(dailyDollars)}/j</div>
                      </div>
                      <div className="bg-orange-500/20 rounded p-2">
                        <div className="text-orange-400">Nouveaux revenus</div>
                        <div className="font-semibold text-orange-400">{formatDollarsCompact(legendaryDailyDollars)}/j</div>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-background/50 rounded text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Multiplicateur</span>
                        <span className="text-green-400 font-semibold">x{GAME_CONFIG.RARITY_LEVELS.legendary.incomeMultiplier} revenus</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost */}
                  <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                    <span className="text-muted-foreground">Coût de l&apos;amélioration</span>
                    <span className="text-2xl font-bold text-yellow-400">{upgradeCost} PB</span>
                  </div>

                  {/* User balance */}
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg text-sm">
                    <span className="text-muted-foreground">Votre solde</span>
                    <span className={user && user.pulseBucks >= upgradeCost ? 'text-green-400' : 'text-red-400'}>
                      {user ? user.pulseBucks.toFixed(0) : 0} PB
                    </span>
                  </div>

                  {error && <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</div>}

                  {/* Upgrade Button */}
                  <Button
                    onClick={handleUpgrade}
                    disabled={!canUpgrade || isUpgrading}
                    className="w-full gradient-bg"
                    size="lg"
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Amélioration...
                      </>
                    ) : !user ? (
                      'Connectez votre wallet'
                    ) : user.pulseBucks < upgradeCost ? (
                      <>
                        <Coins className="mr-2 h-4 w-4" />
                        PulseBucks insuffisants ({user.pulseBucks.toFixed(0)}/{upgradeCost})
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        ✨ Améliorer en Légendaire
                      </>
                    )}
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="build" className="space-y-4 mt-4">
              {selectedParcel.occupiedByBuildingId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Cette parcelle est déjà occupée par un bâtiment.</p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground mb-2">
                    Construisez des bâtiments pour augmenter vos revenus
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                {Object.entries(GAME_CONFIG.BUILDINGS).map(([key, config]) => {
                  const buildCheck = canBuildBuilding(key);
                  const isSelected = selectedBuilding === key;
                  const isCitadel = key === 'citadel';
                  
                  return (
                    <div
                      key={key}
                      onClick={() => buildCheck.canBuild && setSelectedBuilding(key)}
                      className={`glass-card rounded-lg p-3 cursor-pointer transition-all relative ${
                        isSelected ? 'border-purple-500 bg-purple-500/10' : 
                        !buildCheck.canBuild ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-500/50'
                      }`}
                    >
                      {/* Citadel special badge */}
                      {isCitadel && (
                        <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          EXIGENCES
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{config.emoji}</span>
                        <span className="font-medium">{config.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-yellow-400">{config.price} PB</span>
                        <span className="text-cyan-400">Boost global</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                        <span>Boost: +{config.boostPercent}%</span>
                      </div>
                      
                      {/* Citadel requirements */}
                      {isCitadel && (
                        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-orange-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Nécessite {config.capacity} parcelles libres adjacentes
                        </div>
                      )}
                      
                      {/* Insufficient funds warning */}
                      {!buildCheck.canBuild && !isCitadel && (
                        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-red-400">
                          {buildCheck.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {error && <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</div>}

              {selectedBuilding && (
                <Button
                  onClick={handleBuild}
                  disabled={!user || !canBuildBuilding(selectedBuilding).canBuild || isBuilding}
                  className="w-full gradient-bg"
                >
                  {isBuilding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Construction...
                    </>
                  ) : (
                    <>
                      <Building2 className="mr-2 h-4 w-4" />
                      Construire {GAME_CONFIG.BUILDINGS[selectedBuilding as keyof typeof GAME_CONFIG.BUILDINGS].name}
                    </>
                  )}
                </Button>
              )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

  // Purchase view (MYSTERY - no rarity shown)
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-purple-500/30 max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-2xl">
              <HelpCircle className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">📦 Parcelle Mystère</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <MapPin className="h-3 w-3" />
                {selectedParcel.lat.toFixed(4)}°, {selectedParcel.lng.toFixed(4)}°
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Mystery Box */}
          <div className="glass-card rounded-lg p-6 text-center border-2 border-dashed border-purple-500/30">
            <div className="text-4xl mb-3">🎁</div>
            <div className="text-lg font-semibold mb-2">Rareté inconnue</div>
            <p className="text-sm text-muted-foreground">
              La rareté sera révélée après l&apos;achat !
            </p>
          </div>

          {/* Lottery chances */}
          <div className="glass-card rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-4 w-4 text-yellow-400" />
              <span className="font-semibold text-sm">Chances de rareté</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(GAME_CONFIG.RARITY_LEVELS).map(([key, config]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded bg-background/50">
                  <span>{config.emoji} {config.name}</span>
                  <span style={{ color: config.color, fontWeight: 'bold' }}>
                    {(config.probability * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between p-4 glass-card rounded-lg">
            <span className="text-muted-foreground">Prix</span>
            <span className="text-2xl font-bold text-yellow-400">{selectedParcel.price} PB</span>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</div>
          )}

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={!canPurchase || isPurchasing}
            className="w-full gradient-bg"
            size="lg"
          >
            {isPurchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Achat en cours...
              </>
            ) : !user ? (
              'Connectez votre wallet'
            ) : user.pulseBucks < selectedParcel.price ? (
              <>
                <Coins className="mr-2 h-4 w-4" />
                PulseBucks insuffisants ({user.pulseBucks.toFixed(0)}/{selectedParcel.price})
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                🎰 Acheter et révéler
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
