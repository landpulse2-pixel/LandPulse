// POST /api/purchase/usdc - Purchase PulseBucks with USDC (testnet)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';
import { processCommission } from '@/lib/commission';
import { verifyUsdcPayment, TREASURY_WALLET } from '@/lib/usdc-payment';
import { usdcToLamports } from '@/lib/usdc-payment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, packageIndex, txHash } = body;

    if (!wallet || packageIndex === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate package
    const packages = GAME_CONFIG.PB_PACKAGES;
    if (packageIndex < 0 || packageIndex >= packages.length) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const selectedPackage = packages[packageIndex];
    const usdcAmount = selectedPackage.price;
    const pbAmount = selectedPackage.total;

    // Find user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify USDC payment
    if (txHash) {
      const verification = await verifyUsdcPayment(txHash, usdcAmount, wallet);
      if (!verification.success) {
        return NextResponse.json({ 
          error: 'Payment verification failed', 
          details: verification.error 
        }, { status: 400 });
      }
    } else {
      // For testing without txHash, accept the payment
      console.log('[Purchase] No txHash provided - accepting for testing');
    }

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
          type: 'buy_pb_usdc',
          amount: pbAmount,
          paymentMethod: 'usdc_testnet',
          paymentAmount: usdcAmount,
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
      paymentMethod: 'usdc_testnet',
      commission: commission.commissionAmount > 0 ? {
        amount: commission.commissionAmount,
        referrerId: commission.referrerId,
      } : null,
    });
  } catch (error) {
    console.error('Error processing USDC purchase:', error);
    return NextResponse.json(
      { error: 'Failed to process purchase', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
