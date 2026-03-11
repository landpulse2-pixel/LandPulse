import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// POST /api/user/dollars - Calculate and update accumulated dollars
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
        const { searchParams } = new URL(request.url);
        wallet = searchParams.get('wallet') || undefined;
      }
    }

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    console.log('[API] Processing dollars for wallet:', wallet);

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
    const lastUpdate = user.lastDollarsUpdate ? new Date(user.lastDollarsUpdate) : now;
    const secondsElapsed = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

    // If no time elapsed or no parcels, return current state
    if (secondsElapsed <= 0 || user.parcels.length === 0) {
      return NextResponse.json({
        success: true,
        user: {
          dollars: user.dollars,
          totalDollarsEarned: user.totalDollarsEarned,
          lastDollarsUpdate: user.lastDollarsUpdate?.toISOString() || now.toISOString(),
        },
        dollarsEarned: 0,
        secondsElapsed: 0,
        currentDollars: user.totalDollarsEarned,
        dollarsPerSecond: 0,
        boostPercent: 0,
        adBoostActive: false,
      });
    }

    // Calculate base dollars per second from parcels
    const baseDollarsPerSecond = user.parcels.reduce((sum, p) => sum + (p.dollarsPerSecond || 0), 0);

    // Calculate house boost
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

    // Calculate dollars earned while offline
    const effectiveDollarsPerSecond = baseDollarsPerSecond * totalMultiplier;
    const dollarsEarned = effectiveDollarsPerSecond * secondsElapsed;

    console.log('[API] Dollars earned:', dollarsEarned, 'Seconds elapsed:', secondsElapsed);

    // Update user with accumulated dollars
    const updatedUser = await prisma.user.update({
      where: { walletAddress: wallet },
      data: {
        dollars: { increment: dollarsEarned },
        totalDollarsEarned: { increment: dollarsEarned },
        lastDollarsUpdate: now,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        dollars: updatedUser.dollars,
        totalDollarsEarned: updatedUser.totalDollarsEarned,
        lastDollarsUpdate: updatedUser.lastDollarsUpdate.toISOString(),
      },
      dollarsEarned,
      secondsElapsed,
      currentDollars: updatedUser.totalDollarsEarned,
      dollarsPerSecond: effectiveDollarsPerSecond,
      baseDollarsPerSecond,
      houseBoostPercent,
      adBoostActive,
      adBoostMultiplier: adBoostActive ? adBoostMultiplier : null,
      totalMultiplier,
    });
  } catch (error) {
    console.error('Error calculating dollars:', error);
    return NextResponse.json({
      error: 'Failed to calculate dollars',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/user/dollars - Get current dollars status without updating
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

    // Calculate current dollars per second
    const baseDollarsPerSecond = user.parcels.reduce((sum, p) => sum + (p.dollarsPerSecond || 0), 0);
    const houseCount = user.buildings.filter(b => b.type === 'house').length;
    const houseBoostPercent = GAME_CONFIG.getHouseBoost(houseCount);
    const houseMultiplier = 1 + (houseBoostPercent / 100);

    const now = new Date();
    const adBoostActive = user.boostEndTime && new Date(user.boostEndTime) > now;
    const adBoostMultiplier = adBoostActive
      ? GAME_CONFIG.AD_BOOST.getMultiplier(user.parcels.length)
      : 1;

    const totalMultiplier = houseMultiplier * adBoostMultiplier;
    const effectiveDollarsPerSecond = baseDollarsPerSecond * totalMultiplier;

    // Calculate potential offline earnings
    const lastUpdate = user.lastDollarsUpdate ? new Date(user.lastDollarsUpdate) : now;
    const secondsSinceLastUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    const pendingDollars = effectiveDollarsPerSecond * secondsSinceLastUpdate;

    return NextResponse.json({
      currentDollars: user.totalDollarsEarned,
      pulseBucks: user.pulseBucks,
      parcelsCount: user.parcels.length,
      housesCount: houseCount,
      baseDollarsPerSecond,
      effectiveDollarsPerSecond,
      houseBoostPercent,
      adBoostActive,
      adBoostMultiplier: adBoostActive ? adBoostMultiplier : null,
      totalMultiplier,
      lastUpdate: lastUpdate.toISOString(),
      secondsSinceLastUpdate,
      pendingDollars,
    });
  } catch (error) {
    console.error('Error fetching dollars:', error);
    return NextResponse.json({
      error: 'Failed to fetch dollars',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
