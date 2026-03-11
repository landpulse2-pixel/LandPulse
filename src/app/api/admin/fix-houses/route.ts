import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/admin/fix-houses - Fix houses to occupy only 1 parcel
export async function POST(request: NextRequest) {
  try {
    // Get all houses
    const houses = await prisma.building.findMany({
      where: { type: 'house' },
    });

    console.log(`Found ${houses.length} houses to check`);

    const results = {
      total: houses.length,
      fixed: 0,
      alreadyOk: 0,
      errors: 0,
      details: [] as string[],
    };

    for (const house of houses) {
      try {
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
          results.details.push(`House ${house.id}: OK (${assignedParcels.length} parcel)`);
          continue;
        }

        console.log(`House ${house.id} has ${assignedParcels.length} parcels, fixing...`);

        // Keep only the first parcel
        const parcelToKeep = assignedParcels[0];
        const parcelsToFree = assignedParcels.slice(1);

        // Free the extra parcels
        await prisma.parcel.updateMany({
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
        results.details.push(`House ${house.id}: Fixed (${assignedParcels.length} → 1 parcel, freed ${parcelsToFree.length})`);

      } catch (error) {
        results.errors++;
        results.details.push(`House ${house.id}: Error - ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration terminée: ${results.fixed} maisons corrigées, ${results.alreadyOk} déjà OK, ${results.errors} erreurs`,
      results,
    });

  } catch (error) {
    console.error('Error fixing houses:', error);
    return NextResponse.json({ error: 'Failed to fix houses' }, { status: 500 });
  }
}

// GET - Preview what will be fixed
export async function GET() {
  try {
    const houses = await prisma.building.findMany({
      where: { type: 'house' },
    });

    const preview = houses.map(house => {
      let assignedParcels: string[] = [];
      try {
        assignedParcels = JSON.parse(house.assignedParcels as string || '[]');
      } catch {
        assignedParcels = [];
      }

      return {
        id: house.id,
        ownerId: house.ownerId,
        parcelsCount: assignedParcels.length,
        needsFix: assignedParcels.length > 1,
      };
    });

    const toFix = preview.filter(h => h.needsFix);

    return NextResponse.json({
      total: houses.length,
      toFixCount: toFix.length,
      alreadyOkCount: preview.filter(h => !h.needsFix).length,
      toFix,
    });

  } catch (error) {
    console.error('Error previewing houses:', error);
    return NextResponse.json({ error: 'Failed to preview' }, { status: 500 });
  }
}
