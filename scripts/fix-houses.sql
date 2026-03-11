-- ============================================
-- Script SQL pour corriger les maisons
-- 1 maison = 1 parcelle (au lieu de 5)
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor
-- ============================================

-- 1. Voir l'état actuel des maisons
SELECT
  b.id as house_id,
  b."ownerId",
  jsonb_array_length(b."assignedParcels"::jsonb) as parcel_count,
  b."assignedParcels"
FROM "Building" b
WHERE b.type = 'house'
ORDER BY parcel_count DESC;

-- ============================================
-- 2. CORRECTION - Décommentez pour exécuter
-- ============================================

/*
-- Libérer les parcelles excédentaires (garder seulement la première)
UPDATE "Parcel"
SET "occupiedByBuildingId" = NULL
WHERE "occupiedByBuildingId" IN (
  SELECT b.id
  FROM "Building" b
  WHERE b.type = 'house'
    AND jsonb_array_length(b."assignedParcels"::jsonb) > 1
)
AND id NOT IN (
  SELECT DISTINCT jsonb_array_element_text(b."assignedParcels"::jsonb, 0)
  FROM "Building" b
  WHERE b.type = 'house'
    AND jsonb_array_length(b."assignedParcels"::jsonb) > 1
);

-- Mettre à jour les maisons pour ne garder que la première parcelle
UPDATE "Building"
SET "assignedParcels" = jsonb_build_array(
  jsonb_array_element("assignedParcels"::jsonb, 0)
)::text
WHERE type = 'house'
  AND jsonb_array_length("assignedParcels"::jsonb) > 1;
*/

-- ============================================
-- 3. Vérifier après correction
-- ============================================
/*
SELECT
  b.id as house_id,
  jsonb_array_length(b."assignedParcels"::jsonb) as parcel_count,
  COUNT(p.id) as actual_parcels_occupied
FROM "Building" b
LEFT JOIN "Parcel" p ON p."occupiedByBuildingId" = b.id
WHERE b.type = 'house'
GROUP BY b.id
ORDER BY parcel_count DESC;
*/
