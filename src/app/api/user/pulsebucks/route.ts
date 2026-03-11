import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// POST /api/user/pulsebucks - Add free PB from video
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, amount, reason } = body;

    if (!wallet || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify amount matches free video reward
    if (reason === 'free_video' && amount !== GAME_CONFIG.FREE_PB_VIDEO.reward) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user's PulseBucks
    const updatedUser = await prisma.user.update({
      where: { walletAddress: wallet },
      data: {
        pulseBucks: { increment: amount },
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'free_pb_video',
        amount: amount,
        metadata: JSON.stringify({ reason, timestamp: Date.now() }),
      },
    });

    return NextResponse.json({
      success: true,
      pulseBucks: updatedUser.pulseBucks,
      added: amount,
    });
  } catch (error) {
    console.error('Error adding PulseBucks:', error);
    return NextResponse.json({
      error: 'Failed to add PulseBucks',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
