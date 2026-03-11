import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MONUMENTS, getMonumentById } from '@/lib/monuments';

// POST /api/monuments/admin - Admin actions for monuments
// Actions: start_auction, end_auction, initialize_all
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, monumentId, auctionDurationHours } = body;

    // TODO: Add proper admin authentication in production
    // For now, this is a simple implementation

    switch (action) {
      case 'initialize_all': {
        // Initialize all monuments in database
        let created = 0;
        let existing = 0;

        for (const monument of MONUMENTS) {
          const existingMonument = await prisma.monument.findUnique({
            where: { monumentId: monument.id },
          });

          if (!existingMonument) {
            await prisma.monument.create({
              data: {
                monumentId: monument.id,
                lat: monument.lat,
                lng: monument.lng,
                name: monument.nameFr,
                city: monument.city,
                country: monument.country,
                emoji: monument.emoji,
                rarity: monument.rarity,
                basePricePB: monument.basePricePB,
                status: 'locked',
              },
            });
            created++;
          } else {
            existing++;
          }
        }

        return NextResponse.json({
          success: true,
          message: `Initialisé: ${created} créés, ${existing} existants`,
          created,
          existing,
        });
      }

      case 'start_auction': {
        if (!monumentId) {
          return NextResponse.json({ error: 'monumentId required' }, { status: 400 });
        }

        const monumentData = getMonumentById(monumentId);
        if (!monumentData) {
          return NextResponse.json({ error: 'Monument not found' }, { status: 404 });
        }

        // Get or create monument
        let monument = await prisma.monument.findUnique({
          where: { monumentId },
        });

        if (!monument) {
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
              status: 'auction_live',
              auctionStart: new Date(),
              auctionEnd: new Date(Date.now() + (auctionDurationHours || 24) * 60 * 60 * 1000),
              currentBidPB: monumentData.basePricePB,
            },
          });
        } else {
          // Update existing monument
          monument = await prisma.monument.update({
            where: { monumentId },
            data: {
              status: 'auction_live',
              auctionStart: new Date(),
              auctionEnd: new Date(Date.now() + (auctionDurationHours || 24) * 60 * 60 * 1000),
              currentBidPB: monumentData.basePricePB,
            },
          });
        }

        return NextResponse.json({
          success: true,
          message: `Enchère démarrée pour ${monumentData.emoji} ${monumentData.nameFr}`,
          monument: {
            id: monument.monumentId,
            name: monument.name,
            status: monument.status,
            auctionStart: monument.auctionStart?.toISOString(),
            auctionEnd: monument.auctionEnd?.toISOString(),
          },
        });
      }

      case 'end_auction': {
        if (!monumentId) {
          return NextResponse.json({ error: 'monumentId required' }, { status: 400 });
        }

        const monument = await prisma.monument.findUnique({
          where: { monumentId },
        });

        if (!monument) {
          return NextResponse.json({ error: 'Monument not found' }, { status: 404 });
        }

        if (monument.status !== 'auction_live') {
          return NextResponse.json({ error: 'Auction not live' }, { status: 400 });
        }

        // Find winner
        if (!monument.currentBidderId) {
          // No bids - mark as sold for base price to treasury or keep locked
          const updated = await prisma.monument.update({
            where: { monumentId },
            data: {
              status: 'locked', // Reset to locked
              auctionStart: null,
              auctionEnd: null,
              currentBidPB: 0,
              currentBidderId: null,
            },
          });

          return NextResponse.json({
            success: true,
            message: 'Enchère terminée sans gagnant - remise à zéro',
          });
        }

        // Get winner
        const winner = await prisma.user.findUnique({
          where: { id: monument.currentBidderId },
        });

        if (!winner) {
          return NextResponse.json({ error: 'Winner not found' }, { status: 500 });
        }

        // Create parcel for winner and update monument
        const monumentData = getMonumentById(monumentId);
        const incomeMultiplier = monumentData ? 
          (monumentData.rarity === 'mythic' ? 10 : 5) : 5;

        const baseDollarsPerSecond = 0.000000001; // Base dollars per second
        const dollarsPerSecond = baseDollarsPerSecond * incomeMultiplier;

        const result = await prisma.$transaction(async (tx) => {
          // Create parcel for winner
          const parcel = await tx.parcel.create({
            data: {
              lat: monument.lat,
              lng: monument.lng,
              level: monument.rarity === 'mythic' ? 'mythic' : 'legendary',
              dollarsPerSecond,
              ownerId: winner.id,
            },
          });

          // Update monument as sold
          const updatedMonument = await tx.monument.update({
            where: { monumentId },
            data: {
              status: 'sold',
              winnerId: winner.id,
              soldPricePB: monument.currentBidPB,
              soldAt: new Date(),
            },
          });

          // Create transaction record
          await tx.transaction.create({
            data: {
              userId: winner.id,
              type: 'monument_won',
              amount: monument.currentBidPB,
              metadata: JSON.stringify({
                monumentId: monument.monumentId,
                monumentName: monument.name,
                parcelId: parcel.id,
              }),
            },
          });

          return { parcel, monument: updatedMonument };
        });

        return NextResponse.json({
          success: true,
          message: `🏆 ${monument.emoji} ${monument.name} vendu à ${winner.walletAddress.slice(0, 8)}... pour ${monument.currentBidPB} PB !`,
          winner: {
            wallet: winner.walletAddress,
            price: monument.currentBidPB,
          },
          parcel: {
            id: result.parcel.id,
            dollarsPerSecond: result.parcel.dollarsPerSecond,
          },
        });
      }

      case 'set_upcoming': {
        if (!monumentId) {
          return NextResponse.json({ error: 'monumentId required' }, { status: 400 });
        }

        const monument = await prisma.monument.findUnique({
          where: { monumentId },
        });

        if (!monument) {
          return NextResponse.json({ error: 'Monument not found' }, { status: 404 });
        }

        const updated = await prisma.monument.update({
          where: { monumentId },
          data: { status: 'upcoming' },
        });

        return NextResponse.json({
          success: true,
          message: `${monument.emoji} ${monument.name} marqué comme "à venir"`,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in monument admin:', error);
    return NextResponse.json(
      { error: 'Failed to execute admin action' },
      { status: 500 }
    );
  }
}
