import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// POST /api/admin/migrate-dollars - Migrate existing data from points to dollars
export async function POST() {
  try {
    console.log('[MIGRATE-DOLLARS] Starting dollars data migration...');
    const details: string[] = [];

    // Check if dollarsPerSecond column exists in Parcel
    const checkDollarsPerSecondColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Parcel' 
      AND column_name = 'dollarsPerSecond'
    `;

    if (Array.isArray(checkDollarsPerSecondColumn) && checkDollarsPerSecondColumn.length === 0) {
      // Column doesn't exist, add it first
      await prisma.$executeRaw`ALTER TABLE "Parcel" ADD COLUMN "dollarsPerSecond" DOUBLE PRECISION NOT NULL DEFAULT 0`;
      details.push('Added dollarsPerSecond column to Parcel table');
    }

    // Check if dollars column exists in User
    const checkDollarsColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'dollars'
    `;

    if (Array.isArray(checkDollarsColumn) && checkDollarsColumn.length === 0) {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "dollars" DOUBLE PRECISION NOT NULL DEFAULT 0`;
      details.push('Added dollars column to User table');
    }

    // Check if totalDollarsEarned column exists in User
    const checkTotalDollarsColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'totalDollarsEarned'
    `;

    if (Array.isArray(checkTotalDollarsColumn) && checkTotalDollarsColumn.length === 0) {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "totalDollarsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0`;
      details.push('Added totalDollarsEarned column to User table');
    }

    // Check if lastDollarsUpdate column exists in User
    const checkLastDollarsUpdateColumn = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name = 'lastDollarsUpdate'
    `;

    if (Array.isArray(checkLastDollarsUpdateColumn) && checkLastDollarsUpdateColumn.length === 0) {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "lastDollarsUpdate" TIMESTAMP(3) NOT NULL DEFAULT NOW()`;
      details.push('Added lastDollarsUpdate column to User table');
    }

    // 1. Migrate Parcel: Update dollarsPerSecond based on rarity
    // Using raw query to avoid Prisma schema mismatch
    const parcelsResult = await prisma.$queryRaw`
      SELECT id, level, "dollarsPerSecond" FROM "Parcel"
    ` as any[];

    let parcelsUpdated = 0;

    for (const parcel of parcelsResult) {
      if (!parcel.dollarsPerSecond || parcel.dollarsPerSecond === 0) {
        const rarityConfig = GAME_CONFIG.RARITY_LEVELS[parcel.level as keyof typeof GAME_CONFIG.RARITY_LEVELS];
        if (rarityConfig) {
          await prisma.$executeRaw`
            UPDATE "Parcel" SET "dollarsPerSecond" = ${rarityConfig.dollarsPerSecond} WHERE id = ${parcel.id}
          `;
          parcelsUpdated++;
        }
      }
    }
    details.push(`${parcelsUpdated} parcelles mises à jour avec dollarsPerSecond`);
    details.push(`${parcelsResult.length - parcelsUpdated} parcelles avaient déjà dollarsPerSecond`);

    // 2. Initialize User dollars fields
    const usersResult = await prisma.$queryRaw`
      SELECT id, dollars, "totalDollarsEarned", "totalWithdrawn", "lastDollarsUpdate" FROM "User"
    ` as any[];

    let usersUpdated = 0;

    for (const user of usersResult) {
      const updates: string[] = [];
      
      if (user.dollars === null || user.dollars === undefined) {
        updates.push(`"dollars" = 0`);
      }
      
      if (user.totalDollarsEarned === null || user.totalDollarsEarned === undefined) {
        updates.push(`"totalDollarsEarned" = 0`);
      }
      
      if (user.totalWithdrawn === null || user.totalWithdrawn === undefined) {
        updates.push(`"totalWithdrawn" = 0`);
        updates.push(`"withdrawnToday" = 0`);
        updates.push(`"withdrawnThisWeek" = 0`);
      }
      
      if (user.lastDollarsUpdate === null || user.lastDollarsUpdate === undefined) {
        updates.push(`"lastDollarsUpdate" = NOW()`);
      }

      if (updates.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET ${updates.join(', ')} WHERE id = '${user.id}'`
        );
        usersUpdated++;
      }
    }
    details.push(`${usersUpdated} utilisateurs mis à jour`);
    details.push(`${usersResult.length - usersUpdated} utilisateurs avaient déjà les champs dollars`);

    // 3. Create or update SOL price
    let solPrice = 150; // Default fallback
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        { cache: 'no-store' }
      );
      const data = await response.json();
      if (data.solana?.usd) {
        solPrice = data.solana.usd;
      }
    } catch (error) {
      console.log('[MIGRATE-DOLLARS] Could not fetch SOL price, using default');
    }

    // Check if TokenPrice table exists
    try {
      const existingPrice = await prisma.$queryRaw`
        SELECT * FROM "TokenPrice" WHERE token = 'SOL' LIMIT 1
      ` as any[];

      if (existingPrice && existingPrice.length > 0) {
        await prisma.$executeRaw`
          UPDATE "TokenPrice" SET "priceUsd" = ${solPrice}, "lastUpdated" = NOW() WHERE token = 'SOL'
        `;
        details.push(`Prix SOL mis à jour: $${solPrice}`);
      } else {
        await prisma.$executeRaw`
          INSERT INTO "TokenPrice" (id, token, "priceUsd", "change24h", "lastUpdated")
          VALUES (gen_random_uuid(), 'SOL', ${solPrice}, 0, NOW())
        `;
        details.push(`Prix SOL initialisé: $${solPrice}`);
      }
    } catch (error) {
      // TokenPrice table might not exist, try to create it
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
        await prisma.$executeRaw`
          INSERT INTO "TokenPrice" (id, token, "priceUsd", "change24h", "lastUpdated")
          VALUES (gen_random_uuid(), 'SOL', ${solPrice}, 0, NOW())
        `;
        details.push(`Table TokenPrice créée avec prix SOL: $${solPrice}`);
      } catch (e) {
        details.push('Erreur lors de la création de TokenPrice (peut déjà exister)');
      }
    }

    // 4. Count existing data
    const parcelCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Parcel"` as any[];
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"` as any[];

    details.push(`Total: ${parcelCount[0]?.count || 0} parcelles en base`);
    details.push(`Total: ${userCount[0]?.count || 0} utilisateurs en base`);

    console.log('[MIGRATE-DOLLARS] Migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Migration des données dollars terminée avec succès',
      details,
    });
  } catch (error) {
    console.error('[MIGRATE-DOLLARS] Error during migration:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la migration',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET /api/admin/migrate-dollars - Check migration status
export async function GET() {
  try {
    // Check Parcel columns
    const parcelColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Parcel'
    ` as any[];

    // Check User columns
    const userColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'User'
    ` as any[];

    // Count data
    const parcelCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Parcel"` as any[];
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"` as any[];

    // Check SOL price
    let solPrice = null;
    try {
      const priceResult = await prisma.$queryRaw`
        SELECT "priceUsd", "lastUpdated" FROM "TokenPrice" WHERE token = 'SOL' LIMIT 1
      ` as any[];
      if (priceResult && priceResult.length > 0) {
        solPrice = { price: priceResult[0].priceUsd, updated: priceResult[0].lastUpdated };
      }
    } catch (e) {
      // Table might not exist
    }

    return NextResponse.json({
      status: 'ok',
      hasDollarsPerSecond: parcelColumns.some(c => c.column_name === 'dollarsPerSecond'),
      hasUserDollars: userColumns.some(c => c.column_name === 'dollars'),
      hasTotalDollarsEarned: userColumns.some(c => c.column_name === 'totalDollarsEarned'),
      stats: {
        parcels: parcelCount[0]?.count || 0,
        users: userCount[0]?.count || 0,
      },
      solPrice,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
