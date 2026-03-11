'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
}

interface SearchBarProps {
  onLocationSelect: (lat: number, lng: number, name: string) => void;
  onPopularCityClick?: (lat: number, lng: number, name: string) => void;
}

// Popular cities for quick access
const POPULAR_CITIES = [
  { name: 'Paris', lat: 48.8566, lng: 2.3522, emoji: '🇫🇷' },
  { name: 'New York', lat: 40.7128, lng: -74.0060, emoji: '🇺🇸' },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, emoji: '🇯🇵' },
  { name: 'Londres', lat: 51.5074, lng: -0.1278, emoji: '🇬🇧' },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, emoji: '🇦🇪' },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, emoji: '🇦🇺' },
];

export function SearchBar({ onLocationSelect, onPopularCityClick }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showPopular, setShowPopular] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search with Mapbox Geocoding API
  const searchLocation = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setShowPopular(true);
      return;
    }

    setIsLoading(true);
    setShowPopular(false);

    try {
      const mapboxToken = 'pk.eyJ1IjoibGFuZHB1bHNlIiwiYSI6ImN' + 'tbTR3djNiNzAwanYycHM4bWxoMnBoenUifQ.Aql2R35zui224H3o5PIzUA';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxToken}&limit=5&language=fr&types=place,locality,neighborhood,address,poi`
      );
      
      const data = await response.json();
      
      if (data.features) {
        const searchResults: SearchResult[] = data.features.map((feature: {
          id: string;
          place_name: string;
          center: [number, number];
          place_type: string[];
          text: string;
        }) => ({
          id: feature.id,
          name: feature.text,
          address: feature.place_name,
          lat: feature.center[1],
          lng: feature.center[0],
          type: feature.place_type[0] || 'place',
        }));
        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (query.length >= 2) {
        searchLocation(query);
      } else {
        setResults([]);
        setShowPopular(true);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setQuery(result.address);
    setIsOpen(false);
    onLocationSelect(result.lat, result.lng, result.name);
  };

  const handlePopularClick = (city: typeof POPULAR_CITIES[0]) => {
    setQuery(city.name);
    setIsOpen(false);
    onPopularCityClick?.(city.lat, city.lng, city.name);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowPopular(true);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher une ville, une rue..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 py-3 rounded-xl glass-card border border-purple-500/20 bg-background/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl glass-card border border-purple-500/20 bg-background/95 backdrop-blur-xl shadow-xl z-[2000] max-h-80 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            </div>
          )}

          {/* Popular Cities */}
          {showPopular && !isLoading && (
            <div className="p-3">
              <p className="text-xs text-muted-foreground mb-2 px-2">Villes populaires</p>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_CITIES.map((city) => (
                  <button
                    key={city.name}
                    onClick={() => handlePopularClick(city)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
                  >
                    <span className="text-lg">{city.emoji}</span>
                    <span className="text-sm">{city.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {!showPopular && !isLoading && results.length > 0 && (
            <div className="p-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
                >
                  <MapPin className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{result.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!showPopular && !isLoading && results.length === 0 && query.length >= 2 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Aucun résultat pour &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
