import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, username } = body;

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet requis' }, { status: 400 });
    }

    if (!username || username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'Pseudo invalide (3-20 caractères)' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Pseudo invalide (lettres, chiffres, _ uniquement)' }, { status: 400 });
    }

    // Vérifier si le pseudo est déjà pris
    const existingUser = await prisma.user.findFirst({
      where: {
        username: username,
        walletAddress: { not: wallet },
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Ce pseudo est déjà utilisé' }, { status: 400 });
    }

    // Mettre à jour le pseudo
    const updatedUser = await prisma.user.update({
      where: { walletAddress: wallet },
      data: { username: username },
    });

    return NextResponse.json({
      success: true,
      username: updatedUser.username,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
