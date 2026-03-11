// LandPulse Game Configuration - Modèle Économique Simplifié
// Devise: PulseBucks (PB) pour achats, Dollars ($) pour revenus, SOL pour retraits

export const GAME_CONFIG = {
  // Initial PulseBucks for new users
  INITIAL_PULSE_BUCKS: 100,

  // Initial Dollars earned for new users
  INITIAL_DOLLARS: 0,

  // Daily bonus in PulseBucks
  DAILY_BONUS: 10,
  DAILY_BONUS_COOLDOWN: 24 * 60 * 60 * 1000, // 24 hours in ms

  // Minimum withdrawal amount in dollars
  MIN_WITHDRAWAL_DOLLARS: 5,

  // Withdrawal settings - Retrait instantané en SOL
  WITHDRAWAL: {
    minDollars: 5,              // Minimum $5 pour retirer
    maxDailyDollars: 50,        // Maximum $50/jour
    maxWeeklyDollars: 200,      // Maximum $200/semaine
    feePercent: 2,              // 2% de frais de retrait
  },

  // Conversion loyer → PulseBucks
  DOLLARS_TO_PB_RATE: 40,  // $1 = 40 PB

  // Parcel settings - Virtual parcels on real world map
  PARCEL_SIZE_METERS: 100,
  PARCEL_BASE_PRICE_PB: 100, // Base price in PulseBucks

  // Parcel upgrade cost (any rarity to Legendary)
  PARCEL_UPGRADE_TO_LEGENDARY: 2500, // PB

  // Rarity levels with income per SECOND in dollars
  // Modèle économique: Les publicités sont le pilier central des revenus
  // ROI sans pub: ~50 ans | ROI avec 10-11 vidéos/jour: 7-8 ans
  RARITY_LEVELS: {
    common: {
      name: 'Commun',
      emoji: '🟢',
      probability: 0.50, // 50%
      dollarsPerSecond: 0.0000000011, // $/seconde
      incomeMultiplier: 1,
      color: '#10b981',
    },
    rare: {
      name: 'Rare',
      emoji: '🔵',
      probability: 0.30, // 30%
      dollarsPerSecond: 0.0000000016, // $/seconde (~1.45x Commun)
      incomeMultiplier: 1.45,
      color: '#3b82f6',
    },
    epic: {
      name: 'Épique',
      emoji: '🟣',
      probability: 0.15, // 15%
      dollarsPerSecond: 0.0000000022, // $/seconde (~2x Commun)
      incomeMultiplier: 2,
      color: '#8b5cf6',
    },
    legendary: {
      name: 'Légendaire',
      emoji: '🟠',
      probability: 0.05, // 5%
      dollarsPerSecond: 0.0000000044, // $/seconde (~4x Commun)
      incomeMultiplier: 4,
      color: '#f59e0b',
    },
  },

  // ============================================
  // MAISON - Seul bâtiment du jeu
  // Prix: 200 PB par maison
  // Le boost dépend du NOMBRE TOTAL de maisons
  // ============================================
  HOUSE: {
    name: 'Maison',
    emoji: '🏠',
    price: 200, // PulseBucks par maison
    description: 'Achetez des maisons pour augmenter votre boost sur les revenus de vos parcelles.',
  },

  // BUILDINGS - Maison occupe 1 parcelle
  BUILDINGS: {
    house: {
      name: 'Maison',
      emoji: '🏠',
      price: 200,
      dollarsPerDay: 0, // Pas de revenus fixes - boost only
      capacity: 1, // 1 maison = 1 parcelle occupée
      boostPercent: 5, // Boost de base (sera calculé dynamiquement)
      description: 'Boost les revenus de toutes vos parcelles (occupe 1 parcelle)',
      roiDays: 0, // Pas applicable - boost permanent
    },
  },

  // Fonction pour obtenir le boost basé sur le nombre de maisons
  // Retourne le pourcentage de boost
  getHouseBoost: (houseCount: number): number => {
    if (houseCount >= 101) return 25;   // 101+ maisons = 25%
    if (houseCount >= 61) return 20;    // 61-100 maisons = 20%
    if (houseCount >= 31) return 15;    // 31-60 maisons = 15%
    if (houseCount >= 11) return 10;    // 11-30 maisons = 10%
    if (houseCount >= 1) return 5;      // 1-10 maisons = 5%
    return 0;                           // 0 maison = 0%
  },

  // Fonction pour obtenir le titre basé sur le nombre de maisons
  getHouseTitle: (houseCount: number): { title: string; nextTitle: string | null; housesToNext: number } => {
    if (houseCount >= 101) {
      return { title: 'Magnat', nextTitle: null, housesToNext: 0 };
    }
    if (houseCount >= 61) {
      return { title: 'Baron Immobilier', nextTitle: 'Magnat', housesToNext: 101 - houseCount };
    }
    if (houseCount >= 31) {
      return { title: 'Grand Propriétaire', nextTitle: 'Baron Immobilier', housesToNext: 61 - houseCount };
    }
    if (houseCount >= 11) {
      return { title: 'Propriétaire', nextTitle: 'Grand Propriétaire', housesToNext: 31 - houseCount };
    }
    if (houseCount >= 1) {
      return { title: 'Petit Propriétaire', nextTitle: 'Propriétaire', housesToNext: 11 - houseCount };
    }
    return { title: 'Nouveau', nextTitle: 'Petit Propriétaire', housesToNext: 1 };
  },

  // Paliers de maisons pour l'affichage
  HOUSE_TIERS: [
    { minHouses: 1, maxHouses: 10, boost: 5, title: 'Petit Propriétaire' },
    { minHouses: 11, maxHouses: 30, boost: 10, title: 'Propriétaire' },
    { minHouses: 31, maxHouses: 60, boost: 15, title: 'Grand Propriétaire' },
    { minHouses: 61, maxHouses: 100, boost: 20, title: 'Baron Immobilier' },
    { minHouses: 101, maxHouses: Infinity, boost: 25, title: 'Magnat' },
  ],

  // PulseBucks purchase packages (prix en USDC)
  // Packs simplifiés sans bonus
  PB_PACKAGES: [
    { pb: 100, price: 4.99, bonus: 0, total: 100 },
    { pb: 315, price: 14.99, bonus: 0, total: 315 },
    { pb: 900, price: 39.99, bonus: 0, total: 900 },
    { pb: 2400, price: 99.99, bonus: 0, total: 2400 },
  ],

  // Vidéo gratuite pour 1 PB (toutes les 20 minutes)
  FREE_PB_VIDEO: {
    reward: 1,           // 1 PB par vidéo
    cooldown: 20,        // minutes entre chaque vidéo
    maxPerDay: 72,       // max 72 vidéos par jour (20min * 72 = 24h)
  },

  // Ad boost settings - Boost vidéo (pilier central des revenus)
  // Plus de parcelles = MOINS de boost (aide les petits joueurs)
  // ROI: sans pub ~50 ans | avec 10-11 vidéos/jour: 7-8 ans | avec 24 vidéos: 3.6 ans
  AD_BOOST: {
    duration: 60, // minutes (1 hour activation per ad)
    adDuration: 30, // seconds of ad to watch
    maxAdsPerDay: 24, // 24 vidéos par jour maximum
    // Vidéos à la suite selon l'abonnement
    maxAdsInRow: {
      free: 4,       // Gratuit: 4 vidéos à la suite (6 sessions pour 24h)
      premium: 8,    // Petit abonnement: 8 vidéos à la suite (3 sessions pour 24h)
      vip: 12,       // Grand abonnement: 12 vidéos à la suite (2 sessions pour 24h)
    },
    // Boost multipliers - Plus de parcelles = moins de boost
    getMultiplier: (parcelCount: number): number => {
      if (parcelCount <= 70) return 20;        // x20 for 1-70 parcels
      if (parcelCount <= 100) return 15;       // x15 for 71-100 parcels
      if (parcelCount <= 135) return 10;       // x10 for 101-135 parcels
      if (parcelCount <= 170) return 8;        // x8 for 136-170 parcels
      if (parcelCount <= 200) return 7;        // x7 for 171-200 parcels
      if (parcelCount <= 250) return 6;        // x6 for 201-250 parcels
      if (parcelCount <= 300) return 5;        // x5 for 251-300 parcels
      if (parcelCount <= 350) return 4;        // x4 for 301-350 parcels
      if (parcelCount <= 400) return 3;        // x3 for 351-400 parcels
      return 2;                                // x2 for 401+ parcels
    },
    getSuperBoostMultiplier: (parcelCount: number): number => {
      const normalMultiplier = parcelCount <= 70 ? 20 :
                               parcelCount <= 100 ? 15 :
                               parcelCount <= 135 ? 10 :
                               parcelCount <= 170 ? 8 :
                               parcelCount <= 200 ? 7 :
                               parcelCount <= 250 ? 6 :
                               parcelCount <= 300 ? 5 :
                               parcelCount <= 350 ? 4 :
                               parcelCount <= 400 ? 3 : 2;
      return Math.floor(normalMultiplier * 1.5);
    },
    getBoostTier: (parcelCount: number): { multiplier: number; superMultiplier: number; tier: string } => {
      if (parcelCount <= 70) return { multiplier: 20, superMultiplier: 30, tier: 'Diamond' };
      if (parcelCount <= 100) return { multiplier: 15, superMultiplier: 22, tier: 'Platinum' };
      if (parcelCount <= 135) return { multiplier: 10, superMultiplier: 15, tier: 'Gold' };
      if (parcelCount <= 170) return { multiplier: 8, superMultiplier: 12, tier: 'Silver' };
      if (parcelCount <= 200) return { multiplier: 7, superMultiplier: 10, tier: 'Bronze' };
      if (parcelCount <= 250) return { multiplier: 6, superMultiplier: 9, tier: 'Copper' };
      if (parcelCount <= 300) return { multiplier: 5, superMultiplier: 7, tier: 'Iron' };
      if (parcelCount <= 350) return { multiplier: 4, superMultiplier: 6, tier: 'Stone' };
      if (parcelCount <= 400) return { multiplier: 3, superMultiplier: 4, tier: 'Wood' };
      return { multiplier: 2, superMultiplier: 3, tier: 'Basic' };
    },
  },

  // Événements spéciaux - Boost 50% deux fois par mois
  SPECIAL_EVENTS: {
    boost50: {
      name: 'Boost 50% Extra',
      description: 'Tous les revenus sont multipliés par 1.5 pendant 24h',
      multiplier: 1.5,
      durationHours: 24,
      occurrencesPerMonth: 2,
      defaultDays: [1, 15],
    },
  },

  // Événements de jeu (4 mini-jeux pour événements 2h)
  GAME_EVENTS: {
    // JEU 1: Anneau Royal - Lancer d'anneaux sur des piquets colorés
    anneau_royal: {
      name: 'Anneau Royal',
      description: 'Duel de lancer d\'anneau 1v1 - Visez les dorés !',
      emoji: '🎯',
      duration: 60, // secondes par partie
      eventDuration: 2 * 60 * 60 * 1000, // 2 heures en ms
      colors: {
        gold: { points: 4, width: 10 },
        purple: { points: 3, width: 15 },
        blue: { points: 2, width: 25 },
        green: { points: 1, width: 50 },
      },
      rewards: {
        victories: [
          { count: 5, reward: 20 },
          { count: 10, reward: 50 },
          { count: 20, reward: 120 },
          { count: 30, reward: 200 },
          { count: 50, reward: 400 },
        ],
        ranking: [
          { rank: 1, reward: 500 },
          { rank: [2, 3], reward: 300 },
          { rank: [4, 10], reward: 150 },
          { rank: [11, 50], reward: 75 },
          { rank: [51, 100], reward: 40 },
        ],
      },
    },
    // JEU 2: Pêche aux Parcelles - Pêcher des parcelles dans un bassin
    peche_parcelles: {
      name: 'Pêche aux Parcelles',
      description: 'Pêchez des parcelles rares ! Plus c\'est rare, plus ça rapporte !',
      emoji: '🎣',
      duration: 45, // secondes par partie
      eventDuration: 2 * 60 * 60 * 1000,
      fishTypes: {
        legendary: { points: 100, probability: 0.05, emoji: '🟠', name: 'Légendaire' },
        epic: { points: 50, probability: 0.15, emoji: '🟣', name: 'Épique' },
        rare: { points: 25, probability: 0.30, emoji: '🔵', name: 'Rare' },
        common: { points: 10, probability: 0.50, emoji: '🟢', name: 'Commun' },
        empty: { points: 0, probability: 0.10, emoji: '💨', name: 'Raté' },
      },
      rewards: {
        victories: [
          { count: 5, reward: 20 },
          { count: 10, reward: 50 },
          { count: 20, reward: 120 },
          { count: 30, reward: 200 },
          { count: 50, reward: 400 },
        ],
        ranking: [
          { rank: 1, reward: 500 },
          { rank: [2, 3], reward: 300 },
          { rank: [4, 10], reward: 150 },
          { rank: [11, 50], reward: 75 },
          { rank: [51, 100], reward: 40 },
        ],
      },
    },
    // JEU 3: Roulette Terrestre - Roue de la fortune
    roulette_terrestre: {
      name: 'Roulette Terrestre',
      description: 'Tournez la roue et tentez de multiplier vos gains !',
      emoji: '🎡',
      duration: 30, // secondes par tour
      eventDuration: 2 * 60 * 60 * 1000,
      segments: [
        { multiplier: 0, label: 'PERDU', color: '#ef4444', probability: 0.15 },
        { multiplier: 1, label: 'x1', color: '#6b7280', probability: 0.25 },
        { multiplier: 2, label: 'x2', color: '#3b82f6', probability: 0.25 },
        { multiplier: 3, label: 'x3', color: '#8b5cf6', probability: 0.15 },
        { multiplier: 5, label: 'x5', color: '#f59e0b', probability: 0.10 },
        { multiplier: 10, label: 'x10', color: '#ef4444', probability: 0.07 },
        { multiplier: 25, label: 'x25', color: '#ec4899', probability: 0.025 },
        { multiplier: 50, label: 'x50', color: '#fbbf24', probability: 0.005 },
      ],
      baseBet: 10, // PB par tour
      rewards: {
        victories: [
          { count: 5, reward: 20 },
          { count: 10, reward: 50 },
          { count: 20, reward: 120 },
          { count: 30, reward: 200 },
          { count: 50, reward: 400 },
        ],
        ranking: [
          { rank: 1, reward: 500 },
          { rank: [2, 3], reward: 300 },
          { rank: [4, 10], reward: 150 },
          { rank: [11, 50], reward: 75 },
          { rank: [51, 100], reward: 40 },
        ],
      },
    },
    // JEU 4: Memory Parcelles - Jeu de memory
    memory_parcelles: {
      name: 'Memory Parcelles',
      description: 'Retrouvez les paires de parcelles identiques !',
      emoji: '🧠',
      duration: 90, // secondes par partie
      eventDuration: 2 * 60 * 60 * 1000,
      gridSize: 4, // 4x4 = 16 cartes = 8 paires
      cardTypes: [
        { id: 'legendary', emoji: '🟠', points: 50 },
        { id: 'epic', emoji: '🟣', points: 30 },
        { id: 'rare', emoji: '🔵', points: 20 },
        { id: 'common', emoji: '🟢', points: 10 },
        { id: 'house', emoji: '🏠', points: 15 },
        { id: 'coin', emoji: '💰', points: 25 },
        { id: 'star', emoji: '⭐', points: 40 },
        { id: 'diamond', emoji: '💎', points: 60 },
      ],
      pointsPerPair: 10,
      bonusForSpeed: true, // Bonus pour finir vite
      rewards: {
        victories: [
          { count: 5, reward: 20 },
          { count: 10, reward: 50 },
          { count: 20, reward: 120 },
          { count: 30, reward: 200 },
          { count: 50, reward: 400 },
        ],
        ranking: [
          { rank: 1, reward: 500 },
          { rank: [2, 3], reward: 300 },
          { rank: [4, 10], reward: 150 },
          { rank: [11, 50], reward: 75 },
          { rank: [51, 100], reward: 40 },
        ],
      },
    },
  },

  // Système de Parrainage
  REFERRAL: {
    rewardPB: 500,           // PB pour le parrain ET le filleul
    maxReferrals: 10,        // Max 10 filleuls par personne
    codeLength: 8,           // Longueur du code de parrainage
    commissionPercent: 5,    // 5% de commission à vie sur les achats des filleuls

    // Campagne "Top 100"
    campaign: {
      name: 'Top 100 Ambassadeurs',
      description: 'Les 100 premiers parrains avec 5 amis gagnent une parcelle Légendaire!',
      maxWinners: 100,
      referralsRequired: 5,
      reward: {
        type: 'legendary_parcel',
        value: 2500,
      },
    },
  },

  // Map settings
  MAP: {
    defaultCenter: [0, 20] as [number, number],
    defaultZoom: 2,
    minZoom: 1,
    maxZoom: 22,
    parcelSizeDegrees: 0.0000666,
  },

  // Event types
  EVENT_TYPES: {
    quiz: {
      name: 'Quiz Challenge',
      description: 'Answer questions to earn rewards',
      baseReward: 20,
    },
    prediction: {
      name: 'SOL Prediction',
      description: 'Predict SOL price movements',
      baseReward: 30,
    },
    challenge: {
      name: 'Daily Challenge',
      description: 'Complete special tasks',
      baseReward: 25,
    },
  },

  // Subscription settings
  SUBSCRIPTIONS: {
    events: {
      name: 'Événements+',
      price: 15,
      description: '+PB pendant les événements',
    },
    daily: {
      name: 'Quotidien+',
      price: 50,
      description: 'Récompenses quotidiennes boostées (cycle 90 jours)',
    },
  },

  // Daily rewards cycle (90 days) - en PulseBucks
  DAILY_REWARDS: {
    cycleDays: 90,
    free: {
      days1to29: 1,
      day30: 50,
      days31to59: 1,
      day60: 80,
      days61to89: 1,
      day90: 200,
      total: 417,
    },
    premium: {
      days1to29: 90,
      day30: 500,
      days31to59: 90,
      day60: 650,
      days61to89: 90,
      day90: 1250,
      total: 10230,
    },
  },
} as const;

