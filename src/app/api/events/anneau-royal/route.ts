import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/events/anneau-royal - Get leaderboard and event info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const wallet = searchParams.get('wallet');

    // Get active event
    const activeEvent = await prisma.gameEvent.findFirst({
      where: {
        type: 'anneau_royal',
        status: 'active',
        endTime: { gte: new Date() },
      },
      orderBy: { startTime: 'desc' },
    });

    // Get leaderboard TOP 100
    const leaderboard = await prisma.playerEventStats.findMany({
      where: eventId ? { eventId } : { eventId: activeEvent?.id || '' },
      orderBy: [
        { victories: 'desc' },
        { totalScore: 'desc' },
      ],
      take: 100,
    });

    // Get user stats if wallet provided
    let userStats = null;
    let userRank = null;

    if (wallet && activeEvent) {
      const user = await prisma.user.findUnique({
        where: { walletAddress: wallet },
      });

      if (user) {
        userStats = await prisma.playerEventStats.findUnique({
          where: {
            userId_eventId: {
              userId: user.id,
              eventId: activeEvent.id,
            },
          },
        });

        // Calculate rank
        if (userStats) {
          const betterPlayers = await prisma.playerEventStats.count({
            where: {
              eventId: activeEvent.id,
              OR: [
                { victories: { gt: userStats.victories } },
                {
                  victories: userStats.victories,
                  totalScore: { gt: userStats.totalScore },
                },
              ],
            },
          });
          userRank = betterPlayers + 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      event: activeEvent ? {
        id: activeEvent.id,
        name: activeEvent.name,
        startTime: activeEvent.startTime,
        endTime: activeEvent.endTime,
        participants: activeEvent.participants,
        status: activeEvent.status,
      } : null,
      leaderboard: leaderboard.map((stats, index) => ({
        rank: index + 1,
        victories: stats.victories,
        defeats: stats.defeats,
        totalGames: stats.totalGames,
        totalScore: stats.totalScore,
      })),
      userStats: userStats ? {
        victories: userStats.victories,
        defeats: userStats.defeats,
        draws: userStats.draws,
        totalGames: userStats.totalGames,
        totalScore: userStats.totalScore,
        rank: userRank,
      } : null,
    });

  } catch (error) {
    console.error('Error fetching event data:', error);
    return NextResponse.json({ error: 'Failed to fetch event data' }, { status: 500 });
  }
}

// POST /api/events/anneau-royal - Submit game result
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, playerScore, opponentScore, eventId } = body;

    if (!wallet || playerScore === undefined || opponentScore === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine winner
    const isVictory = playerScore > opponentScore;
    const isDraw = playerScore === opponentScore;

    // Get or create event
    let activeEvent = await prisma.gameEvent.findFirst({
      where: {
        type: 'anneau_royal',
        status: 'active',
        endTime: { gte: new Date() },
      },
    });

    if (!activeEvent) {
      // Create a new event for testing
      const now = new Date();
      const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      activeEvent = await prisma.gameEvent.create({
        data: {
          type: 'anneau_royal',
          name: 'Anneau Royal',
          description: 'Tournoi de lancer d\'anneau 1v1',
          startTime: now,
          endTime: endTime,
          status: 'active',
        },
      });
    }

    // Update or create player stats
    const existingStats = await prisma.playerEventStats.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId: activeEvent.id,
        },
      },
    });

    let newVictories = existingStats?.victories || 0;
    let updatedStats;

    if (existingStats) {
      updatedStats = await prisma.playerEventStats.update({
        where: {
          userId_eventId: {
            userId: user.id,
            eventId: activeEvent.id,
          },
        },
        data: {
          victories: { increment: isVictory ? 1 : 0 },
          defeats: { increment: isDraw ? 0 : 1 },
          draws: { increment: isDraw ? 1 : 0 },
          totalGames: { increment: 1 },
          totalScore: { increment: playerScore },
        },
      });
      newVictories = updatedStats.victories;
    } else {
      updatedStats = await prisma.playerEventStats.create({
        data: {
          userId: user.id,
          eventId: activeEvent.id,
          victories: isVictory ? 1 : 0,
          defeats: isDraw ? 0 : 1,
          draws: isDraw ? 1 : 0,
          totalGames: 1,
          totalScore: playerScore,
        },
      });
      newVictories = updatedStats.victories;

      // Increment participants count
      await prisma.gameEvent.update({
        where: { id: activeEvent.id },
        data: { participants: { increment: 1 } },
      });
    }

    // Calculate rewards based on victories milestones
    const victoryMilestones = [
      { victories: 5, reward: 20 },
      { victories: 10, reward: 50 },
      { victories: 20, reward: 120 },
      { victories: 30, reward: 200 },
      { victories: 50, reward: 400 },
    ];

    let rewardPB = 0;
    let milestone = null;

    for (const m of victoryMilestones) {
      if (newVictories === m.victories && isVictory) {
        rewardPB = m.reward;
        milestone = m.victories;
        break;
      }
    }

    // Give reward if milestone reached
    if (rewardPB > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pulseBucks: { increment: rewardPB } },
      });

      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'event_reward',
          amount: rewardPB,
          metadata: JSON.stringify({
            eventId: activeEvent.id,
            milestone: milestone,
            gameType: 'anneau_royal',
          }),
        },
      });
    }

    // Create game session record
    await prisma.gameSession.create({
      data: {
        eventId: activeEvent.id,
        player1Id: user.id,
        player1Score: playerScore,
        player2Score: opponentScore,
        winnerId: isVictory ? user.id : null,
        gameType: 'anneau_royal',
        status: 'completed',
      },
    });

    return NextResponse.json({
      success: true,
      result: {
        isVictory,
        isDraw,
        playerScore,
        opponentScore,
        victories: newVictories,
        rewardPB,
        milestone,
      },
    });

  } catch (error) {
    console.error('Error submitting game result:', error);
    return NextResponse.json({ error: 'Failed to submit result' }, { status: 500 });
  }
}
