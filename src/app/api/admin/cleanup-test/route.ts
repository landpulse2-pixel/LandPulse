import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/admin/cleanup-test - Delete all data and reset for testing
export async function POST() {
  try {
    // Delete all buildings
    const deletedBuildings = await prisma.building.deleteMany({});
    console.log(`Deleted ${deletedBuildings.count} buildings`);
    
    // Delete all parcels
    const deletedParcels = await prisma.parcel.deleteMany({});
    console.log(`Deleted ${deletedParcels.count} parcels`);
    
    // Delete all transactions
    const deletedTransactions = await prisma.transaction.deleteMany({});
    console.log(`Deleted ${deletedTransactions.count} transactions`);
    
    // Delete all point conversions
    const deletedConversions = await prisma.pointConversion.deleteMany({});
    console.log(`Deleted ${deletedConversions.count} point conversions`);
    
    // Delete all ad watches
    const deletedAdWatches = await prisma.adWatch.deleteMany({});
    console.log(`Deleted ${deletedAdWatches.count} ad watches`);
    
    // Reset all users
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
    console.log(`Reset ${updatedUsers.count} users`);

    return NextResponse.json({
      success: true,
      message: 'Database cleaned and reset for testing!',
      deleted: {
        parcels: deletedParcels.count,
        buildings: deletedBuildings.count,
        transactions: deletedTransactions.count,
        conversions: deletedConversions.count,
        adWatches: deletedAdWatches.count,
      },
      resetUsers: updatedUsers.count,
    });
  } catch (error) {
    console.error('Error cleaning up database:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
