import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG, calculateParcelPrice } from '@/lib/game-config';

// GET /api/parcels/all - Get ALL parcels in a geographic area (for map display)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minLat = searchParams.get('minLat');
    const maxLat = searchParams.get('maxLat');
    const minLng = searchParams.get('minLng');
    const maxLng = searchParams.get('maxLng');

    if (!minLat || !maxLat || !minLng || !maxLng) {
      return NextResponse.json({ error: 'Bounds required' }, { status: 400 });
    }

    // Add some padding to bounds for smoother scrolling
    const padding = 0.005; // ~500m
    const parcels = await prisma.parcel.findMany({
      where: {
        lat: {
          gte: parseFloat(minLat) - padding,
          lte: parseFloat(maxLat) + padding,
        },
        lng: {
          gte: parseFloat(minLng) - padding,
          lte: parseFloat(maxLng) + padding,
        },
      },
      include: {
        owner: {
          select: { walletAddress: true }
        }
      }
    });

    // Get all buildings that occupy these parcels
    const buildingIds = new Set<string>();
    parcels.forEach(p => {
      if (p.occupiedByBuildingId) {
        buildingIds.add(p.occupiedByBuildingId);
      }
    });

    const buildings = buildingIds.size > 0 ? await prisma.building.findMany({
      where: { id: { in: Array.from(buildingIds) } }
    }) : [];

    // Create building map
    const buildingMap = new Map(buildings.map(b => [b.id, b]));

    const formattedParcels = parcels.map(parcel => {
      const building = parcel.occupiedByBuildingId ? buildingMap.get(parcel.occupiedByBuildingId) : null;
      const buildingConfig = building ? GAME_CONFIG.BUILDINGS[building.type as keyof typeof GAME_CONFIG.BUILDINGS] : null;
      const rarityConfig = GAME_CONFIG.RARITY_LEVELS[parcel.level as keyof typeof GAME_CONFIG.RARITY_LEVELS] || GAME_CONFIG.RARITY_LEVELS.common;
      
      return {
        id: parcel.id,
        lat: parcel.lat,
        lng: parcel.lng,
        level: parcel.level,
        price: calculateParcelPrice(parcel.lat, parcel.lng),
        name: `${parcel.lat.toFixed(4)}°N ${parcel.lng.toFixed(4)}°E`,
        dollarsPerSecond: parcel.dollarsPerSecond,
        improvementLevel: parcel.improvementLevel,
        isOwned: true,
        ownerWallet: parcel.owner?.walletAddress,
        occupiedByBuildingId: parcel.occupiedByBuildingId,
        building: building ? {
          id: building.id,
          type: building.type,
          name: building.name,
          emoji: buildingConfig?.emoji || '🏗️',
          capacity: building.capacity,
        } : null,
        rarityColor: rarityConfig.color,
        rarityEmoji: rarityConfig.emoji,
        rarityName: rarityConfig.name,
      };
    });

    return NextResponse.json({ parcels: formattedParcels });
  } catch (error) {
    console.error('Error fetching all parcels:', error);
    return NextResponse.json({ error: 'Failed to fetch parcels' }, { status: 500 });
  }
}
