# LandPulse - Installation

## Instructions d'installation

### 1. Prérequis
- Node.js 18+ ou Bun installé
- Un éditeur de code (VS Code recommandé)

### 2. Installation

```bash
# Extraire le fichier zip
# Ouvrir le dossier dans un terminal

# Installer les dépendances avec Bun (recommandé)
bun install

# OU avec npm
npm install
```

### 3. Configuration de la base de données

```bash
# Créer la base de données
bun run db:push

# OU avec npm
npm run db:push
```

### 4. Lancer l'application

```bash
# Mode développement
bun run dev

# OU avec npm
npm run dev
```

### 5. Ouvrir dans le navigateur
```
http://localhost:3000
```

## Fonctionnalités

- 🗺️ **Carte du monde interactive** (Leaflet + OpenStreetMap - GRATUIT)
- 🎰 **Système de loterie** pour la rareté des parcelles
- 💰 **Double monnaie** : PulseBucks (achat) + Points (revenus)
- 🏠 **4 types de bâtiments** avec ROI différents
- 👛 **Connexion wallet Phantom** (Solana)

## Rareté des parcelles

| Rareté | Probabilité | Multiplicateur |
|--------|-------------|----------------|
| 🟢 Commun | 50% | x1 |
| 🔵 Rare | 30% | x1.5 |
| 🟣 Épique | 15% | x2.5 |
| 🟠 Légendaire | 5% | x5 |

## Bâtiments

| Bâtiment | Prix | Points/jour | ROI |
|----------|------|-------------|-----|
| 🏠 Maison | 100 PB | 10,000 | 100 jours |
| 🏢 Bureau | 500 PB | 60,000 | 83 jours |
| 🏭 Usine | 2,000 PB | 300,000 | 66 jours |
| 🏰 Château | 10,000 PB | 1,330,000 | 75 jours |

## Dépannage

### La carte ne s'affiche pas ?
1. Vérifiez que vous avez accès à Internet
2. Les tuiles CartoDB sont gratuites mais nécessitent une connexion
3. Ouvrez la console du navigateur (F12) pour voir les erreurs

### Erreur de base de données ?
```bash
bun run db:push
```

### Port 3000 déjà utilisé ?
Changez le port dans la commande :
```bash
bun run dev -- -p 3001
```

## Technologies utilisées

- Next.js 15 (App Router)
- React 19
- Leaflet (carte gratuite)
- Prisma (base de données)
- SQLite
- Zustand (state management)
- shadcn/ui (composants)
- Tailwind CSS
- Solana (wallet)

## Support

Si vous rencontrez des problèmes, vérifiez :
1. La console du navigateur (F12)
2. Les logs du terminal
3. Que toutes les dépendances sont installées
