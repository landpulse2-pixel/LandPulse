import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// Generate a random referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < GAME_CONFIG.REFERRAL.codeLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Ensure unique referral code
async function getUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let attempts = 0;
  
  while (attempts < 10) {
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
    });
    
    if (!existing) return code;
    
    code = generateReferralCode();
    attempts++;
  }
  
  // Fallback: use wallet timestamp
  return code + Date.now().toString(36).slice(-4);
}

// GET /api/user - Get user by wallet address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    console.log('[API] Fetching user with wallet:', wallet);
    
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      console.log('[API] User not found for wallet:', wallet);
      return NextResponse.json({ user: null });
    }

    console.log('[API] User found:', user.walletAddress);

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        avatarUrl: user.avatarUrl,
        pulseBucks: user.pulseBucks,
        dollars: user.dollars,
        totalDollarsEarned: user.totalDollarsEarned,
        lastDailyBonus: user.lastDailyBonus?.toISOString(),
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        boostEndTime: user.boostEndTime?.toISOString(),
        lastDollarsUpdate: user.lastDollarsUpdate?.toISOString(),
        totalAdsWatched: user.totalAdsWatched,
        adsWatchedToday: user.adsWatchedToday,
        subscription: user.subscription,
        subscriptionEnd: user.subscriptionEnd?.toISOString(),
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        referralCount: user.referralCount,
        referralEarnings: user.referralEarnings,
        campaignCompleted: user.campaignCompleted,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching user:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/user - Create or get user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, referralCode } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      // Generate unique referral code for new user
      const userReferralCode = await getUniqueReferralCode();
      
      // Create new user with initial balance
      user = await prisma.user.create({
        data: {
          walletAddress,
          pulseBucks: GAME_CONFIG.INITIAL_PULSE_BUCKS,
          dollars: GAME_CONFIG.INITIAL_DOLLARS,
          referralCode: userReferralCode,
        },
      });

      // If a referral code was provided, process it
      if (referralCode && referralCode.trim()) {
        // Find the referrer
        const referrer = await prisma.user.findUnique({
          where: { referralCode: referralCode.trim().toUpperCase() },
        });

        if (referrer && referrer.id !== user.id) {
          // Check if referrer has room for more referrals
          if (referrer.referralCount < GAME_CONFIG.REFERRAL.maxReferrals) {
            const rewardPB = GAME_CONFIG.REFERRAL.rewardPB;

            // Process referral in transaction
            await prisma.$transaction(async (tx) => {
              // Create referral record
              await tx.referral.create({
                data: {
                  referrerId: referrer.id,
                  referredId: user.id,
                  codeUsed: referralCode.trim().toUpperCase(),
                  referrerReward: rewardPB,
                  referredReward: rewardPB,
                },
              });

              // Give PB to new user
              await tx.user.update({
                where: { id: user.id },
                data: {
                  pulseBucks: { increment: rewardPB },
                  totalEarned: { increment: rewardPB },
                  referredBy: referralCode.trim().toUpperCase(),
                },
              });

              // Give PB to referrer
              await tx.user.update({
                where: { id: referrer.id },
                data: {
                  pulseBucks: { increment: rewardPB },
                  totalEarned: { increment: rewardPB },
                  referralCount: { increment: 1 },
                  referralEarnings: { increment: rewardPB },
                },
              });

              // Create transaction records
              await tx.transaction.createMany({
                data: [
                  {
                    userId: user.id,
                    type: 'referral_bonus',
                    amount: rewardPB,
                    metadata: JSON.stringify({ referrerWallet: referrer.walletAddress }),
                  },
                  {
                    userId: referrer.id,
                    type: 'referral_bonus',
                    amount: rewardPB,
                    metadata: JSON.stringify({ referredWallet: walletAddress }),
                  },
                ],
              });
            });

            // Refresh user data after referral
            user = await prisma.user.findUnique({
              where: { walletAddress },
            })!;
          }
        }
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        avatarUrl: user.avatarUrl,
        pulseBucks: user.pulseBucks,
        dollars: user.dollars,
        totalDollarsEarned: user.totalDollarsEarned,
        lastDailyBonus: user.lastDailyBonus?.toISOString(),
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        boostEndTime: user.boostEndTime?.toISOString(),
        lastDollarsUpdate: user.lastDollarsUpdate?.toISOString(),
        totalAdsWatched: user.totalAdsWatched,
        adsWatchedToday: user.adsWatchedToday,
        subscription: user.subscription,
        subscriptionEnd: user.subscriptionEnd?.toISOString(),
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        referralCount: user.referralCount,
        referralEarnings: user.referralEarnings,
        campaignCompleted: user.campaignCompleted,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
