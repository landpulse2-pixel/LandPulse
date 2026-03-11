// Commission utility for referral system
// Handles 5% lifetime commission on referred users' purchases

import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

/**
 * Process commission when a user makes a purchase
 * Credits 5% of PB purchased to the referrer
 * 
 * @param userId - The user who made the purchase
 * @param pbAmount - Amount of PB purchased
 * @param purchaseType - Type of purchase (pb_pack, subscription, etc.)
 * @returns The commission amount credited, or 0 if no referrer
 */
export async function processCommission(
  userId: string,
  pbAmount: number,
  purchaseType: string
): Promise<{ commissionAmount: number; referrerId: string | null }> {
  try {
    // Get the user to check if they were referred
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true },
    });

    if (!user?.referredBy) {
      return { commissionAmount: 0, referrerId: null };
    }

    // Find the referrer by their referral code
    const referrer = await prisma.user.findUnique({
      where: { referralCode: user.referredBy },
      select: { id: true },
    });

    if (!referrer) {
      console.warn(`Referrer not found for code: ${user.referredBy}`);
      return { commissionAmount: 0, referrerId: null };
    }

    // Calculate commission (5% of PB purchased)
    const commissionPercent = GAME_CONFIG.REFERRAL.commissionPercent;
    const commissionAmount = Math.floor(pbAmount * (commissionPercent / 100));

    if (commissionAmount <= 0) {
      return { commissionAmount: 0, referrerId: referrer.id };
    }

    // Find the referral record
    const referral = await prisma.referral.findFirst({
      where: {
        referrerId: referrer.id,
        referredId: userId,
      },
    });

    // Use transaction to update everything atomically
    await prisma.$transaction(async (tx) => {
      // Credit commission to referrer
      await tx.user.update({
        where: { id: referrer.id },
        data: {
          pulseBucks: { increment: commissionAmount },
          totalEarned: { increment: commissionAmount },
          commissionEarnings: { increment: commissionAmount },
        },
      });

      // Update referral record with total commission earned
      if (referral) {
        await tx.referral.update({
          where: { id: referral.id },
          data: {
            totalCommissionEarned: { increment: commissionAmount },
          },
        });
      }

      // Create transaction record for the commission
      await tx.transaction.create({
        data: {
          userId: referrer.id,
          type: 'referral_commission',
          amount: commissionAmount,
          metadata: JSON.stringify({
            referredUserId: userId,
            purchaseType,
            originalPBAmount: pbAmount,
            commissionPercent,
          }),
        },
      });
    });

    console.log(`Commission processed: ${commissionAmount} PB to referrer ${referrer.id} for ${purchaseType}`);

    return { commissionAmount, referrerId: referrer.id };
  } catch (error) {
    console.error('Error processing commission:', error);
    return { commissionAmount: 0, referrerId: null };
  }
}

/**
 * Get commission stats for a user
 */
export async function getCommissionStats(userId: string): Promise<{
  totalCommissionEarned: number;
  commissionsByReferral: Array<{
    referredWallet: string;
    totalCommission: number;
  }>;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { commissionEarnings: true },
  });

  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      referred: {
        select: { walletAddress: true },
      },
    },
  });

  return {
    totalCommissionEarned: user?.commissionEarnings || 0,
    commissionsByReferral: referrals.map((r) => ({
      referredWallet: r.referred.walletAddress.slice(0, 4) + '...' + r.referred.walletAddress.slice(-4),
      totalCommission: r.totalCommissionEarned,
    })),
  };
}