// Helper function to get random rarity
export function getRandomRarity(): keyof typeof GAME_CONFIG.RARITY_LEVELS {
  const rand = Math.random();
  let cumulative = 0;

  for (const [rarity, config] of Object.entries(GAME_CONFIG.RARITY_LEVELS)) {
    cumulative += config.probability;
    if (rand <= cumulative) {
      return rarity as keyof typeof GAME_CONFIG.RARITY_LEVELS;
    }
  }

  return 'common';
}

// Get dollars per second for a rarity level
export function getDollarsPerSecond(rarity: keyof typeof GAME_CONFIG.RARITY_LEVELS): number {
  return GAME_CONFIG.RARITY_LEVELS[rarity].dollarsPerSecond;
}

// Get daily dollars for a rarity level
export function getDailyDollars(rarity: keyof typeof GAME_CONFIG.RARITY_LEVELS): number {
  return getDollarsPerSecond(rarity) * 86400; // seconds in a day
}

// Helper function to calculate parcel price based on location
export function calculateParcelPrice(lat: number, lng: number): number {
  return GAME_CONFIG.PARCEL_BASE_PRICE_PB;
}

// Generate parcel name from coordinates
export function generateParcelName(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const latStr = Math.abs(lat).toFixed(4);
  const lngStr = Math.abs(lng).toFixed(4);
  return `${latStr}°${latDir} ${lngStr}°${lngDir}`;
}

