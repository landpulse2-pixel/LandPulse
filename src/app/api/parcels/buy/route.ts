import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG, getRandomRarity, calculateParcelPrice, getGridCellCenter, getDollarsPerSecond } from '@/lib/game-config';
import { isMonument } from '@/lib/monuments';

// POST /api/parcels/buy - Buy a new parcel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, lat, lng, price } = body;

    if (!wallet || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if location is a protected monument
    const monument = isMonument(lat, lng);
    if (monument) {
      return NextResponse.json({ 
        error: 'Monument protégé',
        message: `${monument.emoji} ${monument.nameFr} est un monument historique qui sera vendu aux enchères !`,
        monument: {
          id: monument.id,
          name: monument.nameFr,
          city: monument.city,
          rarity: monument.rarity,
        }
      }, { status: 403 });
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: wallet }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: wallet,
          pulseBucks: GAME_CONFIG.INITIAL_PULSE_BUCKS,
          dollars: GAME_CONFIG.INITIAL_DOLLARS,
        }
      });
    }

    // Calculate actual price
    const actualPrice = calculateParcelPrice(lat, lng);

    // Check if user has enough PulseBucks
    if (user.pulseBucks < actualPrice) {
      return NextResponse.json({ 
        error: `PulseBucks insuffisants. Vous avez ${user.pulseBucks} PB, besoin de ${actualPrice} PB` 
      }, { status: 400 });
    }

    // Calculate grid cell center (same as frontend)
    const { gridLat, gridLng } = getGridCellCenter(lat, lng);
    
    // Debug log
    console.log('BUY PARCEL - Debug:', {
      clickCoords: { lat, lng },
      gridCoords: { gridLat, gridLng },
      gridSize: GAME_CONFIG.MAP.parcelSizeDegrees,
    });

    // Check if parcel already exists at this exact location
    const existingParcel = await prisma.parcel.findFirst({
      where: {
        lat: gridLat,
        lng: gridLng,
      }
    });

    if (existingParcel) {
      return NextResponse.json({ error: 'Cette parcelle est déjà possédée' }, { status: 400 });
    }

    // Determine rarity (random lottery)
    const rarity = getRandomRarity();
    const rarityConfig = GAME_CONFIG.RARITY_LEVELS[rarity];

    // Calculate dollars per second based on rarity
    const dollarsPerSecond = getDollarsPerSecond(rarity);

    // Create parcel and update user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create parcel
      const parcel = await tx.parcel.create({
        data: {
          lat: gridLat,
          lng: gridLng,
          level: rarity,
          dollarsPerSecond,
          ownerId: user!.id,
          improvementLevel: 0,
        }
      });

      // Deduct PulseBucks
      await tx.user.update({
        where: { id: user!.id },
        data: {
          pulseBucks: { decrement: actualPrice },
          totalSpent: { increment: actualPrice },
        }
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user!.id,
          type: 'purchase_parcel',
          amount: actualPrice,
          metadata: JSON.stringify({
            parcelId: parcel.id,
            lat: gridLat,
            lng: gridLng,
            rarity,
          }),
        }
      });

      return parcel;
    });

    return NextResponse.json({
      success: true,
      parcel: {
        id: result.id,
        lat: result.lat,
        lng: result.lng,
        level: result.level,
        dollarsPerSecond: result.dollarsPerSecond,
        price: actualPrice,
      }
    });
  } catch (error) {
    console.error('Error buying parcel:', error);
    return NextResponse.json({ error: 'Failed to buy parcel' }, { status: 500 });
  }
}
