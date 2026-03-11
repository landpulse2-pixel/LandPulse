import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tables to check - in dependency order
const TABLES_TO_CHECK = [
  'User',
  'Parcel',
  'Building',
  'Transaction',
  'Withdrawal',
  'AdWatch',
  'TokenPrice',
  'AppSettings',
  'CampaignStats',
  'Subscription',
  'Referral',
  'Monument',
  'MonumentBid',
  'GameEvent',
  'GameSession',
  'PlayerEventStats',
];

export async function GET() {
  try {
    const tableStatus = [];

    for (const tableName of TABLES_TO_CHECK) {
      try {
        // Check if table exists by trying to select from it
        const result = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = '${tableName}'
          );
        `);
        
        const exists = result && result[0] && result[0].exists;
        tableStatus.push({ table: tableName, exists: !!exists });
      } catch (e) {
        tableStatus.push({ table: tableName, exists: false });
      }
    }

    const missingCount = tableStatus.filter(t => !t.exists).length;

    return NextResponse.json({
      success: true,
      tables: tableStatus,
      message: missingCount > 0 
        ? `${missingCount} table(s) manquante(s)` 
        : 'Toutes les tables existent',
    });
  } catch (error) {
    console.error('Migration check error:', error);
    return NextResponse.json({
      success: false,
      tables: [],
      message: 'Erreur lors de la vérification: ' + (error as Error).message,
    }, { status: 500 });
  }
}
