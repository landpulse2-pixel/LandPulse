import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/health - Check database connection
export async function GET() {
  try {
    // Try to connect to the database
    await prisma.$queryRaw`SELECT 1`;
    
    // Try to count users
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
