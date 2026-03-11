import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// POST /api/user/daily-bonus - Claim daily bonus
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet } = body;

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check cooldown
    if (user.lastDailyBonus) {
      const lastClaim = new Date(user.lastDailyBonus).getTime();
      const now = Date.now();
      const cooldown = GAME_CONFIG.DAILY_BONUS_COOLDOWN;
      
      if (now - lastClaim < cooldown) {
        const remaining = cooldown - (now - lastClaim);
        return NextResponse.json({ 
          error: 'Bonus déjà réclamé',
          remainingMs: remaining,
        }, { status: 400 });
      }
    }

    // Grant bonus
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          pulseBucks: { increment: GAME_CONFIG.DAILY_BONUS },
          lastDailyBonus: new Date(),
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'daily_bonus',
          amount: GAME_CONFIG.DAILY_BONUS,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      bonus: GAME_CONFIG.DAILY_BONUS,
      newBalance: result.pulseBucks,
    });
  } catch (error) {
    console.error('Error claiming daily bonus:', error);
    return NextResponse.json({ error: 'Failed to claim daily bonus' }, { status: 500 });
  }
}