// Grid size constants
const REFERENCE_LAT = 45;

export function getGridCellCenter(lat: number, lng: number): { gridLat: number; gridLng: number } {
  const parcelSize = GAME_CONFIG.MAP.parcelSizeDegrees;
  const parcelSizeLng = parcelSize / Math.cos(REFERENCE_LAT * Math.PI / 180);

  const cornerLat = Math.floor(lat / parcelSize) * parcelSize;
  const cornerLng = Math.floor(lng / parcelSizeLng) * parcelSizeLng;

  const gridLat = cornerLat + parcelSize / 2;
  const gridLng = cornerLng + parcelSizeLng / 2;

  return { gridLat, gridLng };
}

// Format numbers as whole numbers with thousands separators (for PulseBucks)
// Example: 13100 → "13,100" instead of "13.1K"
export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  // Use Math.floor to always show whole numbers
  return Math.floor(num).toLocaleString('fr-FR');
}

// Format dollars to readable string - ALWAYS 12 decimals for counter animation
export function formatDollars(dollars: number | undefined | null): string {
  if (dollars === undefined || dollars === null || isNaN(dollars)) {
    return '$0.000000000000';
  }
  // Always 12 decimals so the counter is always animated
  return '$' + dollars.toFixed(12);
}

// Format dollars compact (for display in small spaces) - ALWAYS 12 decimals
export function formatDollarsCompact(dollars: number | undefined | null): string {
  if (dollars === undefined || dollars === null || isNaN(dollars)) {
    return '$0.000000000000';
  }
  // Always 12 decimals for consistency
  return '$' + dollars.toFixed(12);
}

