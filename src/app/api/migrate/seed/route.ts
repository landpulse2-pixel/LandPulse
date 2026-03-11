import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    const results = [];

    // Create SOL token price
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "TokenPrice" (id, token, "priceUsd", "change24h", "lastUpdated")
        VALUES (gen_random_uuid(), 'SOL', 150, 0, NOW())
        ON CONFLICT (token) DO UPDATE SET "priceUsd" = 150, "lastUpdated" = NOW()
      `);
      results.push('SOL price created/updated');
    } catch (e) {
      results.push('SOL price: ' + String(e).slice(0, 100));
    }

    // Create campaign stats
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "CampaignStats" (id, "completedCount", "updatedAt")
        VALUES (gen_random_uuid(), 0, NOW())
        ON CONFLICT DO NOTHING
      `);
      results.push('Campaign stats created');
    } catch (e) {
      results.push('Campaign stats: ' + String(e).slice(0, 100));
    }

    // Create app settings
    const settings = [
      { key: 'withdrawal_enabled', value: 'true' },
      { key: 'withdrawal_fee_percent', value: '2' },
      { key: 'min_withdrawal_usd', value: '0.01' },
      { key: 'daily_withdrawal_limit_usd', value: '10' },
    ];

    for (const setting of settings) {
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "AppSettings" (id, key, value, "updatedAt")
          VALUES (gen_random_uuid(), '${setting.key}', '${setting.value}', NOW())
          ON CONFLICT (key) DO UPDATE SET value = '${setting.value}', "updatedAt" = NOW()
        `);
        results.push(`Setting: ${setting.key}`);
      } catch (e) {
        results.push(`Setting ${setting.key}: ` + String(e).slice(0, 50));
      }
    }

    // Create some monuments
    const monuments = [
      {
        monumentId: 'eiffel_tower',
        lat: 48.8584,
        lng: 2.2945,
        name: 'Tour Eiffel',
        city: 'Paris',
        country: 'France',
        emoji: '🗼',
        rarity: 'mythic',
        incomeMultiplier: 10,
        basePricePB: 10000
      },
      {
        monumentId: 'statue_liberty',
        lat: 40.6892,
        lng: -74.0445,
        name: 'Statue de la Liberté',
        city: 'New York',
        country: 'USA',
        emoji: '🗽',
        rarity: 'mythic',
        incomeMultiplier: 10,
        basePricePB: 10000
      },
      {
        monumentId: 'colosseum',
        lat: 41.8902,
        lng: 12.4922,
        name: 'Colisée',
        city: 'Rome',
        country: 'Italie',
        emoji: '🏛️',
        rarity: 'legendary',
        incomeMultiplier: 5,
        basePricePB: 5000
      },
    ];

    for (const m of monuments) {
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "Monument" (id, "monumentId", lat, lng, name, city, country, emoji, rarity, "incomeMultiplier", status, "basePricePB", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), '${m.monumentId}', ${m.lat}, ${m.lng}, '${m.name}', '${m.city}', '${m.country}', '${m.emoji}', '${m.rarity}', ${m.incomeMultiplier}, 'locked', ${m.basePricePB}, NOW(), NOW())
          ON CONFLICT ("monumentId") DO NOTHING
        `);
        results.push(`Monument: ${m.name}`);
      } catch (e) {
        results.push(`Monument ${m.name}: ` + String(e).slice(0, 50));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Données initiales créées avec succès !',
      results,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'initialisation: ' + (error as Error).message,
    }, { status: 500 });
  }
}
