import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    console.log('Running direct SQL migration...');
    
    // Tables to create with their SQL
    const tables = [
      {
        name: 'User',
        sql: `CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "walletAddress" TEXT UNIQUE NOT NULL,
          "username" TEXT UNIQUE,
          "avatarUrl" TEXT,
          "pulseBucks" DOUBLE PRECISION DEFAULT 100,
          "dollars" DOUBLE PRECISION DEFAULT 0,
          "totalDollarsEarned" DOUBLE PRECISION DEFAULT 0,
          "lastDollarsUpdate" TIMESTAMP DEFAULT NOW(),
          "lastDailyBonus" TIMESTAMP,
          "totalEarned" DOUBLE PRECISION DEFAULT 0,
          "totalSpent" DOUBLE PRECISION DEFAULT 0,
          "totalWithdrawn" DOUBLE PRECISION DEFAULT 0,
          "withdrawnToday" DOUBLE PRECISION DEFAULT 0,
          "withdrawnThisWeek" DOUBLE PRECISION DEFAULT 0,
          "lastWithdrawalDate" TIMESTAMP,
          "subscription" TEXT DEFAULT 'free',
          "subscriptionEnd" TIMESTAMP,
          "boostEndTime" TIMESTAMP,
          "totalAdsWatched" INTEGER DEFAULT 0,
          "adsWatchedToday" INTEGER DEFAULT 0,
          "lastAdWatchDate" TIMESTAMP,
          "referralCode" TEXT UNIQUE,
          "referredBy" TEXT,
          "referralCount" INTEGER DEFAULT 0,
          "referralEarnings" DOUBLE PRECISION DEFAULT 0,
          "commissionEarnings" DOUBLE PRECISION DEFAULT 0,
          "campaignCompleted" BOOLEAN DEFAULT false,
          "campaignRewardClaimed" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'Parcel',
        sql: `CREATE TABLE IF NOT EXISTS "Parcel" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "lat" DOUBLE PRECISION NOT NULL,
          "lng" DOUBLE PRECISION NOT NULL,
          "level" TEXT NOT NULL,
          "dollarsPerSecond" DOUBLE PRECISION DEFAULT 0,
          "ownerId" TEXT,
          "occupiedByBuildingId" TEXT,
          "boostedBy" TEXT,
          "improvementLevel" INTEGER DEFAULT 0,
          "purchasedAt" TIMESTAMP DEFAULT NOW(),
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          UNIQUE("lat", "lng")
        )`
      },
      {
        name: 'Building',
        sql: `CREATE TABLE IF NOT EXISTS "Building" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "type" TEXT NOT NULL,
          "name" TEXT DEFAULT 'Maison',
          "capacity" INTEGER DEFAULT 1,
          "boostPercent" INTEGER DEFAULT 10,
          "price" INTEGER DEFAULT 200,
          "ownerId" TEXT NOT NULL,
          "assignedParcels" TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'Transaction',
        sql: `CREATE TABLE IF NOT EXISTS "Transaction" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "amount" DOUBLE PRECISION,
          "paymentMethod" TEXT,
          "paymentAmount" DOUBLE PRECISION,
          "txHash" TEXT,
          "status" TEXT DEFAULT 'completed',
          "metadata" TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'Withdrawal',
        sql: `CREATE TABLE IF NOT EXISTS "Withdrawal" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT NOT NULL,
          "dollarAmount" DOUBLE PRECISION,
          "solAmount" DOUBLE PRECISION,
          "solPrice" DOUBLE PRECISION,
          "feeDollars" DOUBLE PRECISION,
          "feeSOL" DOUBLE PRECISION,
          "txHash" TEXT,
          "status" TEXT DEFAULT 'pending',
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "processedAt" TIMESTAMP
        )`
      },
      {
        name: 'AdWatch',
        sql: `CREATE TABLE IF NOT EXISTS "AdWatch" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT NOT NULL,
          "adType" TEXT NOT NULL,
          "duration" INTEGER,
          "boostDuration" INTEGER,
          "watchedAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'TokenPrice',
        sql: `CREATE TABLE IF NOT EXISTS "TokenPrice" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "token" TEXT UNIQUE NOT NULL,
          "priceUsd" DOUBLE PRECISION,
          "change24h" DOUBLE PRECISION DEFAULT 0,
          "lastUpdated" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'AppSettings',
        sql: `CREATE TABLE IF NOT EXISTS "AppSettings" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "key" TEXT UNIQUE NOT NULL,
          "value" TEXT,
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'CampaignStats',
        sql: `CREATE TABLE IF NOT EXISTS "CampaignStats" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "completedCount" INTEGER DEFAULT 0,
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'Subscription',
        sql: `CREATE TABLE IF NOT EXISTS "Subscription" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT NOT NULL,
          "tier" TEXT NOT NULL,
          "priceUsd" DOUBLE PRECISION,
          "paymentMethod" TEXT,
          "paymentAmount" DOUBLE PRECISION,
          "txHash" TEXT,
          "durationDays" INTEGER,
          "startDate" TIMESTAMP DEFAULT NOW(),
          "endDate" TIMESTAMP,
          "status" TEXT DEFAULT 'active',
          "createdAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'Referral',
        sql: `CREATE TABLE IF NOT EXISTS "Referral" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "referrerId" TEXT NOT NULL,
          "referredId" TEXT NOT NULL UNIQUE,
          "codeUsed" TEXT,
          "referrerReward" INTEGER DEFAULT 500,
          "referredReward" INTEGER DEFAULT 500,
          "totalCommissionEarned" DOUBLE PRECISION DEFAULT 0,
          "campaignEligible" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'Monument',
        sql: `CREATE TABLE IF NOT EXISTS "Monument" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "monumentId" TEXT UNIQUE NOT NULL,
          "lat" DOUBLE PRECISION,
          "lng" DOUBLE PRECISION,
          "name" TEXT,
          "city" TEXT,
          "country" TEXT,
          "emoji" TEXT,
          "rarity" TEXT,
          "incomeMultiplier" INTEGER DEFAULT 10,
          "status" TEXT DEFAULT 'locked',
          "basePricePB" INTEGER,
          "currentBidPB" INTEGER DEFAULT 0,
          "currentBidderId" TEXT,
          "winnerId" TEXT,
          "soldPricePB" INTEGER DEFAULT 0,
          "auctionStart" TIMESTAMP,
          "auctionEnd" TIMESTAMP,
          "soldAt" TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'MonumentBid',
        sql: `CREATE TABLE IF NOT EXISTS "MonumentBid" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "monumentId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "amountPB" INTEGER,
          "isWinning" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'GameEvent',
        sql: `CREATE TABLE IF NOT EXISTS "GameEvent" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "type" TEXT,
          "name" TEXT,
          "description" TEXT,
          "startTime" TIMESTAMP,
          "endTime" TIMESTAMP,
          "status" TEXT DEFAULT 'scheduled',
          "rewardPoolPB" INTEGER DEFAULT 0,
          "participants" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'GameSession',
        sql: `CREATE TABLE IF NOT EXISTS "GameSession" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "eventId" TEXT,
          "player1Id" TEXT NOT NULL,
          "player2Id" TEXT,
          "player1Score" INTEGER DEFAULT 0,
          "player2Score" INTEGER DEFAULT 0,
          "winnerId" TEXT,
          "gameType" TEXT DEFAULT 'anneau_royal',
          "duration" INTEGER DEFAULT 60,
          "status" TEXT DEFAULT 'completed',
          "createdAt" TIMESTAMP DEFAULT NOW()
        )`
      },
      {
        name: 'PlayerEventStats',
        sql: `CREATE TABLE IF NOT EXISTS "PlayerEventStats" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT NOT NULL,
          "eventId" TEXT NOT NULL,
          "victories" INTEGER DEFAULT 0,
          "defeats" INTEGER DEFAULT 0,
          "draws" INTEGER DEFAULT 0,
          "totalScore" INTEGER DEFAULT 0,
          "totalGames" INTEGER DEFAULT 0,
          "rewardsClaimed" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          UNIQUE("userId", "eventId")
        )`
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(table.sql);
        console.log(`Created table: ${table.name}`);
        created++;
      } catch (e) {
        const errorStr = String(e);
        if (errorStr.includes('already exists')) {
          console.log(`Table already exists: ${table.name}`);
          skipped++;
        } else {
          console.log(`Error creating ${table.name}:`, errorStr.slice(0, 200));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration terminée ! ${created} tables créées, ${skipped} tables existaient déjà.`,
      created,
      skipped,
      total: tables.length
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la migration: ' + (error as Error).message,
    }, { status: 500 });
  }
}
