import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/admin/diagnostic - Check database schema
export async function GET(request: NextRequest) {
  try {
    // Get all columns in User table
    const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'User'
      ORDER BY ordinal_position
    `;

    // Get all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    // Get indexes on User table
    const userIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'User'
    `;

    // Try to get a sample user
    const sampleUser = await prisma.user.findFirst({
      select: {
        id: true,
        walletAddress: true,
        username: true,
        avatarUrl: true,
        pulseBucks: true,
      }
    });

    return NextResponse.json({
      userColumns,
      tables,
      userIndexes,
      sampleUser,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST /api/admin/diagnostic - Force add missing columns
export async function POST(request: NextRequest) {
  try {
    const results: string[] = [];

    // Force add username column
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT`;
      results.push('Added username column (IF NOT EXISTS)');
    } catch (e: any) {
      results.push(`Username column error: ${e.message}`);
    }

    // Force add avatarUrl column
    try {
      await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`;
      results.push('Added avatarUrl column (IF NOT EXISTS)');
    } catch (e: any) {
      results.push(`AvatarUrl column error: ${e.message}`);
    }

    // Create unique index on username (only if not exists)
    try {
      await prisma.$executeRaw`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_username_key') THEN
            CREATE UNIQUE INDEX "User_username_key" ON "User"("username") WHERE "username" IS NOT NULL;
          END IF;
        END $$;
      `;
      results.push('Created unique index on username');
    } catch (e: any) {
      results.push(`Username index error: ${e.message}`);
    }

    // Verify columns were added
    const userColumns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'User'
      ORDER BY ordinal_position
    `;

    return NextResponse.json({
      success: true,
      results,
      currentColumns: userColumns
    });
  } catch (error) {
    console.error('Force migration error:', error);
    return NextResponse.json({
      error: 'Force migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
