// Script to clean database for testing
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log('🧹 Starting cleanup...');
    
    // Delete all buildings
    const deletedBuildings = await prisma.building.deleteMany({});
    console.log(`✅ Deleted ${deletedBuildings.count} buildings`);
    
    // Delete all parcels
    const deletedParcels = await prisma.parcel.deleteMany({});
    console.log(`✅ Deleted ${deletedParcels.count} parcels`);
    
    // Delete all transactions
    const deletedTransactions = await prisma.transaction.deleteMany({});
    console.log(`✅ Deleted ${deletedTransactions.count} transactions`);
    
    // Delete all point conversions
    const deletedConversions = await prisma.pointConversion.deleteMany({});
    console.log(`✅ Deleted ${deletedConversions.count} point conversions`);
    
    // Delete all ad watches
    const deletedAdWatches = await prisma.adWatch.deleteMany({});
    console.log(`✅ Deleted ${deletedAdWatches.count} ad watches`);
    
    // Reset all users
    const updatedUsers = await prisma.user.updateMany({
      data: {
        pulseBucks: 20000,
        points: 0,
        totalPointsEarned: 0,
        totalSpent: 0,
        lastDailyBonus: null,
        boostEndTime: null,
        totalAdsWatched: 0,
      }
    });
    console.log(`✅ Reset ${updatedUsers.count} users to 20,000 PB`);
    
    console.log('\n🎉 Database cleaned successfully!');
    console.log('💰 You now have 20,000 PB for testing');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
