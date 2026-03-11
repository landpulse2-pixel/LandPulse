import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/admin/cleanup - Delete all parcels and reset users
export async function POST() {
  try {
    // Delete all parcels
    const deletedParcels = await prisma.parcel.deleteMany({});
    
    // Delete all transactions
    const deletedTransactions = await prisma.transaction.deleteMany({});
    
    // Delete all buildings
    const deletedBuildings = await prisma.building.deleteMany({});
    
    // Reset user stats
    const updatedUsers = await prisma.user.updateMany({
      data: {
        pulseBucks: 20000, // Give 20K PB for testing
        points: 0,
        totalPointsEarned: 0,
        totalSpent: 0,
        lastDailyBonus: null,
        boostEndTime: null,
        totalAdsWatched: 0,
      }
    });

    return NextResponse.json({
      success: true,
      deleted: {
        parcels: deletedParcels.count,
        transactions: deletedTransactions.count,
        buildings: deletedBuildings.count,
      },
      resetUsers: updatedUsers.count,
    });
  } catch (error) {
    console.error('Error cleaning up database:', error);
    return NextResponse.json({ error: 'Failed to cleanup database' }, { status: 500 });
  }
}
