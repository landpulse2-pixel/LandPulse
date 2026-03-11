import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

// Custom storage that handles Phantom in-app browser and SSR
const createSafeStorage = (): StateStorage => ({
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(name);
    } catch (e) {
      console.log('localStorage.getItem not available:', e);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.log('localStorage.setItem not available:', e);
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch (e) {
      console.log('localStorage.removeItem not available:', e);
    }
  },
});

export type ParcelLevel = 'common' | 'rare' | 'epic' | 'legendary';
export type BuildingType = 'house';

export interface Parcel {
  id: string;
  lat: number;
  lng: number;
  level: ParcelLevel;
  price: number;
  name: string;
  dollarsPerSecond: number;
  improvementLevel: number;
  ownerId?: string;
  ownerWallet?: string;
  buildings?: Building[];
  isOwnedByUser?: boolean;
  isOwned?: boolean;
  occupiedByBuildingId?: string | null;
}

export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  price: number;
  boostPercent: number;
  parcelId?: string;
  ownerId: string;
  level: number;
  lastCollected: string;
  assignedParcels?: string[];
}

export interface User {
  id: string;
  walletAddress: string;
  username?: string; // Pseudo affiché publiquement
  avatarUrl?: string; // URL de l'avatar
  pulseBucks: number;
  dollars: number;
  totalDollarsEarned: number;
  lastDailyBonus?: string;
  totalEarned: number;
  totalSpent: number;
  boostEndTime?: string;
  lastDollarsUpdate?: string;
  totalAdsWatched?: number;
  adsWatchedToday?: number;
  subscription?: 'free' | 'premium' | 'vip';
  subscriptionEnd?: string;
  // Withdrawal
  totalWithdrawn?: number;
  withdrawnToday?: number;
  withdrawnThisWeek?: number;
  lastWithdrawalDate?: string;
  // Referral system
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  referralEarnings?: number;
  commissionEarnings?: number;
  campaignCompleted?: boolean;
  campaignRewardClaimed?: boolean;
}

interface GameState {
  user: User | null;
  isConnected: boolean;
  walletAddress: string | null;
  parcels: Parcel[];
  userParcels: Parcel[];
  selectedParcel: Parcel | null;
  buildings: Building[];
  isLoading: boolean;
  showParcelModal: boolean;
  showBuildingPanel: boolean;
  activeTab: 'map' | 'dashboard' | 'shop' | 'events';
  mapView: 'globe' | 'mapbox';
  mapCenter: [number, number];
  mapZoom: number;

  setUser: (user: User | null) => void;
  setConnected: (connected: boolean, address?: string | null) => void;
  setParcels: (parcels: Parcel[]) => void;
  setUserParcels: (parcels: Parcel[]) => void;
  setSelectedParcel: (parcel: Parcel | null) => void;
  setBuildings: (buildings: Building[]) => void;
  updatePulseBucks: (amount: number) => void;
  updateDollars: (amount: number) => void;
  setLoading: (loading: boolean) => void;
  setShowParcelModal: (show: boolean) => void;
  setShowBuildingPanel: (show: boolean) => void;
  setActiveTab: (tab: 'map' | 'dashboard' | 'shop' | 'events') => void;
  setMapView: (view: 'globe' | 'mapbox') => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  addParcel: (parcel: Parcel) => void;
  addBuilding: (building: Building) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  isConnected: false,
  walletAddress: null,
  parcels: [],
  userParcels: [],
  selectedParcel: null,
  buildings: [],
  isLoading: false,
  showParcelModal: false,
  showBuildingPanel: false,
  activeTab: 'map' as const,
  mapView: 'mapbox' as const,
  mapCenter: [0, 20] as [number, number],
  mapZoom: 2,
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user }),

      setConnected: (connected, address = null) => set({
        isConnected: connected,
        walletAddress: address
      }),

      setParcels: (parcels) => set({ parcels }),

      setUserParcels: (userParcels) => set({ userParcels }),

      setSelectedParcel: (selectedParcel) => set({ selectedParcel }),

      setBuildings: (buildings) => set({ buildings }),

      updatePulseBucks: (amount) => set((state) => ({
        user: state.user
          ? { ...state.user, pulseBucks: state.user.pulseBucks + amount }
          : null
      })),

      updateDollars: (amount) => set((state) => ({
        user: state.user
          ? {
              ...state.user,
              dollars: state.user.dollars + amount,
              totalDollarsEarned: state.user.totalDollarsEarned + (amount > 0 ? amount : 0)
            }
          : null
      })),

      setLoading: (isLoading) => set({ isLoading }),

      setShowParcelModal: (showParcelModal) => set({ showParcelModal }),

      setShowBuildingPanel: (showBuildingPanel) => set({ showBuildingPanel }),

      setActiveTab: (activeTab) => set({ activeTab }),

      setMapView: (mapView) => set({ mapView }),

      setMapCenter: (mapCenter) => set({ mapCenter }),

      setMapZoom: (mapZoom) => set({ mapZoom }),

      addParcel: (parcel) => set((state) => ({
        parcels: [...state.parcels, parcel],
        userParcels: parcel.isOwnedByUser
          ? [...state.userParcels, parcel]
          : state.userParcels
      })),

      addBuilding: (building) => set((state) => ({
        buildings: [...state.buildings, building]
      })),

      reset: () => set(initialState),
    }),
    {
      name: 'landpulse-storage',
      storage: createJSONStorage(() => createSafeStorage()),
      skipHydration: true, // Critical: prevent auto-hydration that causes SSR mismatch
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        isConnected: state.isConnected,
        mapView: state.mapView,
      }),
    }
  )
);
