-- Migration pour ajouter les colonnes username et avatarUrl
-- Exécutez ce script dans Supabase SQL Editor

-- Ajouter la colonne username
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Ajouter la colonne avatarUrl
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Créer l'index unique sur username (seulement si pas déjà existant)
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username") WHERE "username" IS NOT NULL;

-- Créer les tables manquantes
CREATE TABLE IF NOT EXISTS "GameEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "rewardPoolPB" INTEGER NOT NULL DEFAULT 0,
  "participants" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GameSession" (
  "id" TEXT NOT NULL,
  "eventId" TEXT,
  "player1Id" TEXT NOT NULL,
  "player2Id" TEXT,
  "player1Score" INTEGER NOT NULL DEFAULT 0,
  "player2Score" INTEGER NOT NULL DEFAULT 0,
  "winnerId" TEXT,
  "gameType" TEXT NOT NULL DEFAULT 'anneau_royal',
  "duration" INTEGER NOT NULL DEFAULT 60,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlayerEventStats" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "victories" INTEGER NOT NULL DEFAULT 0,
  "defeats" INTEGER NOT NULL DEFAULT 0,
  "draws" INTEGER NOT NULL DEFAULT 0,
  "totalScore" INTEGER NOT NULL DEFAULT 0,
  "totalGames" INTEGER NOT NULL DEFAULT 0,
  "rewardsClaimed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerEventStats_pkey" PRIMARY KEY ("id")
);

-- Ajouter la contrainte unique pour PlayerEventStats
ALTER TABLE "PlayerEventStats" DROP CONSTRAINT IF EXISTS "PlayerEventStats_userId_eventId_key";
ALTER TABLE "PlayerEventStats" ADD CONSTRAINT "PlayerEventStats_userId_eventId_key" UNIQUE ("userId", "eventId");

CREATE TABLE IF NOT EXISTS "AdWatch" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "adType" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "boostDuration" INTEGER NOT NULL,
  "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "AdWatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AppSettings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AppSettings" DROP CONSTRAINT IF EXISTS "AppSettings_key_key";
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_key_key" UNIQUE ("key");

-- Vérification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'User' AND column_name IN ('username', 'avatarUrl');
