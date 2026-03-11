import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GAME_CONFIG } from '@/lib/game-config';

// POST /api/buildings/build - Build a new building
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, parcelId, buildingType } = body;

    if (!wallet || !buildingType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate building type
    const buildingConfig = GAME_CONFIG.BUILDINGS[buildingType as keyof typeof GAME_CONFIG.BUILDINGS];
    if (!buildingConfig) {
      return NextResponse.json({ error: 'Invalid building type' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has enough PulseBucks
    if (user.pulseBucks < buildingConfig.price) {
      return NextResponse.json({ 
        error: `PulseBucks insuffisants. Vous avez ${user.pulseBucks} PB, besoin de ${buildingConfig.price} PB` 
      }, { status: 400 });
    }

    // Get user's unoccupied parcels
    const freeParcels = await prisma.parcel.findMany({
      where: { 
        ownerId: user.id,
        occupiedByBuildingId: null,
      },
      orderBy: { createdAt: 'asc' }, // Plus anciennes d'abord
    });

    if (freeParcels.length === 0) {
      return NextResponse.json({ 
        error: 'Aucune parcelle disponible. Vous devez avoir au moins 1 parcelle libre pour construire une maison.' 
      }, { status: 400 });
    }

    // ============================================
    // MAISON - 1 maison = 1 parcelle occupée
    // ============================================
    if (buildingType === 'house') {
      // Choisir la parcelle à occuper
      // Si parcelId fourni, vérifier qu'elle appartient à l'utilisateur et est libre
      let parcelToOccupy = null;
      
      if (parcelId) {
        parcelToOccupy = freeParcels.find(p => p.id === parcelId);
        if (!parcelToOccupy) {
          return NextResponse.json({ 
            error: 'Parcelle non trouvée ou déjà occupée' 
          }, { status: 400 });
        }
      } else {
        // Prendre la première parcelle libre (plus ancienne)
        parcelToOccupy = freeParcels[0];
      }

      // Create house and occupy parcel
      const result = await prisma.$transaction(async (tx) => {
        // Create building
        const building = await tx.building.create({
          data: {
            type: buildingType,
            name: buildingConfig.name,
            price: buildingConfig.price,
            capacity: 1,
            boostPercent: buildingConfig.boostPercent,
            ownerId: user.id,
            assignedParcels: JSON.stringify([parcelToOccupy.id]),
          }
        });

        // Mark parcel as occupied
        await tx.parcel.update({
          where: { id: parcelToOccupy.id },
          data: { occupiedByBuildingId: building.id },
        });

        // Deduct PulseBucks
        await tx.user.update({
          where: { id: user.id },
          data: {
            pulseBucks: { decrement: buildingConfig.price },
            totalSpent: { increment: buildingConfig.price },
          }
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'purchase_building',
            amount: buildingConfig.price,
            metadata: JSON.stringify({
              buildingId: building.id,
              buildingType,
              parcelId: parcelToOccupy.id,
            }),
          }
        });

        return { building, parcel: parcelToOccupy };
      });

      // Get updated user data
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { pulseBucks: true },
      });

      return NextResponse.json({
        success: true,
        building: {
          id: result.building.id,
          type: result.building.type,
          name: result.building.name,
          price: result.building.price,
          boostPercent: result.building.boostPercent,
          occupiedParcel: {
            id: result.parcel.id,
            name: result.parcel.name,
            level: result.parcel.level,
          },
        },
        pulseBucks: updatedUser?.pulseBucks,
      });
    }

    // ============================================
    // AUTRES BÂTIMENTS - Si on en ajoute plus tard
    // ============================================
    return NextResponse.json({ error: 'Building type not implemented' }, { status: 400 });

  } catch (error) {
    console.error('Error building:', error);
    return NextResponse.json({ error: 'Failed to build' }, { status: 500 });
  }
}
