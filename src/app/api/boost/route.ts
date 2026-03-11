import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// Force recompile - v24 - 24 videos per day
// Subscription limits for ad boosts
const SUBSCRIPTION_LIMITS = {
  free: {
    maxAds: 24,        // 24 ads per day
    maxBoostHours: 24, // 24 hours max boost
    maxAdsInRow: 4,    // 4 vidéos à la suite
  },
  premium: {
    maxAds: 24,        // 24 ads per day
    maxBoostHours: 24, // 24 hours max boost
    maxAdsInRow: 6,    // 6 vidéos à la suite
  },
  vip: {
    maxAds: 24,        // 24 ads per day
    maxBoostHours: 24, // 24 hours max boost
    maxAdsInRow: 12,   // 12 vidéos à la suite
  },
};

// Helper to check if a date is today
function isToday(date: Date | null): boolean {
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

// Helper to get subscription tier
function getSubscriptionTier(user: { subscription: string; subscriptionEnd: Date | null }): 'free' | 'premium' | 'vip' {
  const tier = user.subscription as 'free' | 'premium' | 'vip';
  
  // Check if subscription is expired
  if (tier !== 'free' && user.subscriptionEnd) {
    if (new Date(user.subscriptionEnd) < new Date()) {
      return 'free'; // Subscription expired
    }
  }
  
  return tier;
}

// POST /api/boost - Activate ad boost for user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet } = body;

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const tier = getSubscriptionTier(user);
    const limits = SUBSCRIPTION_LIMITS[tier];

    // Reset daily ad count if it's a new day
    let adsWatchedToday = user.adsWatchedToday || 0;
    if (!isToday(user.lastAdWatchDate)) {
      adsWatchedToday = 0;
    }

    // Check if user has reached daily limit
    if (adsWatchedToday >= limits.maxAds) {
      return NextResponse.json({
        success: false,
        error: 'Limite atteinte',
        message: `Vous avez atteint votre limite de ${limits.maxAds} pubs pour aujourd'hui. Passez à un abonnement supérieur pour plus !`,
        adsWatchedToday,
        maxAds: limits.maxAds,
        tier,
      }, { status: 400 });
    }

    // Calculate new boost end time with stack
    let currentBoostEnd = user.boostEndTime && new Date(user.boostEndTime) > now 
      ? new Date(user.boostEndTime) 
      : now;

    // Add 1 hour to the boost
    const newBoostEndTime = new Date(currentBoostEnd.getTime() + 60 * 60 * 1000);

    // Check if new boost time exceeds max allowed
    const maxBoostTime = new Date(now.getTime() + limits.maxBoostHours * 60 * 60 * 1000);
    
    if (newBoostEndTime > maxBoostTime) {
      return NextResponse.json({
        success: false,
        error: 'Boost maximum atteint',
        message: `Vous avez atteint le temps de boost maximum de ${limits.maxBoostHours}h. Attendez que votre boost actuel se termine.`,
        currentBoostHours: Math.ceil((currentBoostEnd.getTime() - now.getTime()) / (60 * 60 * 1000)),
        maxBoostHours: limits.maxBoostHours,
        tier,
      }, { status: 400 });
    }

    // Update user with new boost end time and increment counters
    const updatedUser = await prisma.user.update({
      where: { walletAddress: wallet },
      data: {
        boostEndTime: newBoostEndTime,
        totalAdsWatched: { increment: 1 },
        adsWatchedToday: adsWatchedToday + 1,
        lastAdWatchDate: now,
      },
    });

    // Get remaining ads for today
    const remainingAds = limits.maxAds - (adsWatchedToday + 1);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
        pulseBucks: updatedUser.pulseBucks,
        dollars: updatedUser.dollars,
        totalDollarsEarned: updatedUser.totalDollarsEarned,
        lastDailyBonus: updatedUser.lastDailyBonus?.toISOString(),
        totalEarned: updatedUser.totalEarned,
        totalSpent: updatedUser.totalSpent,
        boostEndTime: updatedUser.boostEndTime?.toISOString(),
        totalAdsWatched: updatedUser.totalAdsWatched,
        adsWatchedToday: updatedUser.adsWatchedToday,
        subscription: updatedUser.subscription,
        subscriptionEnd: updatedUser.subscriptionEnd?.toISOString(),
      },
      boostDuration: 60, // 1 hour in minutes
      adsWatchedToday: adsWatchedToday + 1,
      maxAds: limits.maxAds,
      remainingAds,
      tier,
      maxAdsInRow: limits.maxAdsInRow,
      message: `Boost activé ! +1h de boost (${remainingAds} pubs restantes aujourd'hui)`,
    });
  } catch (error) {
    console.error('Error activating boost:', error);
    return NextResponse.json({ 
      error: 'Failed to activate boost',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET /api/boost - Get boost status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Get user with parcels count for boost multiplier
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      include: {
        parcels: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const parcelCount = user.parcels.length;
    const multiplier = GAME_CONFIG.AD_BOOST.getMultiplier(parcelCount);
    const boostTier = GAME_CONFIG.AD_BOOST.getBoostTier(parcelCount);
    const subscriptionTier = getSubscriptionTier(user);
    const limits = SUBSCRIPTION_LIMITS[subscriptionTier];

    const now = new Date();
    const isActive = user.boostEndTime && new Date(user.boostEndTime) > now;
    const remainingMs = isActive
      ? new Date(user.boostEndTime!).getTime() - now.getTime()
      : 0;

    // Reset daily ad count if it's a new day
    let adsWatchedToday = user.adsWatchedToday || 0;
    if (!isToday(user.lastAdWatchDate)) {
      adsWatchedToday = 0;
    }

    return NextResponse.json({
      isActive: !!isActive,
      remainingMs,
      remainingMinutes: Math.floor(remainingMs / 60000),
      remainingHours: Math.floor(remainingMs / (60 * 60 * 1000)),
      multiplier,
      tier: boostTier.tier,
      parcelCount,
      boostDuration: GAME_CONFIG.AD_BOOST.duration,
      totalAdsWatched: user.totalAdsWatched,
      adsWatchedToday,
      maxAds: limits.maxAds,
      remainingAds: limits.maxAds - adsWatchedToday,
      subscription: subscriptionTier,
      maxBoostHours: limits.maxBoostHours,
      maxAdsInRow: limits.maxAdsInRow,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching boost status:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch boost status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
