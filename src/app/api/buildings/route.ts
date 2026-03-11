import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// GET /api/buildings - Get user's buildings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        buildings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ buildings: [] });
    }

    const buildings = user.buildings.map(building => {
      const config = GAME_CONFIG.BUILDINGS[building.type as keyof typeof GAME_CONFIG.BUILDINGS];
      return {
        id: building.id,
        type: building.type,
        name: building.name,
        price: building.price,
        capacity: building.capacity,
        boostPercent: building.boostPercent,
        dollarsPerDay: config?.dollarsPerDay || 0,
        ownerId: building.ownerId,
        level: 1,
        lastCollected: building.createdAt.toISOString(),
        assignedParcels: building.assignedParcels ? JSON.parse(building.assignedParcels) : [],
        createdAt: building.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ buildings });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 });
  }
}
