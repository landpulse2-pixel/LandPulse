import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// POST /api/user/points - Calculate and update accumulated points
// Called when user loads the app to calculate offline earnings
export async function POST(request: NextRequest) {
  try {
    // Handle both JSON and text/plain (from sendBeacon)
    let wallet: string | undefined;
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      wallet = body.wallet;
    } else {
      // sendBeacon sends as text/plain by default
      const text = await request.text();
      try {
        const body = JSON.parse(text);
        wallet = body.wallet;
      } catch {
        // If parsing fails, try to get wallet from URL params
        const { searchParams } = new URL(request.url);
        wallet = searchParams.get('wallet') || undefined;
      }
    }

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    console.log('[API] Processing points for wallet:', wallet);

    // Get user with parcels and buildings
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        parcels: true,
        buildings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate time elapsed since last update
    const now = new Date();
    const lastUpdate = user.lastPointsUpdate ? new Date(user.lastPointsUpdate) : now;
    const secondsElapsed = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

    // If no time elapsed or no parcels, return current state
    if (secondsElapsed <= 0 || user.parcels.length === 0) {
      return NextResponse.json({
        success: true,
        user: {
          points: user.points,
          totalPointsEarned: user.totalPointsEarned,
          lastPointsUpdate: user.lastPointsUpdate.toISOString(),
        },
        pointsEarned: 0,
        secondsElapsed: 0,
        currentPoints: user.totalPointsEarned,
        pointsPerSecond: 0,
        boostPercent: 0,
        adBoostActive: false,
      });
    }

    // Calculate base points per second from parcels
    const basePointsPerSecond = user.parcels.reduce((sum, p) => sum + p.pointsPerSecond, 0);

    // Calculate house boost (based on total houses owned)
    const houseCount = user.buildings.filter(b => b.type === 'house').length;
    const houseBoostPercent = GAME_CONFIG.getHouseBoost(houseCount);

    // Check if ad boost is active
    const adBoostActive = user.boostEndTime && new Date(user.boostEndTime) > now;
    const adBoostMultiplier = adBoostActive 
      ? GAME_CONFIG.AD_BOOST.getMultiplier(user.parcels.length) 
      : 1;

    // Calculate total multiplier
    const houseMultiplier = 1 + (houseBoostPercent / 100);
    const totalMultiplier = houseMultiplier * adBoostMultiplier;

    // Calculate points earned while offline
    const effectivePointsPerSecond = basePointsPerSecond * totalMultiplier;
    const pointsEarned = effectivePointsPerSecond * secondsElapsed;

    console.log('[API] Points earned:', pointsEarned, 'Seconds elapsed:', secondsElapsed);

    // Update user with accumulated points
    const updatedUser = await prisma.user.update({
      where: { walletAddress: wallet },
      data: {
        totalPointsEarned: { increment: pointsEarned },
        lastPointsUpdate: now,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        points: updatedUser.points,
        totalPointsEarned: updatedUser.totalPointsEarned,
        lastPointsUpdate: updatedUser.lastPointsUpdate.toISOString(),
      },
      pointsEarned,
      secondsElapsed,
      currentPoints: updatedUser.totalPointsEarned,
      pointsPerSecond: effectivePointsPerSecond,
      basePointsPerSecond,
      houseBoostPercent,
      adBoostActive,
      adBoostMultiplier: adBoostActive ? adBoostMultiplier : null,
      totalMultiplier,
    });
  } catch (error) {
    console.error('Error calculating points:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate points',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/user/points - Get current points status without updating
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
        parcels: true,
        buildings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate current points per second
    const basePointsPerSecond = user.parcels.reduce((sum, p) => sum + p.pointsPerSecond, 0);
    const houseCount = user.buildings.filter(b => b.type === 'house').length;
    const houseBoostPercent = GAME_CONFIG.getHouseBoost(houseCount);
    const houseMultiplier = 1 + (houseBoostPercent / 100);

    const now = new Date();
    const adBoostActive = user.boostEndTime && new Date(user.boostEndTime) > now;
    const adBoostMultiplier = adBoostActive 
      ? GAME_CONFIG.AD_BOOST.getMultiplier(user.parcels.length) 
      : 1;

    const totalMultiplier = houseMultiplier * adBoostMultiplier;
    const effectivePointsPerSecond = basePointsPerSecond * totalMultiplier;

    // Calculate potential offline earnings
    const lastUpdate = user.lastPointsUpdate ? new Date(user.lastPointsUpdate) : now;
    const secondsSinceLastUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    const pendingPoints = effectivePointsPerSecond * secondsSinceLastUpdate;

    return NextResponse.json({
      currentPoints: user.totalPointsEarned,
      pulseBucks: user.pulseBucks,
      parcelsCount: user.parcels.length,
      housesCount: houseCount,
      basePointsPerSecond,
      effectivePointsPerSecond,
      houseBoostPercent,
      adBoostActive,
      adBoostMultiplier: adBoostActive ? adBoostMultiplier : null,
      totalMultiplier,
      lastUpdate: lastUpdate.toISOString(),
      secondsSinceLastUpdate,
      pendingPoints,
    });
  } catch (error) {
    console.error('Error fetching points:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch points',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
