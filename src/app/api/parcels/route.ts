import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG, getDollarsPerSecond } from '@/lib/game-config';

// GET /api/parcels - Get user's parcels
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        parcels: true,
      },
    });

    if (!user) {
      return NextResponse.json({ parcels: [] });
    }

    // Format parcels for frontend
    const parcels = user.parcels.map(p => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      level: p.level,
      price: GAME_CONFIG.PARCEL_BASE_PRICE_PB,
      name: `${p.lat.toFixed(4)}°${p.lat >= 0 ? 'N' : 'S'} ${p.lng.toFixed(4)}°${p.lng >= 0 ? 'E' : 'W'}`,
      dollarsPerSecond: p.dollarsPerSecond,
      improvementLevel: p.improvementLevel,
      ownerId: p.ownerId,
      isOwnedByUser: true,
      isOwned: true,
    }));

    return NextResponse.json({ parcels });
  } catch (error) {
    console.error('Error fetching parcels:', error);
    return NextResponse.json({ error: 'Failed to fetch parcels' }, { status: 500 });
  }
}
