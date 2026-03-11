import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG, getDollarsPerSecond } from '@/lib/game-config';

// POST /api/parcels/upgrade - Upgrade a parcel to Legendary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, parcelId } = body;

    if (!wallet || !parcelId) {
      return NextResponse.json({ error: 'Wallet and parcelId required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get parcel
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
    }

    // Check ownership
    if (parcel.ownerId !== user.id) {
      return NextResponse.json({ error: 'You do not own this parcel' }, { status: 403 });
    }

    // Check if already legendary
    if (parcel.level === 'legendary') {
      return NextResponse.json({ error: 'This parcel is already Legendary!' }, { status: 400 });
    }

    // Check if user has enough PulseBucks
    const upgradeCost = GAME_CONFIG.PARCEL_UPGRADE_TO_LEGENDARY || 2500;
    if (user.pulseBucks < upgradeCost) {
      return NextResponse.json({ 
        error: 'Insufficient PulseBucks', 
        required: upgradeCost,
        current: user.pulseBucks,
      }, { status: 400 });
    }

    // Calculate new dollars per second for legendary
    const newDollarsPerSecond = getDollarsPerSecond('legendary');

    // Update parcel and user in transaction
    const [updatedParcel, updatedUser] = await prisma.$transaction([
      // Update parcel to legendary
      prisma.parcel.update({
        where: { id: parcelId },
        data: {
          level: 'legendary',
          dollarsPerSecond: newDollarsPerSecond,
        },
      }),
      // Deduct PulseBucks and update stats
      prisma.user.update({
        where: { id: user.id },
        data: {
          pulseBucks: { decrement: upgradeCost },
          totalSpent: { increment: upgradeCost },
        },
      }),
      // Create transaction record
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'upgrade_parcel',
          amount: upgradeCost,
          metadata: JSON.stringify({ parcelId, fromLevel: parcel.level, toLevel: 'legendary' }),
        },
      }),
    ]);

    const rarityConfig = GAME_CONFIG.RARITY_LEVELS.legendary;

    return NextResponse.json({
      success: true,
      parcel: {
        id: updatedParcel.id,
        level: updatedParcel.level,
        dollarsPerSecond: updatedParcel.dollarsPerSecond,
      },
      user: {
        pulseBucks: updatedUser.pulseBucks,
        totalSpent: updatedUser.totalSpent,
      },
      message: `Parcelle améliorée en ${rarityConfig.emoji} ${rarityConfig.name}!`,
      newDollarsPerDay: newDollarsPerSecond * 86400,
    });

  } catch (error) {
    console.error('Error upgrading parcel:', error);
    return NextResponse.json({ 
      error: 'Failed to upgrade parcel',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
