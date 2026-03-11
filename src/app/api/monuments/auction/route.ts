import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MONUMENTS, MONUMENT_INCOME_MULTIPLIER, getMonumentById } from '@/lib/monuments';
import { GAME_CONFIG } from '@/lib/game-config';

// GET /api/monuments/auction - Get all monuments status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    // Get all monuments from database
    const dbMonuments = await prisma.monument.findMany();
    
    // Create a map of existing monuments
    const dbMonumentMap = new Map(dbMonuments.map(m => [m.monumentId, m]));

    // Merge with static monument data
    const monuments = MONUMENTS.map(monument => {
      const dbMonument = dbMonumentMap.get(monument.id);
      
      return {
        id: monument.id,
        name: monument.nameFr,
        city: monument.city,
        country: monument.country,
        emoji: monument.emoji,
        rarity: monument.rarity,
        basePricePB: monument.basePricePB,
        description: monument.description,
        incomeMultiplier: MONUMENT_INCOME_MULTIPLIER[monument.rarity],
        
        // Status from database or default
        status: dbMonument?.status || 'locked',
        currentBidPB: dbMonument?.currentBidPB || 0,
        auctionStart: dbMonument?.auctionStart?.toISOString() || null,
        auctionEnd: dbMonument?.auctionEnd?.toISOString() || null,
        winnerId: dbMonument?.winnerId || null,
        soldPricePB: dbMonument?.soldPricePB || 0,
        soldAt: dbMonument?.soldAt?.toISOString() || null,
      };
    });

    // Get user's bids if wallet provided
    let userBids: any[] = [];
    if (wallet) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: wallet },
      });
      
      if (user) {
        const bids = await prisma.monumentBid.findMany({
          where: { userId: user.id },
          include: {
            monument: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        
        userBids = bids.map(b => ({
          monumentId: b.monumentId,
          monumentName: b.monument.name,
          amountPB: b.amountPB,
          isWinning: b.isWinning,
          date: b.createdAt.toISOString(),
        }));
      }
    }

    // Get upcoming auction (next monument to be sold)
    const upcomingMonument = monuments.find(m => m.status === 'upcoming');
    const liveAuction = monuments.find(m => m.status === 'auction_live');

    return NextResponse.json({
      success: true,
      monuments,
      userBids,
      upcomingMonument,
      liveAuction,
      stats: {
        total: monuments.length,
        locked: monuments.filter(m => m.status === 'locked').length,
        upcoming: monuments.filter(m => m.status === 'upcoming').length,
        live: monuments.filter(m => m.status === 'auction_live').length,
        sold: monuments.filter(m => m.status === 'sold').length,
      },
    });
  } catch (error) {
    console.error('Error fetching monuments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monuments' },
      { status: 500 }
    );
  }
}

// POST /api/monuments/auction - Place a bid
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, monumentId, bidAmount } = body;

    if (!wallet || !monumentId || !bidAmount) {
      return NextResponse.json({ 
        error: 'Missing required fields: wallet, monumentId, bidAmount' 
      }, { status: 400 });
    }

    // Validate monument exists
    const monumentData = getMonumentById(monumentId);
    if (!monumentData) {
      return NextResponse.json({ error: 'Monument not found' }, { status: 404 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create monument in database
    let monument = await prisma.monument.findUnique({
      where: { monumentId },
    });

    if (!monument) {
      // Initialize monument in database
      monument = await prisma.monument.create({
        data: {
          monumentId: monumentData.id,
          lat: monumentData.lat,
          lng: monumentData.lng,
          name: monumentData.nameFr,
          city: monumentData.city,
          country: monumentData.country,
          emoji: monumentData.emoji,
          rarity: monumentData.rarity,
          basePricePB: monumentData.basePricePB,
          status: 'locked', // Needs to be set to 'auction_live' by admin
        },
      });
    }

    // Check if auction is live
    if (monument.status !== 'auction_live') {
      return NextResponse.json({ 
        error: 'Enchère non active',
        message: 'Cette enchère n\'est pas encore ouverte.',
      }, { status: 400 });
    }

    // Check if auction has ended
    if (monument.auctionEnd && new Date() > monument.auctionEnd) {
      return NextResponse.json({ 
        error: 'Enchère terminée',
        message: 'Cette enchère est terminée.',
      }, { status: 400 });
    }

    // Validate bid amount
    const minBid = monument.currentBidPB > 0 
      ? monument.currentBidPB + 100 // Minimum increment: 100 PB
      : monument.basePricePB;
    
    if (bidAmount < minBid) {
      return NextResponse.json({ 
        error: 'Enchère trop basse',
        message: `L'enchère minimum est de ${minBid} PB.`,
        minBid,
      }, { status: 400 });
    }

    // Check if user has enough PB
    if (user.pulseBucks < bidAmount) {
      return NextResponse.json({ 
        error: 'PulseBucks insuffisants',
        message: `Vous avez ${user.pulseBucks} PB, besoin de ${bidAmount} PB.`,
      }, { status: 400 });
    }

    // Place the bid (transaction)
    const result = await prisma.$transaction(async (tx) => {
      // Deduct PB from user (hold for bid)
      await tx.user.update({
        where: { id: user.id },
        data: {
          pulseBucks: { decrement: bidAmount },
        },
      });

      // Refund previous bidder if exists
      if (monument!.currentBidderId && monument!.currentBidPB > 0) {
        await tx.user.update({
          where: { id: monument!.currentBidderId },
          data: {
            pulseBucks: { increment: monument!.currentBidPB },
          },
        });

        // Mark previous bid as not winning
        await tx.monumentBid.updateMany({
          where: {
            monumentId: monument!.id,
            isWinning: true,
          },
          data: { isWinning: false },
        });
      }

      // Create bid record
      const bid = await tx.monumentBid.create({
        data: {
          monumentId: monument!.id,
          userId: user.id,
          amountPB: bidAmount,
          isWinning: true,
        },
      });

      // Update monument with new bid
      const updatedMonument = await tx.monument.update({
        where: { id: monument!.id },
        data: {
          currentBidPB: bidAmount,
          currentBidderId: user.id,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'monument_bid',
          amount: bidAmount,
          metadata: JSON.stringify({
            monumentId: monument!.monumentId,
            monumentName: monument!.name,
            bidId: bid.id,
          }),
        },
      });

      return { bid, monument: updatedMonument };
    });

    return NextResponse.json({
      success: true,
      message: `Enchère placée ! ${bidAmount} PB sur ${monumentData.emoji} ${monumentData.nameFr}`,
      bid: {
        id: result.bid.id,
        amountPB: result.bid.amountPB,
        isWinning: result.bid.isWinning,
      },
      monument: {
        id: monumentData.id,
        name: monumentData.nameFr,
        currentBidPB: result.monument.currentBidPB,
      },
    });
  } catch (error) {
    console.error('Error placing bid:', error);
    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 }
    );
  }
}
