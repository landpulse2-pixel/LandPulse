import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/admin/migrate - Sync database schema
// This adds missing columns to the database
export async function POST(request: NextRequest) {
  try {
    console.log('[MIGRATE] Starting database migration...');
    
    const results: string[] = [];
    
    // Check if lastPointsUpdate column exists in User table
    const checkColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'lastPointsUpdate'
    `;
    
    if (Array.isArray(checkColumn) && checkColumn.length === 0) {
      console.log('[MIGRATE] Adding lastPointsUpdate column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "lastPointsUpdate" TIMESTAMP(3) NOT NULL DEFAULT NOW()
      `;
      results.push('Added lastPointsUpdate column to User table');
    } else {
      results.push('lastPointsUpdate column already exists');
    }
    
    // Check if totalAdsWatched column exists
    const checkAdsColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'totalAdsWatched'
    `;
    
    if (Array.isArray(checkAdsColumn) && checkAdsColumn.length === 0) {
      console.log('[MIGRATE] Adding totalAdsWatched column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "totalAdsWatched" INTEGER NOT NULL DEFAULT 0
      `;
      results.push('Added totalAdsWatched column to User table');
    } else {
      results.push('totalAdsWatched column already exists');
    }
    
    // Check if boostEndTime column exists
    const checkBoostColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'boostEndTime'
    `;
    
    if (Array.isArray(checkBoostColumn) && checkBoostColumn.length === 0) {
      console.log('[MIGRATE] Adding boostEndTime column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "boostEndTime" TIMESTAMP(3)
      `;
      results.push('Added boostEndTime column to User table');
    } else {
      results.push('boostEndTime column already exists');
    }

    // Check if subscription column exists
    const checkSubscriptionColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'subscription'
    `;
    
    if (Array.isArray(checkSubscriptionColumn) && checkSubscriptionColumn.length === 0) {
      console.log('[MIGRATE] Adding subscription column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "subscription" TEXT NOT NULL DEFAULT 'free'
      `;
      results.push('Added subscription column to User table');
    } else {
      results.push('subscription column already exists');
    }

    // Check if subscriptionEnd column exists
    const checkSubscriptionEndColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'subscriptionEnd'
    `;
    
    if (Array.isArray(checkSubscriptionEndColumn) && checkSubscriptionEndColumn.length === 0) {
      console.log('[MIGRATE] Adding subscriptionEnd column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "subscriptionEnd" TIMESTAMP(3)
      `;
      results.push('Added subscriptionEnd column to User table');
    } else {
      results.push('subscriptionEnd column already exists');
    }

    // Check if adsWatchedToday column exists
    const checkAdsWatchedTodayColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'adsWatchedToday'
    `;
    
    if (Array.isArray(checkAdsWatchedTodayColumn) && checkAdsWatchedTodayColumn.length === 0) {
      console.log('[MIGRATE] Adding adsWatchedToday column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "adsWatchedToday" INTEGER NOT NULL DEFAULT 0
      `;
      results.push('Added adsWatchedToday column to User table');
    } else {
      results.push('adsWatchedToday column already exists');
    }

    // Check if lastAdWatchDate column exists
    const checkLastAdWatchDateColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'lastAdWatchDate'
    `;
    
    if (Array.isArray(checkLastAdWatchDateColumn) && checkLastAdWatchDateColumn.length === 0) {
      console.log('[MIGRATE] Adding lastAdWatchDate column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "lastAdWatchDate" TIMESTAMP(3)
      `;
      results.push('Added lastAdWatchDate column to User table');
    } else {
      results.push('lastAdWatchDate column already exists');
    }
    
    // Check Building table columns
    const checkBuildingColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Building'
    `;
    
    const existingColumns = Array.isArray(checkBuildingColumns) 
      ? checkBuildingColumns.map((c: any) => c.column_name) 
      : [];
    
    if (!existingColumns.includes('name')) {
      await prisma.$executeRaw`ALTER TABLE "Building" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Building'`;
      results.push('Added name column to Building table');
    }
    
    if (!existingColumns.includes('capacity')) {
      await prisma.$executeRaw`ALTER TABLE "Building" ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 1`;
      results.push('Added capacity column to Building table');
    }
    
    if (!existingColumns.includes('boostPercent')) {
      await prisma.$executeRaw`ALTER TABLE "Building" ADD COLUMN "boostPercent" INTEGER NOT NULL DEFAULT 10`;
      results.push('Added boostPercent column to Building table');
    }
    
    if (!existingColumns.includes('assignedParcels')) {
      await prisma.$executeRaw`ALTER TABLE "Building" ADD COLUMN "assignedParcels" TEXT`;
      results.push('Added assignedParcels column to Building table');
    }
    
    // Update existing buildings with correct data
    await prisma.$executeRaw`
      UPDATE "Building" SET "name" = 'Maison', "boostPercent" = 5, "capacity" = 0 WHERE type = 'house' AND "name" = 'Building'
    `;

    // Create Subscription table if it doesn't exist
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Subscription" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "tier" TEXT NOT NULL,
          "priceUsd" DOUBLE PRECISION NOT NULL,
          "paymentMethod" TEXT NOT NULL,
          "paymentAmount" DOUBLE PRECISION NOT NULL,
          "txHash" TEXT,
          "stripePaymentId" TEXT,
          "durationDays" INTEGER NOT NULL,
          "startDate" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "endDate" TIMESTAMP(3) NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'active',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created Subscription table');
    } catch (e) {
      results.push('Subscription table already exists or error creating');
    }

    // Add foreign key constraint for Subscription
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_userId_fkey"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      results.push('Added foreign key constraint to Subscription table');
    } catch (e) {
      results.push('Foreign key constraint already exists or error adding');
    }

    // ==========================================
    // PROFILE SYSTEM MIGRATIONS (username, avatar)
    // ==========================================
    
    // Check if username column exists
    const checkUsernameColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'username'
    `;
    
    if (Array.isArray(checkUsernameColumn) && checkUsernameColumn.length === 0) {
      console.log('[MIGRATE] Adding username column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "username" TEXT
      `;
      results.push('Added username column to User table');
    } else {
      results.push('username column already exists');
    }

    // Check if avatarUrl column exists
    const checkAvatarUrlColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'avatarUrl'
    `;
    
    if (Array.isArray(checkAvatarUrlColumn) && checkAvatarUrlColumn.length === 0) {
      console.log('[MIGRATE] Adding avatarUrl column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT
      `;
      results.push('Added avatarUrl column to User table');
    } else {
      results.push('avatarUrl column already exists');
    }

    // Add unique index on username
    try {
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")
      `;
      results.push('Added unique index on User.username');
    } catch (e) {
      results.push('Unique index on username already exists or error adding');
    }

    // ==========================================
    // REFERRAL SYSTEM MIGRATIONS
    // ==========================================
    
    // Check if referralCode column exists
    const checkReferralCodeColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'referralCode'
    `;
    
    if (Array.isArray(checkReferralCodeColumn) && checkReferralCodeColumn.length === 0) {
      console.log('[MIGRATE] Adding referralCode column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "referralCode" TEXT
      `;
      results.push('Added referralCode column to User table');
    } else {
      results.push('referralCode column already exists');
    }

    // Check if referredBy column exists
    const checkReferredByColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'referredBy'
    `;
    
    if (Array.isArray(checkReferredByColumn) && checkReferredByColumn.length === 0) {
      console.log('[MIGRATE] Adding referredBy column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "referredBy" TEXT
      `;
      results.push('Added referredBy column to User table');
    } else {
      results.push('referredBy column already exists');
    }

    // Check if referralCount column exists
    const checkReferralCountColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'referralCount'
    `;
    
    if (Array.isArray(checkReferralCountColumn) && checkReferralCountColumn.length === 0) {
      console.log('[MIGRATE] Adding referralCount column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "referralCount" INTEGER NOT NULL DEFAULT 0
      `;
      results.push('Added referralCount column to User table');
    } else {
      results.push('referralCount column already exists');
    }

    // Check if referralEarnings column exists
    const checkReferralEarningsColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'referralEarnings'
    `;
    
    if (Array.isArray(checkReferralEarningsColumn) && checkReferralEarningsColumn.length === 0) {
      console.log('[MIGRATE] Adding referralEarnings column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "referralEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0
      `;
      results.push('Added referralEarnings column to User table');
    } else {
      results.push('referralEarnings column already exists');
    }

    // Check if campaignCompleted column exists
    const checkCampaignCompletedColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'campaignCompleted'
    `;
    
    if (Array.isArray(checkCampaignCompletedColumn) && checkCampaignCompletedColumn.length === 0) {
      console.log('[MIGRATE] Adding campaignCompleted column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "campaignCompleted" BOOLEAN NOT NULL DEFAULT false
      `;
      results.push('Added campaignCompleted column to User table');
    } else {
      results.push('campaignCompleted column already exists');
    }

    // Check if campaignRewardClaimed column exists
    const checkCampaignRewardClaimedColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'campaignRewardClaimed'
    `;
    
    if (Array.isArray(checkCampaignRewardClaimedColumn) && checkCampaignRewardClaimedColumn.length === 0) {
      console.log('[MIGRATE] Adding campaignRewardClaimed column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "campaignRewardClaimed" BOOLEAN NOT NULL DEFAULT false
      `;
      results.push('Added campaignRewardClaimed column to User table');
    } else {
      results.push('campaignRewardClaimed column already exists');
    }

    // Create Referral table if it doesn't exist
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Referral" (
          "id" TEXT NOT NULL,
          "referrerId" TEXT NOT NULL,
          "referredId" TEXT NOT NULL,
          "codeUsed" TEXT NOT NULL,
          "referrerReward" INTEGER NOT NULL DEFAULT 500,
          "referredReward" INTEGER NOT NULL DEFAULT 500,
          "campaignEligible" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created Referral table');
    } catch (e) {
      results.push('Referral table already exists or error creating');
    }

    // Add unique constraint to Referral for referredId
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_referredId_key"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_key" UNIQUE ("referredId")
      `;
      results.push('Added unique constraint to Referral.referredId');
    } catch (e) {
      results.push('Unique constraint already exists or error adding');
    }

    // Add foreign key constraints for Referral
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_referrerId_fkey"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" 
        FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      results.push('Added foreign key constraint to Referral.referrerId');
    } catch (e) {
      results.push('Foreign key constraint referrerId already exists or error adding');
    }

    try {
      await prisma.$executeRaw`
        ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_referredId_fkey"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey" 
        FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      results.push('Added foreign key constraint to Referral.referredId');
    } catch (e) {
      results.push('Foreign key constraint referredId already exists or error adding');
    }

    // Create CampaignStats table if it doesn't exist
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "CampaignStats" (
          "id" TEXT NOT NULL,
          "completedCount" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "CampaignStats_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created CampaignStats table');
    } catch (e) {
      results.push('CampaignStats table already exists or error creating');
    }

    // Add unique index on referralCode
    try {
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode")
      `;
      results.push('Added unique index on User.referralCode');
    } catch (e) {
      results.push('Unique index on referralCode already exists or error adding');
    }

    // ==========================================
    // COMMISSION SYSTEM MIGRATIONS (5% lifetime)
    // ==========================================
    
    // Check if commissionEarnings column exists in User
    const checkCommissionEarningsColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'commissionEarnings'
    `;
    
    if (Array.isArray(checkCommissionEarningsColumn) && checkCommissionEarningsColumn.length === 0) {
      console.log('[MIGRATE] Adding commissionEarnings column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "commissionEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0
      `;
      results.push('Added commissionEarnings column to User table');
    } else {
      results.push('commissionEarnings column already exists');
    }

    // Check if totalCommissionEarned column exists in Referral
    const checkTotalCommissionColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Referral' 
      AND column_name = 'totalCommissionEarned'
    `;
    
    if (Array.isArray(checkTotalCommissionColumn) && checkTotalCommissionColumn.length === 0) {
      console.log('[MIGRATE] Adding totalCommissionEarned column to Referral...');
      await prisma.$executeRaw`
        ALTER TABLE "Referral" ADD COLUMN "totalCommissionEarned" DOUBLE PRECISION NOT NULL DEFAULT 0
      `;
      results.push('Added totalCommissionEarned column to Referral table');
    } else {
      results.push('totalCommissionEarned column already exists in Referral');
    }

    // ==========================================
    // MONUMENT AUCTION SYSTEM MIGRATIONS
    // ==========================================
    
    // Create Monument table if it doesn't exist
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Monument" (
          "id" TEXT NOT NULL,
          "monumentId" TEXT NOT NULL,
          "lat" DOUBLE PRECISION NOT NULL,
          "lng" DOUBLE PRECISION NOT NULL,
          "name" TEXT NOT NULL,
          "city" TEXT NOT NULL,
          "country" TEXT NOT NULL,
          "emoji" TEXT NOT NULL,
          "rarity" TEXT NOT NULL,
          "incomeMultiplier" INTEGER NOT NULL DEFAULT 10,
          "status" TEXT NOT NULL DEFAULT 'locked',
          "basePricePB" INTEGER NOT NULL,
          "currentBidPB" INTEGER NOT NULL DEFAULT 0,
          "currentBidderId" TEXT,
          "winnerId" TEXT,
          "soldPricePB" INTEGER NOT NULL DEFAULT 0,
          "auctionStart" TIMESTAMP(3),
          "auctionEnd" TIMESTAMP(3),
          "soldAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Monument_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created Monument table');
    } catch (e) {
      results.push('Monument table already exists or error creating');
    }

    // Add incomeMultiplier column to Monument if not exists
    try {
      const checkIncomeMultiplier = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Monument' 
        AND column_name = 'incomeMultiplier'
      `;
      if (Array.isArray(checkIncomeMultiplier) && checkIncomeMultiplier.length === 0) {
        await prisma.$executeRaw`ALTER TABLE "Monument" ADD COLUMN "incomeMultiplier" INTEGER NOT NULL DEFAULT 10`;
        results.push('Added incomeMultiplier column to Monument table');
      }
    } catch (e) {
      results.push('incomeMultiplier column check error (may already exist)');
    }

    // Add unique constraint to Monument for monumentId
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Monument" DROP CONSTRAINT IF EXISTS "Monument_monumentId_key"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "Monument" ADD CONSTRAINT "Monument_monumentId_key" UNIQUE ("monumentId")
      `;
      results.push('Added unique constraint to Monument.monumentId');
    } catch (e) {
      results.push('Monument unique constraint already exists or error adding');
    }

    // Create MonumentBid table if it doesn't exist
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "MonumentBid" (
          "id" TEXT NOT NULL,
          "monumentId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "amountPB" INTEGER NOT NULL,
          "isWinning" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          CONSTRAINT "MonumentBid_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created MonumentBid table');
    } catch (e) {
      results.push('MonumentBid table already exists or error creating');
    }

    // ==========================================
    // DOLLARS SYSTEM MIGRATIONS (Points → Dollars)
    // ==========================================
    
    // Add dollars column to User if not exists
    const checkDollarsColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'dollars'
    `;
    
    if (Array.isArray(checkDollarsColumn) && checkDollarsColumn.length === 0) {
      console.log('[MIGRATE] Adding dollars column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "dollars" DOUBLE PRECISION NOT NULL DEFAULT 0
      `;
      results.push('Added dollars column to User table');
    } else {
      results.push('dollars column already exists');
    }

    // Add totalDollarsEarned column to User if not exists
    const checkTotalDollarsColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'totalDollarsEarned'
    `;
    
    if (Array.isArray(checkTotalDollarsColumn) && checkTotalDollarsColumn.length === 0) {
      console.log('[MIGRATE] Adding totalDollarsEarned column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "totalDollarsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0
      `;
      results.push('Added totalDollarsEarned column to User table');
    } else {
      results.push('totalDollarsEarned column already exists');
    }

    // Add lastDollarsUpdate column to User if not exists
    const checkLastDollarsUpdateColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'lastDollarsUpdate'
    `;
    
    if (Array.isArray(checkLastDollarsUpdateColumn) && checkLastDollarsUpdateColumn.length === 0) {
      console.log('[MIGRATE] Adding lastDollarsUpdate column...');
      await prisma.$executeRaw`
        ALTER TABLE "User" ADD COLUMN "lastDollarsUpdate" TIMESTAMP(3) NOT NULL DEFAULT NOW()
      `;
      results.push('Added lastDollarsUpdate column to User table');
    } else {
      results.push('lastDollarsUpdate column already exists');
    }

    // Add withdrawal columns to User if not exist
    const checkTotalWithdrawnColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'totalWithdrawn'
    `;
    
    if (Array.isArray(checkTotalWithdrawnColumn) && checkTotalWithdrawnColumn.length === 0) {
      console.log('[MIGRATE] Adding withdrawal columns...');
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "totalWithdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0`;
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "withdrawnToday" DOUBLE PRECISION NOT NULL DEFAULT 0`;
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "withdrawnThisWeek" DOUBLE PRECISION NOT NULL DEFAULT 0`;
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "lastWithdrawalDate" TIMESTAMP(3)`;
      results.push('Added withdrawal columns to User table');
    } else {
      results.push('Withdrawal columns already exist');
    }

    // Add dollarsPerSecond column to Parcel if not exists
    const checkDollarsPerSecondColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Parcel' 
      AND column_name = 'dollarsPerSecond'
    `;
    
    if (Array.isArray(checkDollarsPerSecondColumn) && checkDollarsPerSecondColumn.length === 0) {
      console.log('[MIGRATE] Adding dollarsPerSecond column to Parcel...');
      await prisma.$executeRaw`
        ALTER TABLE "Parcel" ADD COLUMN "dollarsPerSecond" DOUBLE PRECISION NOT NULL DEFAULT 0
      `;
      results.push('Added dollarsPerSecond column to Parcel table');
    } else {
      results.push('dollarsPerSecond column already exists in Parcel');
    }

    // Create TokenPrice table for SOL price if not exists
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "TokenPrice" (
          "id" TEXT NOT NULL,
          "token" TEXT NOT NULL,
          "priceUsd" DOUBLE PRECISION NOT NULL,
          "change24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          CONSTRAINT "TokenPrice_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created TokenPrice table');
    } catch (e) {
      results.push('TokenPrice table already exists or error creating');
    }

    // Add unique constraint to TokenPrice for token
    try {
      await prisma.$executeRaw`
        ALTER TABLE "TokenPrice" DROP CONSTRAINT IF EXISTS "TokenPrice_token_key"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "TokenPrice" ADD CONSTRAINT "TokenPrice_token_key" UNIQUE ("token")
      `;
      results.push('Added unique constraint to TokenPrice.token');
    } catch (e) {
      results.push('TokenPrice unique constraint already exists or error adding');
    }

    // Create Withdrawal table if not exists
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Withdrawal" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "dollarAmount" DOUBLE PRECISION NOT NULL,
          "solAmount" DOUBLE PRECISION NOT NULL,
          "solPrice" DOUBLE PRECISION NOT NULL,
          "feeDollars" DOUBLE PRECISION NOT NULL,
          "feeSOL" DOUBLE PRECISION NOT NULL,
          "txHash" TEXT,
          "status" TEXT NOT NULL DEFAULT 'pending',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "processedAt" TIMESTAMP(3),
          CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created Withdrawal table');
    } catch (e) {
      results.push('Withdrawal table already exists or error creating');
    }

    // Add foreign key constraint for Withdrawal
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Withdrawal" DROP CONSTRAINT IF EXISTS "Withdrawal_userId_fkey"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      results.push('Added foreign key constraint to Withdrawal table');
    } catch (e) {
      results.push('Withdrawal foreign key constraint already exists or error adding');
    }

    // ==========================================
    // GAME EVENTS SYSTEM MIGRATIONS
    // ==========================================
    
    // Create GameEvent table if not exists
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "GameEvent" (
          "id" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "startTime" TIMESTAMP(3) NOT NULL,
          "endTime" TIMESTAMP(3) NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'scheduled',
          "rewardPoolPB" INTEGER NOT NULL DEFAULT 0,
          "participants" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created GameEvent table');
    } catch (e) {
      results.push('GameEvent table already exists or error creating');
    }

    // Create GameSession table if not exists
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "GameSession" (
          "id" TEXT NOT NULL,
          "eventId" TEXT,
          "player1Id" TEXT NOT NULL,
          "player2Id" TEXT,
          "player1Score" INTEGER NOT NULL DEFAULT 0,
          "player2Score" INTEGER NOT NULL DEFAULT 0,
          "winnerId" TEXT,
          "gameType" TEXT NOT NULL DEFAULT 'anneau_royal',
          "duration" INTEGER NOT NULL DEFAULT 60,
          "status" TEXT NOT NULL DEFAULT 'completed',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created GameSession table');
    } catch (e) {
      results.push('GameSession table already exists or error creating');
    }

    // Create PlayerEventStats table if not exists
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "PlayerEventStats" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "eventId" TEXT NOT NULL,
          "victories" INTEGER NOT NULL DEFAULT 0,
          "defeats" INTEGER NOT NULL DEFAULT 0,
          "draws" INTEGER NOT NULL DEFAULT 0,
          "totalScore" INTEGER NOT NULL DEFAULT 0,
          "totalGames" INTEGER NOT NULL DEFAULT 0,
          "rewardsClaimed" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "PlayerEventStats_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created PlayerEventStats table');
    } catch (e) {
      results.push('PlayerEventStats table already exists or error creating');
    }

    // Add unique constraint to PlayerEventStats for userId+eventId
    try {
      await prisma.$executeRaw`
        ALTER TABLE "PlayerEventStats" DROP CONSTRAINT IF EXISTS "PlayerEventStats_userId_eventId_key"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "PlayerEventStats" ADD CONSTRAINT "PlayerEventStats_userId_eventId_key" UNIQUE ("userId", "eventId")
      `;
      results.push('Added unique constraint to PlayerEventStats(userId, eventId)');
    } catch (e) {
      results.push('PlayerEventStats unique constraint already exists or error adding');
    }

    // Create AdWatch table if not exists
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "AdWatch" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "adType" TEXT NOT NULL,
          "duration" INTEGER NOT NULL,
          "boostDuration" INTEGER NOT NULL,
          "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
          CONSTRAINT "AdWatch_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created AdWatch table');
    } catch (e) {
      results.push('AdWatch table already exists or error creating');
    }

    // Create AppSettings table if not exists
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "AppSettings" (
          "id" TEXT NOT NULL,
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
        )
      `;
      results.push('Created AppSettings table');
    } catch (e) {
      results.push('AppSettings table already exists or error creating');
    }

    // Add unique constraint to AppSettings for key
    try {
      await prisma.$executeRaw`
        ALTER TABLE "AppSettings" DROP CONSTRAINT IF EXISTS "AppSettings_key_key"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_key_key" UNIQUE ("key")
      `;
      results.push('Added unique constraint to AppSettings.key');
    } catch (e) {
      results.push('AppSettings unique constraint already exists or error adding');
    }
    
    console.log('[MIGRATE] Migration completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed',
      results,
    });
    
  } catch (error) {
    console.error('[MIGRATE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET - Show current schema status
export async function GET() {
  try {
    const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `;
    
    const buildingColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Building'
      ORDER BY ordinal_position
    `;
    
    const parcelColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Parcel'
      ORDER BY ordinal_position
    `;
    
    return NextResponse.json({
      tables: {
        User: userColumns,
        Building: buildingColumns,
        Parcel: parcelColumns,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch schema',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