// Format SOL amount
export function formatSOL(sol: number | undefined | null): string {
  if (sol === undefined || sol === null || isNaN(sol)) {
    return '0 SOL';
  }
  return sol.toFixed(6) + ' SOL';
}

// Get daily reward based on day number and premium status
export function getDailyReward(dayNumber: number, isPremium: boolean): number {
  const rewards = isPremium ? GAME_CONFIG.DAILY_REWARDS.premium : GAME_CONFIG.DAILY_REWARDS.free;
  const day = ((dayNumber - 1) % 90) + 1;

  if (day === 30) return isPremium ? rewards.day30 : GAME_CONFIG.DAILY_REWARDS.free.day30;
  if (day === 60) return isPremium ? rewards.day60 : GAME_CONFIG.DAILY_REWARDS.free.day60;
  if (day === 90) return isPremium ? rewards.day90 : GAME_CONFIG.DAILY_REWARDS.free.day90;
  if (day >= 1 && day <= 29) return isPremium ? rewards.days1to29 : GAME_CONFIG.DAILY_REWARDS.free.days1to29;
  if (day >= 31 && day <= 59) return isPremium ? rewards.days31to59 : GAME_CONFIG.DAILY_REWARDS.free.days31to59;
  if (day >= 61 && day <= 89) return isPremium ? rewards.days61to89 : GAME_CONFIG.DAILY_REWARDS.free.days61to89;

  return isPremium ? rewards.days1to29 : GAME_CONFIG.DAILY_REWARDS.free.days1to29;
}
