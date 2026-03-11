// Famous Monuments for Auction System
// These parcels cannot be purchased normally and will be sold via auctions

export interface Monument {
  id: string;
  name: string;
  nameFr: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  emoji: string;
  rarity: 'mythic' | 'legendary'; // Mythic = highest tier, Legendary = second highest
  basePricePB: number; // Starting auction price
  description: string;
}

export const MONUMENTS: Monument[] = [
  // PHASE 1 - Mythic Monuments (most prestigious)
  {
    id: 'eiffel_tower',
    name: 'Eiffel Tower',
    nameFr: 'Tour Eiffel',
    city: 'Paris',
    country: 'France',
    lat: 48.8584,
    lng: 2.2945,
    emoji: '🗼',
    rarity: 'mythic',
    basePricePB: 10000,
    description: 'Le symbole de Paris, monument le plus visité de France.',
  },
  {
    id: 'statue_liberty',
    name: 'Statue of Liberty',
    nameFr: 'Statue de la Liberté',
    city: 'New York',
    country: 'USA',
    lat: 40.6892,
    lng: -74.0445,
    emoji: '🗽',
    rarity: 'mythic',
    basePricePB: 10000,
    description: 'Symbole de la liberté et de l\'amitié franco-américaine.',
  },
  {
    id: 'colosseum',
    name: 'Colosseum',
    nameFr: 'Colisée',
    city: 'Rome',
    country: 'Italy',
    lat: 41.8902,
    lng: 12.4922,
    emoji: '🏛️',
    rarity: 'mythic',
    basePricePB: 10000,
    description: 'Le plus grand amphithéâtre antique jamais construit.',
  },
  {
    id: 'taj_mahal',
    name: 'Taj Mahal',
    nameFr: 'Taj Mahal',
    city: 'Agra',
    country: 'India',
    lat: 27.1751,
    lng: 78.0421,
    emoji: '🕌',
    rarity: 'mythic',
    basePricePB: 10000,
    description: 'Mausolée d\'une beauté exceptionnelle, trésor de l\'Inde.',
  },
  {
    id: 'great_wall',
    name: 'Great Wall of China',
    nameFr: 'Grande Muraille de Chine',
    city: 'Beijing',
    country: 'China',
    lat: 40.4319,
    lng: 116.5704,
    emoji: '🏯',
    rarity: 'mythic',
    basePricePB: 10000,
    description: 'La plus grande structure jamais construite par l\'homme.',
  },

  // PHASE 1 - Legendary Monuments
  {
    id: 'machu_picchu',
    name: 'Machu Picchu',
    nameFr: 'Machu Picchu',
    city: 'Cusco',
    country: 'Peru',
    lat: -13.1631,
    lng: -72.5450,
    emoji: '🦙',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Cité perdue des Incas, merveille du monde moderne.',
  },
  {
    id: 'sydney_opera',
    name: 'Sydney Opera House',
    nameFr: 'Opéra de Sydney',
    city: 'Sydney',
    country: 'Australia',
    lat: -33.8568,
    lng: 151.2153,
    emoji: '🎭',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Chef-d\'œuvre architectural du XXe siècle.',
  },
  {
    id: 'christ_redeemer',
    name: 'Christ the Redeemer',
    nameFr: 'Christ Rédempteur',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    lat: -22.9519,
    lng: -43.2105,
    emoji: '✝️',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Symbole du Brésil, dominant la baie de Rio.',
  },
  {
    id: 'stonehenge',
    name: 'Stonehenge',
    nameFr: 'Stonehenge',
    city: 'Wiltshire',
    country: 'United Kingdom',
    lat: 51.1789,
    lng: -1.8262,
    emoji: '🪨',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Cercle de pierres préhistorique, mystère millénaire.',
  },
  {
    id: 'pyramids_giza',
    name: 'Great Pyramid of Giza',
    nameFr: 'Grande Pyramide de Gizeh',
    city: 'Giza',
    country: 'Egypt',
    lat: 29.9792,
    lng: 31.1342,
    emoji: '🔺',
    rarity: 'mythic',
    basePricePB: 10000,
    description: 'La seule des Sept Merveilles du monde antique encore debout.',
  },

  // PHASE 2 - More Legendary Monuments
  {
    id: 'big_ben',
    name: 'Big Ben',
    nameFr: 'Big Ben',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.5007,
    lng: -0.1246,
    emoji: '🕰️',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'L\'icône de Londres, symbole du Royaume-Uni.',
  },
  {
    id: 'sagrada_familia',
    name: 'Sagrada Família',
    nameFr: 'Sagrada Família',
    city: 'Barcelona',
    country: 'Spain',
    lat: 41.4036,
    lng: 2.1744,
    emoji: '⛪',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Chef-d\'œuvre de Gaudí, en construction depuis 1882.',
  },
  {
    id: 'mount_fuji',
    name: 'Mount Fuji',
    nameFr: 'Mont Fuji',
    city: 'Honshu',
    country: 'Japan',
    lat: 35.3606,
    lng: 138.7274,
    emoji: '🗻',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Le mont sacré du Japon, symbole de beauté naturelle.',
  },
  {
    id: 'notre_dame',
    name: 'Notre-Dame de Paris',
    nameFr: 'Notre-Dame de Paris',
    city: 'Paris',
    country: 'France',
    lat: 48.8530,
    lng: 2.3499,
    emoji: '🙏',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Cathédrale gothique légendaire, trésor de l\'histoire de France.',
  },
  {
    id: 'brandenburg_gate',
    name: 'Brandenburg Gate',
    nameFr: 'Porte de Brandebourg',
    city: 'Berlin',
    country: 'Germany',
    lat: 52.5163,
    lng: 13.3777,
    emoji: '🚪',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Symbole de la réunification allemande et de l\'Europe.',
  },

  // PHASE 3 - Additional Monuments
  {
    id: 'angkor_wat',
    name: 'Angkor Wat',
    nameFr: 'Angkor Wat',
    city: 'Siem Reap',
    country: 'Cambodia',
    lat: 13.4125,
    lng: 103.8670,
    emoji: '🛕',
    rarity: 'mythic',
    basePricePB: 10000,
    description: 'Le plus grand monument religieux du monde.',
  },
  {
    id: 'petra',
    name: 'Petra',
    nameFr: 'Petra',
    city: "Ma'an",
    country: 'Jordan',
    lat: 30.3285,
    lng: 35.4444,
    emoji: '🏜️',
    rarity: 'mythic',
    basePricePB: 10000,
    description: 'La ville rose des Nabatéens, trésor archéologique.',
  },
  {
    id: 'chichen_itza',
    name: 'Chichén Itzá',
    nameFr: 'Chichén Itzá',
    city: 'Yucatan',
    country: 'Mexico',
    lat: 20.6843,
    lng: -88.5678,
    emoji: '🏛️',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Pyramide maya, merveille du monde moderne.',
  },
  {
    id: 'golden_gate',
    name: 'Golden Gate Bridge',
    nameFr: 'Pont Golden Gate',
    city: 'San Francisco',
    country: 'USA',
    lat: 37.8199,
    lng: -122.4783,
    emoji: '🌉',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'Icône de San Francisco, prouesse d\'ingénierie.',
  },
  {
    id: 'burj_khalifa',
    name: 'Burj Khalifa',
    nameFr: 'Burj Khalifa',
    city: 'Dubai',
    country: 'UAE',
    lat: 25.1972,
    lng: 55.2744,
    emoji: '🏙️',
    rarity: 'legendary',
    basePricePB: 5000,
    description: 'La plus haute tour du monde, symbole de Dubaï.',
  },
];

// Helper to check if coordinates are a monument
export function isMonument(lat: number, lng: number): Monument | null {
  const tolerance = 0.001; // About 100m tolerance
  
  for (const monument of MONUMENTS) {
    const latDiff = Math.abs(lat - monument.lat);
    const lngDiff = Math.abs(lng - monument.lng);
    
    if (latDiff < tolerance && lngDiff < tolerance) {
      return monument;
    }
  }
  
  return null;
}

// Get monument by ID
export function getMonumentById(id: string): Monument | undefined {
  return MONUMENTS.find(m => m.id === id);
}

// Get monuments by rarity
export function getMonumentsByRarity(rarity: 'mythic' | 'legendary'): Monument[] {
  return MONUMENTS.filter(m => m.rarity === rarity);
}

// Income multiplier for monuments
export const MONUMENT_INCOME_MULTIPLIER = {
  mythic: 10, // x10 income
  legendary: 5, // x5 income
};
