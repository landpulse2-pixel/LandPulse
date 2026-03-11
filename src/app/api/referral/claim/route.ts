import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG, getDollarsPerSecond } from '@/lib/game-config';

// POST /api/referral/claim - Claim the legendary parcel reward
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet } = body;

    console.log('Claim request for wallet:', wallet);

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      select: {
        id: true,
        walletAddress: true,
        campaignCompleted: true,
        campaignRewardClaimed: true,
        referralCount: true,
      },
    });

    console.log('User found:', user ? { id: user.id, referralCount: user.referralCount, campaignCompleted: user.campaignCompleted, campaignRewardClaimed: user.campaignRewardClaimed } : null);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Auto-fix: if user has 5+ referrals but campaignCompleted is false, fix it
    if (!user.campaignCompleted && user.referralCount >= 5) {
      console.log('Auto-fixing campaignCompleted for user with', user.referralCount, 'referrals');
      await prisma.user.update({
        where: { id: user.id },
        data: { campaignCompleted: true },
      });
      user.campaignCompleted = true;
    }

    // Check if user has completed the campaign
    if (!user.campaignCompleted) {
      return NextResponse.json({
        error: 'Not eligible',
        message: `Vous avez ${user.referralCount}/5 filleuls. Il vous en manque ${5 - user.referralCount}.`,
      }, { status: 400 });
    }

    // Check if reward already claimed
    if (user.campaignRewardClaimed) {
      return NextResponse.json({
        error: 'Already claimed',
        message: 'Vous avez déjà réclamé votre récompense.',
      }, { status: 400 });
    }

    // Get or create campaign stats
    let campaignStats = await prisma.campaignStats.findFirst();
    
    if (!campaignStats) {
      campaignStats = await prisma.campaignStats.create({
        data: { completedCount: 0 },
      });
      console.log('Created campaign stats');
    }

    console.log('Campaign stats:', { completedCount: campaignStats.completedCount, maxWinners: GAME_CONFIG.REFERRAL.campaign.maxWinners });

    // Check if still spots available
    if (campaignStats.completedCount >= GAME_CONFIG.REFERRAL.campaign.maxWinners) {
      return NextResponse.json({
        error: 'Campaign ended',
        message: 'Désolé, les 100 places ont déjà été attribuées.',
      }, { status: 400 });
    }

    // Generate random coordinates for the legendary parcel
    // Place it somewhere interesting on the map
    const famousLocations = [
      { lat: 40.7128, lng: -74.0060, name: 'New York' },
      { lat: 51.5074, lng: -0.1278, name: 'London' },
      { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
      { lat: 48.8566, lng: 2.3522, name: 'Paris' },
      { lat: -33.8688, lng: 151.2093, name: 'Sydney' },
      { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
      { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
      { lat: -22.9068, lng: -43.1729, name: 'Rio' },
      { lat: 55.7558, lng: 37.6173, name: 'Moscow' },
      { lat: 39.9042, lng: 116.4074, name: 'Beijing' },
    ];

    const randomLocation = famousLocations[Math.floor(Math.random() * famousLocations.length)];
    
    // Add small random offset to avoid exact same location
    const latOffset = (Math.random() - 0.5) * 0.01;
    const lngOffset = (Math.random() - 0.5) * 0.01;
    
    const parcelLat = randomLocation.lat + latOffset;
    const parcelLng = randomLocation.lng + lngOffset;

    // Use transaction to create parcel and update user
    const result = await prisma.$transaction(async (tx) => {
      // Create the legendary parcel
      const parcel = await tx.parcel.create({
        data: {
          lat: parcelLat,
          lng: parcelLng,
          level: 'legendary',
          dollarsPerSecond: getDollarsPerSecond('legendary'),
          ownerId: user.id,
        },
      });

      // Mark reward as claimed
      await tx.user.update({
        where: { id: user.id },
        data: { campaignRewardClaimed: true },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'campaign_reward',
          amount: 0,
          metadata: JSON.stringify({
            parcelId: parcel.id,
            rarity: 'legendary',
            location: randomLocation.name,
            campaign: 'Top 100 Ambassadeurs',
          }),
        },
      });

      return parcel;
    });

    return NextResponse.json({
      success: true,
      message: 'Félicitations ! Vous avez reçu une parcelle Légendaire !',
      parcel: {
        id: result.id,
        lat: result.lat,
        lng: result.lng,
        level: result.level,
        location: randomLocation.name,
      },
    });
  } catch (error) {
    console.error('Error claiming campaign reward:', error);
    return NextResponse.json(
      { error: 'Failed to claim reward' },
      { status: 500 }
    );
  }
}
