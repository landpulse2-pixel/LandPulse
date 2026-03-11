import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';
import { processCommission } from '@/lib/commission';

// POST /api/purchase/pb - Purchase PulseBucks
// This is a simplified version - for production, integrate with Stripe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, packageIndex, paymentMethod, txHash } = body;

    if (!wallet || packageIndex === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate package
    const packages = GAME_CONFIG.PB_PACKAGES;
    if (packageIndex < 0 || packageIndex >= packages.length) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const selectedPackage = packages[packageIndex];
    const pbAmount = selectedPackage.total;

    // Find user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For now, we'll simulate the purchase
    // In production, this would verify the Stripe payment or blockchain transaction

    // Use transaction to credit PB and process commission
    const result = await prisma.$transaction(async (tx) => {
      // Credit PB to user
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          pulseBucks: { increment: pbAmount },
          totalEarned: { increment: pbAmount },
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'buy_pb_stripe',
          amount: pbAmount,
          paymentMethod: paymentMethod || 'stripe',
          paymentAmount: selectedPackage.price,
          txHash: txHash || null,
          metadata: JSON.stringify({
            packageIndex,
            packageName: `${selectedPackage.pb} PB`,
            bonus: selectedPackage.bonus,
          }),
        },
      });

      return { updatedUser, transaction };
    });

    // Process commission for referrer (5% of PB purchased)
    const commission = await processCommission(user.id, pbAmount, 'pb_pack');

    return NextResponse.json({
      success: true,
      message: `Achat réussi ! +${pbAmount} PB`,
      pulseBucks: result.updatedUser.pulseBucks,
      transaction: {
        id: result.transaction.id,
        amount: pbAmount,
        price: selectedPackage.price,
      },
      commission: commission.commissionAmount > 0 ? {
        amount: commission.commissionAmount,
        referrerId: commission.referrerId,
      } : null,
    });
  } catch (error) {
    console.error('Error processing purchase:', error);
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    );
  }
}

// GET /api/purchase/pb - Get available packages
export async function GET() {
  return NextResponse.json({
    success: true,
    packages: GAME_CONFIG.PB_PACKAGES.map((pkg, index) => ({
      index,
      pb: pkg.pb,
      price: pkg.price,
      bonus: pkg.bonus,
      total: pkg.total,
      value: pkg.bonus > 0 ? `+${Math.round((pkg.bonus / pkg.pb) * 100)}% bonus` : 'No bonus',
    })),
    commissionRate: GAME_CONFIG.REFERRAL.commissionPercent,
  });
}
