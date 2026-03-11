import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// GET /api/events - Get active events
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.nextUrl.searchParams.get('wallet');
    
    const now = new Date();
    
    // Get active events
    const events = await prisma.event.findMany({
      where: {
        active: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        participations: walletAddress ? {
          where: {
            user: { walletAddress },
          },
        } : false,
      },
    });
    
    // If no events exist, create some sample events
    if (events.length === 0) {
      const sampleEvents = await createSampleEvents();
      return NextResponse.json({ events: sampleEvents });
    }
    
    // Add participation status for each event
    const eventsWithStatus = events.map(event => ({
      ...event,
      hasParticipated: event.participations?.length > 0,
      participations: undefined, // Don't expose participations
    }));
    
    return NextResponse.json({ events: eventsWithStatus });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Participate in an event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, eventId, score } = body;
    
    if (!walletAddress || !eventId) {
      return NextResponse.json(
        { error: 'Wallet address and event ID required' },
        { status: 400 }
      );
    }
    
    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    
    if (!event || !event.active) {
      return NextResponse.json(
        { error: 'Event not found or inactive' },
        { status: 400 }
      );
    }
    
    // Check if already participated
    const existingParticipation = await prisma.eventParticipation.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId: event.id,
        },
      },
    });
    
    if (existingParticipation) {
      return NextResponse.json(
        { error: 'Already participated in this event' },
        { status: 400 }
      );
    }
    
    // Calculate reward based on score
    const finalScore = score ?? Math.floor(Math.random() * 100);
    const rewardMultiplier = finalScore / 100;
    const reward = Math.floor(event.reward * rewardMultiplier);
    
    // Create participation and update user balance
    const [participation, updatedUser] = await prisma.$transaction([
      prisma.eventParticipation.create({
        data: {
          userId: user.id,
          eventId: event.id,
          score: finalScore,
          reward,
          completed: true,
        },
      }),
      prisma.user.update({
        where: { walletAddress },
        data: {
          pulseBucks: user.pulseBucks + reward,
          totalEarned: user.totalEarned + reward,
        },
      }),
    ]);
    
    return NextResponse.json({ 
      success: true,
      score: finalScore,
      reward,
      newBalance: updatedUser.pulseBucks,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error participating in event:', error);
    return NextResponse.json(
      { error: 'Failed to participate in event' },
      { status: 500 }
    );
  }
}

// Helper function to create sample events
async function createSampleEvents() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const eventTypes = Object.entries(GAME_CONFIG.EVENT_TYPES);
  
  const events = await Promise.all(
    eventTypes.map(([type, config], index) => 
      prisma.event.create({
        data: {
          name: config.name,
          description: config.description,
          type,
          reward: config.baseReward + index * 5,
          startTime: now,
          endTime: index === 0 ? tomorrow : nextWeek,
          active: true,
        },
      })
    )
  );
  
  return events.map(event => ({
    ...event,
    hasParticipated: false,
  }));
}
