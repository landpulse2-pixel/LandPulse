# 🌍 LandPulse - Web3 Virtual Land Game

**Own virtual land. Earn passively. Build on Solana.**

---

## 📋 Description

LandPulse est un jeu Web3 play-to-earn sur Solana où les joueurs peuvent :
- Acheter des parcelles virtuelles sur une carte mondiale
- Construire des bâtiments pour générer des revenus passifs
- Participer à des événements communautaires
- Gagner des PulseBucks (monnaie interne)

---

## 🚀 Installation

### Prérequis
- Node.js 18+ ou Bun
- npm, yarn ou bun

### Étapes

1. **Extraire le fichier ZIP**
```bash
unzip landpulse-source-code.zip
cd landpulse
```

2. **Installer les dépendances**
```bash
npm install
# ou
bun install
```

3. **Configurer la base de données**
```bash
npx prisma db push
npx prisma generate
```

4. **Lancer l'application**
```bash
npm run dev
# ou
bun run dev
```

5. **Accéder à l'application**
```
http://localhost:3000
```

---

## 📁 Structure du Projet

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Page principale
│   ├── layout.tsx         # Layout global
│   ├── globals.css        # Styles globaux
│   └── api/               # API Routes
│       ├── user/          # Gestion utilisateurs
│       ├── parcels/       # Gestion parcelles
│       ├── buildings/     # Gestion bâtiments
│       └── events/        # Gestion événements
├── components/
│   ├── landpulse/         # Composants LandPulse
│   │   ├── Header.tsx
│   │   ├── WorldMap.tsx
│   │   ├── Dashboard.tsx
│   │   ├── EventsPanel.tsx
│   │   ├── WalletConnect.tsx
│   │   └── ...
│   └── ui/                # Composants shadcn/ui
├── lib/
│   ├── db.ts              # Prisma client
│   ├── game-config.ts     # Configuration du jeu
│   └── solana.ts          # Utilitaires Solana
├── store/
│   └── gameStore.ts       # State management (Zustand)
└── hooks/                 # React hooks
```

---

## 🎮 Fonctionnalités

### Système de Wallet
- Connexion Phantom Wallet
- Auto-reconnect
- Mode simulation si Phantom non installé

### Carte Mondiale
- Grille 20x20 (400 parcelles)
- 6 régions avec couleurs distinctes
- Achat de parcelles
- Visualisation des propriétés

### Bâtiments
| Bâtiment | Prix | Revenu/h |
|----------|------|----------|
| 🏠 House | 50 PB | 2 PB |
| 🌾 Farm | 100 PB | 5 PB |
| 🏭 Factory | 250 PB | 12 PB |
| 🏢 Tower | 500 PB | 25 PB |
| 🏰 Castle | 1000 PB | 60 PB |

### Événements
- Quiz
- Prédictions SOL
- Challenges quotidiens

### Économie
- **PulseBucks** : Monnaie interne non-tradable
- Bonus quotidien : +10 PB
- Solde initial : 100 PB

---

## 🛠️ Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State**: Zustand
- **Database**: Prisma + SQLite
- **Blockchain**: Solana Web3.js

---

## 📝 Scripts Disponibles

```bash
npm run dev      # Lancer le serveur de développement
npm run build    # Build de production
npm run lint     # Vérification ESLint
npm run db:push  # Mettre à jour la base de données
```

---

## 🔧 Configuration

### Variables d'environnement (.env)
```
DATABASE_URL="file:./db/custom.db"
```

---

## 📜 License

MIT

---

## 👥 Auteur

LandPulse Team - 2026
