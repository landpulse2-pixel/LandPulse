import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const wallet = formData.get('wallet') as string;

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet requis' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 2MB)' }, { status: 400 });
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Type de fichier invalide' }, { status: 400 });
    }

    // Créer le dossier uploads/avatars s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await mkdir(uploadDir, { recursive: true });

    // Générer un nom de fichier unique
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `${wallet.slice(0, 8)}_${Date.now()}.${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL publique
    const avatarUrl = `/uploads/avatars/${fileName}`;

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { walletAddress: wallet },
      data: { avatarUrl: avatarUrl },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: avatarUrl,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
