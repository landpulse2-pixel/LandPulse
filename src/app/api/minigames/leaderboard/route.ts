import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// Types de jeux
type GameType = 'anneau_royal' | 'peche_parcelles' | 'roulette_terrestre' | 'memory_parcelles';

// GET /api/minigames/leaderboard - Obtenir le classement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType') as GameType | null;
    const eventId = searchParams.get('eventId');
    const walletAddress = searchParams.get('wallet');
    
    // Si on demande un classement pour un événement spécifique
    if (eventId) {
      const participations = await prisma.eventParticipation.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              walletAddress: true,
            },
          },
        },
        orderBy: [
          { score: 'desc' },
        ],
        take: 100,
      });
      
      // Calculer les victoires par joueur (mock pour l'instant)
      const leaderboard = participations.map((p, index) => ({
        rank: index + 1,
        walletAddress: p.user.walletAddress,
        score: p.score || 0,
        wins: Math.floor(Math.random() * 50), // TODO: stocker les vraies victoires
        reward: p.reward,
      }));
      
      return NextResponse.json({ leaderboard });
    }
    
    // Classement général mocké pour la démo
    const mockLeaderboard = Array.from({ length: 100 }, (_, i) => ({
      rank: i + 1,
      walletAddress: `player${i + 1}@solana`,
      score: Math.floor(Math.random() * 500) + 100,
      wins: Math.floor(Math.random() * 50),
      name: i === 0 ? 'DragonSlayer' : 
            i === 1 ? 'CryptoKing' : 
            i === 2 ? 'LandBaron' :
            i === 3 ? 'PixelMaster' :
            `Player${i + 1}`,
      avatar: i === 0 ? '🐉' : 
              i === 1 ? '👑' : 
              i === 2 ? '🏰' :
              i === 3 ? '🎮' :
              '👤',
    }));
    
    // Trouver le rang de l'utilisateur connecté
    let userRank = null;
    if (walletAddress) {
      const userIndex = mockLeaderboard.findIndex(p => p.walletAddress === walletAddress);
      if (userIndex !== -1) {
        userRank = mockLeaderboard[userIndex];
      } else {
        // Ajouter l'utilisateur s'il n'est pas dans le top 100
        userRank = {
          rank: 101,
          walletAddress,
          score: 0,
          wins: 0,
          name: 'You',
          avatar: '👤',
        };
      }
    }
    
    return NextResponse.json({ 
      leaderboard: mockLeaderboard.slice(0, 10),
      userRank,
      total: mockLeaderboard.length,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

// POST /api/minigames/leaderboard - Enregistrer un score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, gameType, score, won, eventId } = body;
    
    if (!walletAddress || !gameType) {
      return NextResponse.json(
        { error: 'Wallet address and game type required' },
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
    
    // Obtenir la config du jeu
    const gameConfig = GAME_CONFIG.GAME_EVENTS[gameType as keyof typeof GAME_CONFIG.GAME_EVENTS];
    if (!gameConfig) {
      return NextResponse.json(
        { error: 'Invalid game type' },
        { status: 400 }
      );
    }
    
    // Calculer les récompenses
    let rewardEarned = 0;
    let victoryMilestone = null;
    
    if (won) {
      // TODO: Stocker les victoires dans une table dédiée
      // Pour l'instant, on simule
      const currentWins = Math.floor(Math.random() * 50); // Mock
      
      // Vérifier les milestones
      const milestones = gameConfig.rewards.victories;
      for (const milestone of milestones) {
        if (currentWins === milestone.count) {
          victoryMilestone = milestone;
          rewardEarned += milestone.reward;
          break;
        }
      }
    }
    
    // Mettre à jour le solde si récompense
    if (rewardEarned > 0) {
      await prisma.user.update({
        where: { walletAddress },
        data: {
          pulseBucks: user.pulseBucks + rewardEarned,
          totalEarned: user.totalEarned + rewardEarned,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      score,
      won,
      reward: rewardEarned,
      victoryMilestone,
    });
  } catch (error) {
    console.error('Error recording game score:', error);
    return NextResponse.json(
      { error: 'Failed to record score' },
      { status: 500 }
    );
  }
}
