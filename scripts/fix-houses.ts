// Script pour corriger les maisons en base de données
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche des maisons...\n');

  // Get all houses
  const houses = await prisma.building.findMany({
    where: { type: 'house' },
  });

  console.log(`📦 ${houses.length} maisons trouvées\n`);

  const results = {
    total: houses.length,
    fixed: 0,
    alreadyOk: 0,
    errors: 0,
    totalParcelsFreed: 0,
  };

  for (const house of houses) {
    // Parse assigned parcels
    let assignedParcels: string[] = [];
    try {
      assignedParcels = JSON.parse(house.assignedParcels as string || '[]');
    } catch {
      assignedParcels = [];
    }

    // Check if already correct (1 or 0 parcels)
    if (assignedParcels.length <= 1) {
      results.alreadyOk++;
      console.log(`✅ House ${house.id.slice(0, 8)}... OK (${assignedParcels.length} parcelle)`);
      continue;
    }

    console.log(`🔧 House ${house.id.slice(0, 8)}... a ${assignedParcels.length} parcelles, correction...`);

    // Keep only the first parcel
    const parcelToKeep = assignedParcels[0];
    const parcelsToFree = assignedParcels.slice(1);

    try {
      // Free the extra parcels
      const freedCount = await prisma.parcel.updateMany({
        where: {
          id: { in: parcelsToFree },
          occupiedByBuildingId: house.id,
        },
        data: { occupiedByBuildingId: null },
      });

      // Update the house to only have 1 parcel
      await prisma.building.update({
        where: { id: house.id },
        data: { assignedParcels: JSON.stringify([parcelToKeep]) },
      });

      results.fixed++;
      results.totalParcelsFreed += parcelsToFree.length;
      console.log(`   → Corrigé ! ${assignedParcels.length} → 1 parcelle (${parcelsToFree.length} libérées)\n`);

    } catch (error) {
      results.errors++;
      console.log(`   → Erreur: ${error}\n`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RÉSULTATS');
  console.log('='.repeat(50));
  console.log(`Total maisons:     ${results.total}`);
  console.log(`✅ Déjà OK:        ${results.alreadyOk}`);
  console.log(`🔧 Corrigées:      ${results.fixed}`);
  console.log(`❌ Erreurs:        ${results.errors}`);
  console.log(`.Parcelles libérées: ${results.totalParcelsFreed}`);
  console.log('='.repeat(50));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
