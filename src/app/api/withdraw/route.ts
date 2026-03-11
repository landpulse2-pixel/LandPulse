import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Solana RPC endpoint (use mainnet for production)
const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';

// Helper to check if a date is today
function isToday(date: Date | null): boolean {
  if (!date) return false;
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

// Helper to check if date is this week (Monday-Sunday)
function isThisWeek(date: Date | null): boolean {
  if (!date) return false;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  return date >= startOfWeek;
}

// GET /api/withdraw - Get withdrawal status and SOL price
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get SOL price from database or API
    let solPrice = 150; // Default fallback
    const storedPrice = await prisma.tokenPrice.findUnique({
      where: { token: 'SOL' },
    });

    if (storedPrice && (Date.now() - storedPrice.lastUpdated.getTime()) < 60000) {
      solPrice = storedPrice.priceUsd;
    } else {
      // Fetch SOL price from CoinGecko
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
          { next: { revalidate: 60 } }
        );
        const data = await response.json();
        if (data.solana?.usd) {
          solPrice = data.solana.usd;
          // Update stored price
          await prisma.tokenPrice.upsert({
            where: { token: 'SOL' },
            update: { priceUsd: solPrice, lastUpdated: new Date() },
            create: { token: 'SOL', priceUsd: solPrice },
          });
        }
      } catch (error) {
        console.error('Failed to fetch SOL price:', error);
      }
    }

    // Calculate withdrawal limits
    const withdrawnToday = isToday(user.lastWithdrawalDate) ? user.withdrawnToday : 0;
    const withdrawnThisWeek = isThisWeek(user.lastWithdrawalDate) ? user.withdrawnThisWeek : 0;

    const canWithdraw = user.dollars >= GAME_CONFIG.WITHDRAWAL.minDollars;
    const remainingDaily = GAME_CONFIG.WITHDRAWAL.maxDailyDollars - withdrawnToday;
    const remainingWeekly = GAME_CONFIG.WITHDRAWAL.maxWeeklyDollars - withdrawnThisWeek;

    return NextResponse.json({
      canWithdraw,
      dollars: user.dollars,
      totalDollarsEarned: user.totalDollarsEarned,
      totalWithdrawn: user.totalWithdrawn,
      minWithdrawal: GAME_CONFIG.WITHDRAWAL.minDollars,
      maxDaily: GAME_CONFIG.WITHDRAWAL.maxDailyDollars,
      maxWeekly: GAME_CONFIG.WITHDRAWAL.maxWeeklyDollars,
      withdrawnToday,
      withdrawnThisWeek,
      remainingDaily: Math.max(0, remainingDaily),
      remainingWeekly: Math.max(0, remainingWeekly),
      feePercent: GAME_CONFIG.WITHDRAWAL.feePercent,
      solPrice,
    });
  } catch (error) {
    console.error('Error fetching withdrawal status:', error);
    return NextResponse.json({
      error: 'Failed to fetch withdrawal status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST /api/withdraw - Process withdrawal request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, dollarAmount } = body;

    if (!wallet || !dollarAmount) {
      return NextResponse.json({ error: 'Wallet and amount required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate withdrawal amount
    if (dollarAmount < GAME_CONFIG.WITHDRAWAL.minDollars) {
      return NextResponse.json({
        error: `Minimum withdrawal is $${GAME_CONFIG.WITHDRAWAL.minDollars}`,
      }, { status: 400 });
    }

    if (dollarAmount > user.dollars) {
      return NextResponse.json({
        error: 'Insufficient dollars balance',
        available: user.dollars,
      }, { status: 400 });
    }

    // Check daily/weekly limits
    const withdrawnToday = isToday(user.lastWithdrawalDate) ? user.withdrawnToday : 0;
    const withdrawnThisWeek = isThisWeek(user.lastWithdrawalDate) ? user.withdrawnThisWeek : 0;

    if (withdrawnToday + dollarAmount > GAME_CONFIG.WITHDRAWAL.maxDailyDollars) {
      return NextResponse.json({
        error: `Daily withdrawal limit reached ($${GAME_CONFIG.WITHDRAWAL.maxDailyDollars})`,
        withdrawnToday,
        remaining: GAME_CONFIG.WITHDRAWAL.maxDailyDollars - withdrawnToday,
      }, { status: 400 });
    }

    if (withdrawnThisWeek + dollarAmount > GAME_CONFIG.WITHDRAWAL.maxWeeklyDollars) {
      return NextResponse.json({
        error: `Weekly withdrawal limit reached ($${GAME_CONFIG.WITHDRAWAL.maxWeeklyDollars})`,
        withdrawnThisWeek,
        remaining: GAME_CONFIG.WITHDRAWAL.maxWeeklyDollars - withdrawnThisWeek,
      }, { status: 400 });
    }

    // Get SOL price
    let solPrice = 150;
    const storedPrice = await prisma.tokenPrice.findUnique({
      where: { token: 'SOL' },
    });
    if (storedPrice) {
      solPrice = storedPrice.priceUsd;
    }

    // Calculate SOL amount
    const feeDollars = dollarAmount * (GAME_CONFIG.WITHDRAWAL.feePercent / 100);
    const netDollars = dollarAmount - feeDollars;
    const solAmount = netDollars / solPrice;
    const feeSOL = feeDollars / solPrice;

    // Create withdrawal record
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId: user.id,
        dollarAmount,
        solAmount,
        solPrice,
        feeDollars,
        feeSOL,
        status: 'pending',
      },
    });

    // Update user balance and withdrawal stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        dollars: { decrement: dollarAmount },
        totalWithdrawn: { increment: dollarAmount },
        withdrawnToday: withdrawnToday + dollarAmount,
        withdrawnThisWeek: withdrawnThisWeek + dollarAmount,
        lastWithdrawalDate: new Date(),
      },
    });

    // In production, you would:
    // 1. Create and sign a Solana transaction
    // 2. Send SOL to the user's wallet
    // 3. Update withdrawal status with txHash

    // For now, simulate the transaction
    const simulatedTxHash = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Update withdrawal with simulated tx
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'completed',
        txHash: simulatedTxHash,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        dollarAmount,
        solAmount,
        solPrice,
        feeDollars,
        feeSOL,
        txHash: simulatedTxHash,
        status: 'completed',
      },
      message: `Withdrawal of ${solAmount.toFixed(6)} SOL ($${netDollars.toFixed(2)}) processed!`,
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json({
      error: 'Failed to process withdrawal',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
