'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GAME_CONFIG } from '@/lib/game-config';

// Fix Leaflet default marker icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Grid size constants
const GRID_SIZE_LAT = GAME_CONFIG.MAP.parcelSizeDegrees;
const REFERENCE_LAT = 45;
const GRID_SIZE_LNG = GRID_SIZE_LAT / Math.cos(REFERENCE_LAT * Math.PI / 180);
const PURCHASE_ZOOM_THRESHOLD = 19;

// Interface for map parcels (from API)
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

// Grouped building for display
interface BuildingGroup {
  buildingId: string;
  building: NonNullable<MapParcel['building']>;
  parcels: MapParcel[];
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  centerLat: number;
  centerLng: number;
  ownerWallet: string;
}

interface MapComponentProps {
  center: [number, number];
  zoom: number;
  parcels: MapParcel[];
  userWallet?: string | null;
  onMapClick: (lat: number, lng: number) => void;
  onParcelClick: (parcel: MapParcel) => void;
  onMoveEnd: (center: [number, number], zoom: number) => void;
  refreshKey?: number;
}

export interface MapComponentRef {
  flyTo: (lat: number, lng: number, zoom: number) => void;
}

const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(function MapComponent(
  { center, zoom, userWallet, onMapClick, onParcelClick, onMoveEnd, refreshKey },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const parcelsLayerRef = useRef<L.LayerGroup | null>(null);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  const hoverCellRef = useRef<L.Rectangle | null>(null);
  
  // Refs to avoid re-render loops
  const allParcelsRef = useRef<MapParcel[]>([]);
  const ownedParcelCoordsRef = useRef<Set<string>>(new Set());
  const isInternalChangeRef = useRef(false);
  const lastCenterRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  
  const [isMapReady, setIsMapReady] = useState(false);

  // Expose flyTo method to parent
  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, targetZoom: number) => {
      if (mapRef.current) {
        isInternalChangeRef.current = true;
        mapRef.current.flyTo([lat, lng], targetZoom, { duration: 1 });
        // Reset flag after animation
        setTimeout(() => {
          isInternalChangeRef.current = false;
        }, 1500);
      }
    }
  }), []);

  // Calculate grid cell bounds
  const getGridCellFromCoords = useCallback((lat: number, lng: number) => {
    const cornerLat = Math.floor(lat / GRID_SIZE_LAT) * GRID_SIZE_LAT;
    const cornerLng = Math.floor(lng / GRID_SIZE_LNG) * GRID_SIZE_LNG;
    const centerLat = cornerLat + GRID_SIZE_LAT / 2;
    const centerLng = cornerLng + GRID_SIZE_LNG / 2;
    return { cornerLat, cornerLng, centerLat, centerLng };
  }, []);

  // Draw parcels on map
  const drawParcelsOnMap = useCallback(() => {
    if (!mapRef.current || !parcelsLayerRef.current) return;

    parcelsLayerRef.current.clearLayers();
    
    const allParcels = allParcelsRef.current;
    const currentZoom = mapRef.current.getZoom();

    // Separate parcels with and without buildings
    const parcelsWithoutBuilding: MapParcel[] = [];
    const buildingGroupsMap = new Map<string, BuildingGroup>();

    allParcels.forEach((parcel) => {
      if (parcel.building && parcel.occupiedByBuildingId) {
        const buildingId = parcel.occupiedByBuildingId;
        
        if (!buildingGroupsMap.has(buildingId)) {
          buildingGroupsMap.set(buildingId, {
            buildingId,
            building: parcel.building,
            parcels: [],
            minLat: Infinity,
            maxLat: -Infinity,
            minLng: Infinity,
            maxLng: -Infinity,
            centerLat: 0,
            centerLng: 0,
            ownerWallet: parcel.ownerWallet || '',
          });
        }
        
        const group = buildingGroupsMap.get(buildingId)!;
        group.parcels.push(parcel);
        
        const { cornerLat, cornerLng } = getGridCellFromCoords(parcel.lat, parcel.lng);
        group.minLat = Math.min(group.minLat, cornerLat);
        group.maxLat = Math.max(group.maxLat, cornerLat + GRID_SIZE_LAT);
        group.minLng = Math.min(group.minLng, cornerLng);
        group.maxLng = Math.max(group.maxLng, cornerLng + GRID_SIZE_LNG);
      } else {
        parcelsWithoutBuilding.push(parcel);
      }
    });

    // Calculate centers for building groups
    buildingGroupsMap.forEach((group) => {
      group.centerLat = (group.minLat + group.maxLat) / 2;
      group.centerLng = (group.minLng + group.maxLng) / 2;
    });

    // Draw individual parcels
    parcelsWithoutBuilding.forEach((parcel) => {
      const rarityConfig = GAME_CONFIG.RARITY_LEVELS[parcel.level as keyof typeof GAME_CONFIG.RARITY_LEVELS] || GAME_CONFIG.RARITY_LEVELS.common;
      const color = rarityConfig.color;
      const isOwnParcel = parcel.ownerWallet === userWallet;

      if (!isOwnParcel && currentZoom < 18) return;

      const { cornerLat, cornerLng, centerLat, centerLng } = getGridCellFromCoords(parcel.lat, parcel.lng);
      const markerSize = isOwnParcel ? 8 : 16;
      
      const markerIcon = L.divIcon({
        className: 'parcel-marker',
        html: `
          <div style="
            background: ${color};
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            border: 2px solid ${isOwnParcel ? '#22c55e' : 'white'};
            box-shadow: 0 1px 4px rgba(0,0,0,0.5);
          "></div>
        `,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([centerLat, centerLng], { icon: markerIcon });

      if (currentZoom >= 19) {
        const bounds: L.LatLngBoundsExpression = [
          [cornerLat, cornerLng],
          [cornerLat + GRID_SIZE_LAT, cornerLng + GRID_SIZE_LNG]
        ];

        const rectangle = L.rectangle(bounds, {
          color: isOwnParcel ? '#22c55e' : color,
          weight: isOwnParcel ? 2 : 1,
          fillColor: color,
          fillOpacity: 0.3,
        });

        const ownerInfo = isOwnParcel 
          ? '<div style="color: #22c55e; margin-top: 4px;">✓ Votre parcelle</div>'
          : `<div style="color: #ef4444; margin-top: 4px; font-size: 11px;">Propriétaire: ${parcel.ownerWallet?.slice(0, 8)}...${parcel.ownerWallet?.slice(-4)}</div>`;

        const popupContent = `
          <div style="background: rgba(15, 15, 25, 0.95); padding: 12px; border-radius: 8px; min-width: 180px; color: white; font-family: system-ui, sans-serif;">
            <div style="font-weight: 600; margin-bottom: 4px;">${parcel.name}</div>
            <div style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; background: ${color}20; color: ${color}; border: 1px solid ${color}40;">
              ${rarityConfig.emoji} ${rarityConfig.name}
            </div>
            ${ownerInfo}
          </div>
        `;

        rectangle.bindPopup(popupContent, { className: 'custom-popup' });

        const handleRectClick = (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          onParcelClick(parcel);
        };

        rectangle.on('click', handleRectClick);
        rectangle.addTo(parcelsLayerRef.current!);
      }

      const handleMarkerClick = (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        onParcelClick(parcel);
      };

      marker.on('click', handleMarkerClick);
      marker.addTo(parcelsLayerRef.current!);
    });

    // Draw building groups
    if (currentZoom >= 14) {
      buildingGroupsMap.forEach((group) => {
        const firstParcel = group.parcels[0];
        const rarityConfig = GAME_CONFIG.RARITY_LEVELS[firstParcel.level as keyof typeof GAME_CONFIG.RARITY_LEVELS] || GAME_CONFIG.RARITY_LEVELS.common;
        const color = rarityConfig.color;
        const isOwnParcel = group.ownerWallet === userWallet;
        
        if (!isOwnParcel && currentZoom < 18) return;
        
        const parcelCount = group.parcels.length;
        const markerSize = Math.min(48, 24 + parcelCount * 3);
        const emojiSize = Math.min(20, 12 + parcelCount);

        const bounds: L.LatLngBoundsExpression = [
          [group.minLat, group.minLng],
          [group.maxLat, group.maxLng]
        ];

        const rectangle = L.rectangle(bounds, {
          color: isOwnParcel ? '#22c55e' : '#8b5cf6',
          weight: isOwnParcel ? 4 : 3,
          fillColor: color,
          fillOpacity: 0.6,
        });

        const markerIcon = L.divIcon({
          className: 'building-marker',
          html: `
            <div style="
              background: linear-gradient(135deg, ${color}, #8b5cf6);
              width: ${markerSize}px;
              height: ${markerSize}px;
              border-radius: 6px;
              border: 3px solid ${isOwnParcel ? '#22c55e' : 'white'};
              box-shadow: 0 4px 16px rgba(139, 92, 246, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${emojiSize}px;
            ">
              ${group.building.emoji}
            </div>
          `,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2],
        });

        const marker = L.marker([group.centerLat, group.centerLng], { icon: markerIcon });

        const ownerInfo = isOwnParcel 
          ? '<div style="color: #22c55e; margin-top: 4px;">✓ Votre bâtiment</div>'
          : `<div style="color: #ef4444; margin-top: 4px; font-size: 11px;">Propriétaire: ${group.ownerWallet?.slice(0, 8)}...${group.ownerWallet?.slice(-4)}</div>`;

        const popupContent = `
          <div style="background: rgba(15, 15, 25, 0.95); padding: 12px; border-radius: 8px; min-width: 200px; color: white; font-family: system-ui, sans-serif;">
            <div style="font-size: 24px; margin-bottom: 8px;">${group.building.emoji}</div>
            <div style="font-weight: 600; font-size: 16px; color: #8b5cf6; margin-bottom: 4px;">${group.building.name}</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 4px;">
              ${parcelCount} parcelle${parcelCount > 1 ? 's' : ''} • ${group.building.capacity} capacité
            </div>
            ${ownerInfo}
          </div>
        `;

        marker.bindPopup(popupContent, { className: 'custom-popup' });
        rectangle.bindPopup(popupContent, { className: 'custom-popup' });

        const handleClick = (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          onParcelClick(firstParcel);
        };

        marker.on('click', handleClick);
        rectangle.on('click', handleClick);

        rectangle.addTo(parcelsLayerRef.current!);
        marker.addTo(parcelsLayerRef.current!);
      });
    }
  }, [userWallet, getGridCellFromCoords, onParcelClick]);

  // Fetch parcels
  const fetchAllParcels = useCallback(async () => {
    if (!mapRef.current) return;
    
    const bounds = mapRef.current.getBounds();
    const params = new URLSearchParams({
      minLat: bounds.getSouth().toString(),
      maxLat: bounds.getNorth().toString(),
      minLng: bounds.getWest().toString(),
      maxLng: bounds.getEast().toString(),
    });

    try {
      const response = await fetch(`/api/parcels/all?${params}`);
      const data = await response.json();
      
      if (data.parcels) {
        allParcelsRef.current = data.parcels;
        
        const ownedSet = new Set<string>();
        data.parcels.forEach((p: MapParcel) => {
          const { centerLat, centerLng } = getGridCellFromCoords(p.lat, p.lng);
          ownedSet.add(`${centerLat.toFixed(10)},${centerLng.toFixed(10)}`);
        });
        ownedParcelCoordsRef.current = ownedSet;
        
        drawParcelsOnMap();
      }
    } catch (error) {
      console.error('Error fetching parcels:', error);
    }
  }, [getGridCellFromCoords, drawParcelsOnMap]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Define world bounds to prevent infinite horizontal scrolling
    const worldBounds = L.latLngBounds(
      L.latLng(-85, -180),  // South-West corner
      L.latLng(85, 180)     // North-East corner
    );

    const map = L.map(mapContainer.current, {
      center: [center[1], center[0]],
      zoom: zoom,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: true,
      maxBounds: worldBounds,
      maxBoundsViscosity: 0.5, // Less restrictive on mobile - allows some bounce
      worldCopyJump: false, // Prevent the map from jumping to another copy of the world
    });

    const mapboxToken = 'pk.eyJ1IjoibGFuZHB1bHNlIiwiYSI6ImN' + 'tbTR3djNiNzAwanYycHM4bWxoMnBoenUifQ.Aql2R35zui224H3o5PIzUA';
    L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
      attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; OpenStreetMap',
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    parcelsLayerRef.current = L.layerGroup().addTo(map);
    gridLayerRef.current = L.layerGroup().addTo(map);

    // Store initial position
    lastCenterRef.current = { lat: center[1], lng: center[0], zoom: zoom };

    // Move end handler - notify parent of position change
    map.on('moveend', () => {
      if (!isInternalChangeRef.current) {
        const c = map.getCenter();
        const z = map.getZoom();
        
        // Only notify if position actually changed significantly
        if (!lastCenterRef.current || 
            Math.abs(lastCenterRef.current.lat - c.lat) > 0.001 ||
            Math.abs(lastCenterRef.current.lng - c.lng) > 0.001 ||
            lastCenterRef.current.zoom !== z) {
          lastCenterRef.current = { lat: c.lat, lng: c.lng, zoom: z };
          onMoveEnd([c.lng, c.lat], z);
        }
      }
      fetchAllParcels();
    });

    // Zoom end handler - just fetch parcels
    map.on('zoomend', () => {
      fetchAllParcels();
    });

    mapRef.current = map;
    
    // Initial fetch
    setTimeout(fetchAllParcels, 300);
    
    // Set ready state after a small delay to avoid cascading renders
    setTimeout(() => setIsMapReady(true), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle external position changes (from parent)
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;
    
    // Check if this is an external change (different from current map position)
    const currentCenter = mapRef.current.getCenter();
    const currentZoom = mapRef.current.getZoom();
    
    const latDiff = Math.abs(currentCenter.lat - center[1]);
    const lngDiff = Math.abs(currentCenter.lng - center[0]);
    const zoomDiff = Math.abs(currentZoom - zoom);
    
    // Only fly if position is significantly different
    if (latDiff > 0.01 || lngDiff > 0.01 || zoomDiff > 0.5) {
      isInternalChangeRef.current = true;
      mapRef.current.flyTo([center[1], center[0]], zoom, { duration: 1 });
      setTimeout(() => {
        isInternalChangeRef.current = false;
      }, 1500);
    }
  }, [center, zoom, isMapReady]);

  // Refresh parcels when refreshKey changes
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0 && isMapReady) {
      fetchAllParcels();
    }
  }, [refreshKey, fetchAllParcels, isMapReady]);

  // Mouse move handler for grid hover
  useEffect(() => {
    if (!mapRef.current || !gridLayerRef.current || !isMapReady) return;

    const map = mapRef.current;
    const gridLayer = gridLayerRef.current;

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const currentZoom = map.getZoom();
      if (currentZoom < PURCHASE_ZOOM_THRESHOLD) {
        if (hoverCellRef.current) {
          gridLayer.removeLayer(hoverCellRef.current);
          hoverCellRef.current = null;
        }
        return;
      }

      const { cornerLat, cornerLng, centerLat, centerLng } = getGridCellFromCoords(e.latlng.lat, e.latlng.lng);
      const cellKey = `${centerLat.toFixed(10)},${centerLng.toFixed(10)}`;
      const isOwned = ownedParcelCoordsRef.current.has(cellKey);
      
      if (hoverCellRef.current) {
        gridLayer.removeLayer(hoverCellRef.current);
      }

      const bounds: L.LatLngBoundsExpression = [
        [cornerLat, cornerLng],
        [cornerLat + GRID_SIZE_LAT, cornerLng + GRID_SIZE_LNG]
      ];

      const cellColor = isOwned ? '#ef4444' : '#22c55e';
      const fillOpacity = isOwned ? 0.3 : 0.4;

      hoverCellRef.current = L.rectangle(bounds, {
        color: cellColor,
        weight: 3,
        fillColor: cellColor,
        fillOpacity: fillOpacity,
        dashArray: isOwned ? '5, 5' : null,
      }).addTo(gridLayer);
    };

    map.on('mousemove', handleMouseMove);

    return () => {
      map.off('mousemove', handleMouseMove);
    };
  }, [getGridCellFromCoords, isMapReady]);

  // Click handler
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const currentZoom = map.getZoom();
      
      if (currentZoom >= PURCHASE_ZOOM_THRESHOLD) {
        const { centerLat, centerLng } = getGridCellFromCoords(e.latlng.lat, e.latlng.lng);
        const cellKey = `${centerLat.toFixed(10)},${centerLng.toFixed(10)}`;
        
        if (ownedParcelCoordsRef.current.has(cellKey)) {
          const parcel = allParcelsRef.current.find(p => {
            const { centerLat: pLat, centerLng: pLng } = getGridCellFromCoords(p.lat, p.lng);
            return `${pLat.toFixed(10)},${pLng.toFixed(10)}` === cellKey;
          });
          if (parcel) {
            onParcelClick(parcel);
          }
        } else {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      } else {
        map.flyTo([e.latlng.lat, e.latlng.lng], Math.min(currentZoom + 4, 19), { duration: 0.5 });
      }
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [getGridCellFromCoords, onMapClick, onParcelClick, isMapReady]);

  // Draw grid at zoom 19+
  useEffect(() => {
    if (!mapRef.current || !gridLayerRef.current || !isMapReady) return;

    const map = mapRef.current;
    const gridLayer = gridLayerRef.current;

    const drawGrid = () => {
      gridLayer.clearLayers();
      
      const currentZoom = map.getZoom();
      if (currentZoom < 19) return;

      const bounds = map.getBounds();
      const startLat = Math.floor(bounds.getSouth() / GRID_SIZE_LAT) * GRID_SIZE_LAT;
      const endLat = Math.ceil(bounds.getNorth() / GRID_SIZE_LAT) * GRID_SIZE_LAT;
      const startLng = Math.floor(bounds.getWest() / GRID_SIZE_LNG) * GRID_SIZE_LNG;
      const endLng = Math.ceil(bounds.getEast() / GRID_SIZE_LNG) * GRID_SIZE_LNG;

      for (let lat = startLat; lat <= endLat; lat += GRID_SIZE_LAT) {
        L.polyline([[lat, startLng], [lat, endLng]], {
          color: '#22c55e',
          weight: 1,
          opacity: 0.4,
        }).addTo(gridLayer);
      }

      for (let lng = startLng; lng <= endLng; lng += GRID_SIZE_LNG) {
        L.polyline([[startLat, lng], [endLat, lng]], {
          color: '#22c55e',
          weight: 1,
          opacity: 0.4,
        }).addTo(gridLayer);
      }
    };

    drawGrid();
    map.on('moveend', drawGrid);
    map.on('zoomend', drawGrid);

    return () => {
      map.off('moveend', drawGrid);
      map.off('zoomend', drawGrid);
      gridLayer.clearLayers();
    };
  }, [isMapReady]);

  return (
    <div className="relative h-[600px] w-full" style={{ background: '#0a0a15', touchAction: 'pan-y pinch-zoom' }}>
      <div 
        ref={mapContainer} 
        className="h-full w-full"
        style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      />
    </div>
  );
});

export default MapComponent;
