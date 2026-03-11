import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// Generate a random referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like I, O, 0, 1
  let code = '';
  for (let i = 0; i < GAME_CONFIG.REFERRAL.codeLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/referral - Get referral stats for a user
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
        referralsAsReferrer: {
          include: {
            referred: {
              select: {
                walletAddress: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate referral code if not exists
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode();
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    // Get campaign stats
    const campaignStats = await prisma.campaignStats.findFirst();
    const completedCount = campaignStats?.completedCount || 0;
    const spotsRemaining = Math.max(0, GAME_CONFIG.REFERRAL.campaign.maxWinners - completedCount);

    // Check if user is eligible for campaign reward
    const campaignProgress = user.referralCount;
    const campaignComplete = user.campaignCompleted;

    // Format referred users for display (anonymized) with commission info
    const referredUsers = user.referralsAsReferrer.map(ref => ({
      wallet: ref.referred.walletAddress.slice(0, 4) + '...' + ref.referred.walletAddress.slice(-4),
      date: ref.createdAt.toISOString(),
      commission: ref.totalCommissionEarned || 0,
    }));

    // Calculate total commission earnings
    const totalCommission = user.referralsAsReferrer.reduce(
      (sum, ref) => sum + (ref.totalCommissionEarned || 0),
      0
    );

    return NextResponse.json({
      success: true,
      referral: {
        code: referralCode,
        link: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://land-pulse.vercel.app'}?ref=${referralCode}`,
        stats: {
          count: user.referralCount,
          max: GAME_CONFIG.REFERRAL.maxReferrals,
          remaining: GAME_CONFIG.REFERRAL.maxReferrals - user.referralCount,
          earnings: user.referralEarnings,
          commissionEarnings: user.commissionEarnings || totalCommission,
          totalEarnings: user.referralEarnings + (user.commissionEarnings || totalCommission),
        },
        referredUsers,
        campaign: {
          name: GAME_CONFIG.REFERRAL.campaign.name,
          progress: campaignProgress,
          required: GAME_CONFIG.REFERRAL.campaign.referralsRequired,
          completed: campaignComplete,
          rewardClaimed: user.campaignRewardClaimed,
          spotsRemaining,
          canWin: spotsRemaining > 0 && !campaignComplete,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral stats' },
      { status: 500 }
    );
  }
}

// POST /api/referral - Use a referral code (for new users)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, code } = body;

    if (!wallet || !code) {
      return NextResponse.json({ error: 'Wallet and code required' }, { status: 400 });
    }

    // Find the user trying to use the code
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has already been referred
    if (user.referredBy) {
      return NextResponse.json({
        error: 'Already referred',
        message: 'Vous avez déjà utilisé un code de parrainage.',
      }, { status: 400 });
    }

    // Find the referrer by their code
    const referrer = await prisma.user.findUnique({
      where: { referralCode: code },
    });

    if (!referrer) {
      return NextResponse.json({
        error: 'Invalid code',
        message: 'Ce code de parrainage n\'existe pas.',
      }, { status: 400 });
    }

    // Can't refer yourself
    if (referrer.id === user.id) {
      return NextResponse.json({
        error: 'Self referral',
        message: 'Vous ne pouvez pas utiliser votre propre code.',
      }, { status: 400 });
    }

    // Check if referrer has reached max referrals
    if (referrer.referralCount >= GAME_CONFIG.REFERRAL.maxReferrals) {
      return NextResponse.json({
        error: 'Limit reached',
        message: 'Ce parrain a atteint sa limite de filleuls.',
      }, { status: 400 });
    }

    const rewardPB = GAME_CONFIG.REFERRAL.rewardPB;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create referral record
      const referral = await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: user.id,
          codeUsed: code,
          referrerReward: rewardPB,
          referredReward: rewardPB,
        },
      });

      // Update referred user (give PB and mark as referred)
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          pulseBucks: { increment: rewardPB },
          totalEarned: { increment: rewardPB },
          referredBy: code,
        },
      });

      // Update referrer (give PB and increment count)
      const updatedReferrer = await tx.user.update({
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
            metadata: JSON.stringify({ referredWallet: user.walletAddress }),
          },
        ],
      });

      // Check if referrer reached campaign goal (5 referrals)
      const newReferralCount = updatedReferrer.referralCount;
      let campaignCompleted = false;

      if (newReferralCount >= GAME_CONFIG.REFERRAL.campaign.referralsRequired && !updatedReferrer.campaignCompleted) {
        // Get or create campaign stats
        let campaignStats = await tx.campaignStats.findFirst();
        
        if (!campaignStats) {
          campaignStats = await tx.campaignStats.create({
            data: { completedCount: 0 },
          });
        }

        // Check if still spots available
        if (campaignStats.completedCount < GAME_CONFIG.REFERRAL.campaign.maxWinners) {
          // Mark campaign as completed for this user
          await tx.user.update({
            where: { id: referrer.id },
            data: { campaignCompleted: true },
          });

          // Increment completed count
          await tx.campaignStats.update({
            where: { id: campaignStats.id },
            data: { completedCount: { increment: 1 } },
          });

          campaignCompleted = true;
        }
      }

      return { referral, updatedUser, updatedReferrer, campaignCompleted };
    });

    return NextResponse.json({
      success: true,
      message: `Code de parrainage utilisé ! +${rewardPB} PB`,
      user: {
        pulseBucks: result.updatedUser.pulseBucks,
        referredBy: result.updatedUser.referredBy,
      },
      campaignCompleted: result.campaignCompleted,
    });
  } catch (error) {
    console.error('Error processing referral:', error);
    return NextResponse.json(
      { error: 'Failed to process referral' },
      { status: 500 }
    );
  }
}
