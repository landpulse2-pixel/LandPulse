import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/buildings/collect - Collect accumulated dollars from all parcels
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet } = body;

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Get user with parcels
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        parcels: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate total dollars to collect
    const now = Date.now();
    let totalDollars = 0;

    // Calculate dollars from all parcels
    for (const parcel of user.parcels) {
      // Calculate dollars since last collection (or purchase)
      const purchaseTime = parcel.purchasedAt.getTime();
      const elapsedTime = (now - purchaseTime) / 1000; // in seconds
      const dollars = parcel.dollarsPerSecond * elapsedTime;
      totalDollars += dollars;
    }

    // Apply boost if active
    let multiplier = 1;
    if (user.boostEndTime && new Date(user.boostEndTime) > new Date()) {
      multiplier = 2;
      totalDollars *= multiplier;
    }

    if (totalDollars <= 0) {
      return NextResponse.json({ 
        collected: 0, 
        message: 'Aucun dollar à collecter' 
      });
    }

    // Update user dollars and reset collection time
    const result = await prisma.$transaction(async (tx) => {
      // Update user dollars
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          dollars: { increment: totalDollars },
          totalDollarsEarned: { increment: totalDollars },
        },
      });

      // Reset parcel purchase times (collection time)
      await tx.parcel.updateMany({
        where: { ownerId: user.id },
        data: { purchasedAt: new Date() },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'collect_dollars',
          amount: totalDollars,
          metadata: JSON.stringify({
            multiplier,
            parcelCount: user.parcels.length,
          }),
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      collected: totalDollars,
      multiplier,
      newTotal: result.dollars,
    });
  } catch (error) {
    console.error('Error collecting dollars:', error);
    return NextResponse.json({ error: 'Failed to collect dollars' }, { status: 500 });
  }
}
