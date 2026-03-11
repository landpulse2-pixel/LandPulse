'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Parcel } from '@/store/gameStore';
import { ParcelModal } from './ParcelModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { GAME_CONFIG, calculateParcelPrice, generateParcelName } from '@/lib/game-config';
import { SearchBar } from './SearchBar';
import { MapPin, Loader2, HandCoins, Navigation, ChevronDown, Globe } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components (client-side only)
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full rounded-lg glass-card flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  ),
});

// Interface for map parcels (from API) - must match MapComponent
interface MapParcel {
  id: string;
  lat: number;
  lng: number;
  level: string;
  isOwned: boolean;
  ownerWallet?: string;
  occupiedByBuildingId?: string | null;
  building?: {
    id: string;
    type: string;
    name: string;
    emoji: string;
    capacity: number;
  } | null;
  name: string;
  dollarsPerSecond: number;
  price?: number;
  rarityColor?: string;
  rarityEmoji?: string;
  rarityName?: string;
}

export function WorldMap() {
  const { 
    walletAddress, 
    userParcels, 
    setUserParcels, 
    setSelectedParcel, 
    isLoading, 
    setLoading,
    mapCenter,
    mapZoom,
    setMapCenter,
    setMapZoom,
    buildings
  } = useGameStore();
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showParcelDropdown, setShowParcelDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ flyTo: (lat: number, lng: number, zoom: number) => void }>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowParcelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user parcels
  const fetchUserParcels = useCallback(async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/parcels?wallet=${walletAddress}`);
      const data = await response.json();
      setUserParcels(data.parcels || []);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, setUserParcels, setLoading]);

  useEffect(() => {
    fetchUserParcels();
    setMapLoaded(true);
  }, [fetchUserParcels]);

  // Handle parcel creation from map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    const price = calculateParcelPrice(lat, lng);
    const name = generateParcelName(lat, lng);
    
    const newParcel: Parcel = {
      id: `temp-${Date.now()}`,
      lat,
      lng,
      level: 'common',
      price,
      name,
      dollarsPerSecond: 0,
      improvementLevel: 0,
      isOwned: false,
      isOwnedByUser: false,
    };
    
    setSelectedParcel(newParcel);
  }, [setSelectedParcel]);

  // Handle click on an existing parcel
  const handleParcelClick = useCallback((parcel: MapParcel) => {
    const parcelForModal: Parcel = {
      id: parcel.id,
      lat: parcel.lat,
      lng: parcel.lng,
      level: parcel.level as Parcel['level'],
      price: parcel.price || calculateParcelPrice(parcel.lat, parcel.lng),
      name: parcel.name,
      dollarsPerSecond: parcel.dollarsPerSecond,
      improvementLevel: 0,
      isOwned: parcel.isOwned,
      isOwnedByUser: parcel.ownerWallet === walletAddress,
      ownerWallet: parcel.ownerWallet,
      occupiedByBuildingId: parcel.occupiedByBuildingId,
      buildings: parcel.building ? [{
        id: parcel.building.id,
        type: parcel.building.type as Parcel['buildings'][0]['type'],
        name: parcel.building.name,
        price: 0,
        boostPercent: 0,
        ownerId: '',
        level: 1,
        lastCollected: '',
      }] : [],
    };
    
    setSelectedParcel(parcelForModal);
  }, [walletAddress, setSelectedParcel]);

  // Handle location selection from search
  const handleLocationSelect = useCallback((lat: number, lng: number, _name: string) => {
    setMapCenter([lng, lat]);
    setMapZoom(19);
  }, [setMapCenter, setMapZoom]);

  // Handle popular city click
  const handlePopularCityClick = useCallback((lat: number, lng: number, _name: string) => {
    setMapCenter([lng, lat]);
    setMapZoom(14);
  }, [setMapCenter, setMapZoom]);

  // Navigate to specific parcel
  const handleGoToParcel = useCallback((parcel: Parcel) => {
    setMapCenter([parcel.lng, parcel.lat]);
    setMapZoom(19);
    setShowParcelDropdown(false);
  }, [setMapCenter, setMapZoom]);

  // See all parcels - zoom to fit all
  const handleSeeAllParcels = useCallback(() => {
    if (userParcels.length === 0) return;
    
    if (userParcels.length === 1) {
      const parcel = userParcels[0];
      setMapCenter([parcel.lng, parcel.lat]);
      setMapZoom(19);
    } else {
      // Calculate bounds
      const lats = userParcels.map(p => p.lat);
      const lngs = userParcels.map(p => p.lng);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      
      // Calculate appropriate zoom based on spread
      const latSpread = Math.max(...lats) - Math.min(...lats);
      const lngSpread = Math.max(...lngs) - Math.min(...lngs);
      const maxSpread = Math.max(latSpread, lngSpread);
      
      // Approximate zoom level based on spread
      let zoom = 10;
      if (maxSpread > 50) zoom = 2;
      else if (maxSpread > 20) zoom = 3;
      else if (maxSpread > 10) zoom = 4;
      else if (maxSpread > 5) zoom = 5;
      else if (maxSpread > 2) zoom = 6;
      else if (maxSpread > 1) zoom = 7;
      else if (maxSpread > 0.5) zoom = 8;
      else if (maxSpread > 0.2) zoom = 9;
      else zoom = 10;
      
      setMapCenter([centerLng, centerLat]);
      setMapZoom(zoom);
    }
    setShowParcelDropdown(false);
  }, [userParcels, setMapCenter, setMapZoom]);

  // Group parcels by approximate region
  const getParcelRegion = (lat: number, lng: number): string => {
    if (lat > 60) return '🧊 Nord';
    if (lat < -30) return '🐧 Sud';
    if (lat > 30 && lng > -30 && lng < 60) return '🌍 Europe/Afrique';
    if (lat > 30 && lng >= 60) return '🌏 Asie';
    if (lat > 30 && lng < -30) return '🌎 Amérique Nord';
    if (lat <= 30 && lat >= -30 && lng > -30 && lng < 60) return '🌍 Afrique';
    if (lat <= 30 && lat >= -30 && lng >= 60) return '🌏 Asie/Océanie';
    if (lat <= 30 && lat >= -30 && lng < -30) return '🌎 Amérique Sud';
    return '🌍 Monde';
  };

  // Get rarity color
  const getRarityColor = (level: string): string => {
    const config = GAME_CONFIG.RARITY_LEVELS[level as keyof typeof GAME_CONFIG.RARITY_LEVELS];
    return config?.color || '#a0a0a0';
  };

  const isGridReady = mapZoom >= 19;

  if (isLoading && !mapLoaded) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar and My Parcels Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <SearchBar 
          onLocationSelect={handleLocationSelect}
          onPopularCityClick={handlePopularCityClick}
        />
        
        <div className="flex items-center gap-3">
          {/* My Parcels Dropdown */}
          {userParcels.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <Button
                onClick={() => setShowParcelDropdown(!showParcelDropdown)}
                variant="outline"
                size="sm"
                className="glass-card border-green-500/30 hover:bg-green-500/20 text-green-400"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Mes parcelles ({userParcels.length})
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              
              {showParcelDropdown && (
                <div className="absolute top-full mt-2 right-0 w-72 max-h-80 overflow-y-auto glass-card rounded-lg border border-purple-500/30 shadow-xl z-[1001]">
                  {/* See All Button */}
                  {userParcels.length > 1 && (
                    <button
                      onClick={handleSeeAllParcels}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-purple-500/20 flex items-center gap-2 border-b border-purple-500/20 text-purple-400 font-medium"
                    >
                      <Globe className="h-4 w-4" />
                      Voir toutes mes parcelles
                    </button>
                  )}
                  
                  {/* Parcel List */}
                  <div className="py-1">
                    {userParcels.map((parcel, index) => (
                      <button
                        key={parcel.id}
                        onClick={() => handleGoToParcel(parcel)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-purple-500/10 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getRarityColor(parcel.level) }}
                          />
                          <span className="truncate text-white/90">{parcel.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {getParcelRegion(parcel.lat, parcel.lng)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Legend */}
          <div className="hidden md:flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground">Rareté:</span>
            {Object.entries(GAME_CONFIG.RARITY_LEVELS).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-muted-foreground">{(config.probability * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden glass-card border border-purple-500/20">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000]">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}
        
        {/* Grid Ready Indicator */}
        {isGridReady && (
          <div className="absolute top-4 right-4 glass-card rounded-lg px-4 py-2 z-[1000] border border-green-500/50 bg-green-500/10">
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-2 text-green-400">
                <HandCoins className="h-4 w-4" />
                <span>Case verte = disponible</span>
              </div>
              <div className="flex items-center gap-2 text-red-400">
                <span>Case rouge = achetée</span>
              </div>
            </div>
          </div>
        )}
        
        <MapComponent
          ref={mapRef}
          center={mapCenter}
          zoom={mapZoom}
          parcels={[]}
          userWallet={walletAddress}
          onMapClick={handleMapClick}
          onParcelClick={handleParcelClick}
          onMoveEnd={(center, zoom) => {
            setMapCenter(center);
            setMapZoom(zoom);
          }}
          refreshKey={refreshKey}
        />

        {/* Coordinates Display */}
        <div className="absolute top-4 left-4 glass-card rounded-lg px-3 py-1 text-xs text-muted-foreground z-[1000]">
          Lat: {mapCenter[1].toFixed(4)}° | Lng: {mapCenter[0].toFixed(4)}° | Zoom: {mapZoom.toFixed(0)}x
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 right-4 glass-card rounded-lg px-3 py-2 text-xs z-[1000] text-muted-foreground">
          {isGridReady 
            ? '🎁 Cliquez sur une case verte pour acheter'
            : userParcels.length > 0 
              ? `🔍 Vous avez ${userParcels.length} parcelle${userParcels.length > 1 ? 's' : ''} - Cliquez sur "Mes parcelles" pour les voir`
              : '🔍 Zoomez pour voir les parcelles'}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-lg p-4 text-center">
          <div className="text-2xl font-bold gradient-text">
            {userParcels.length}
          </div>
          <div className="text-xs text-muted-foreground">Vos parcelles</div>
        </div>
        <div className="glass-card rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {buildings.filter(b => b.type === 'house').length}
          </div>
          <div className="text-xs text-muted-foreground">Maisons</div>
        </div>
        <div className="glass-card rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {userParcels.reduce((sum, p) => sum + p.price, 0)}
          </div>
          <div className="text-xs text-muted-foreground">Valeur totale (PB)</div>
        </div>
      </div>

      {/* Parcel Modal */}
      <ParcelModal onRefresh={fetchUserParcels} />
    </div>
  );
}
