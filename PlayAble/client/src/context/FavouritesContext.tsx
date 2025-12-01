import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import authService from '../services/authService';
import { apiPost, apiDelete } from '../utils/apiHelper';

export interface FavouriteGameDto {
  id: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
}

interface PaginatedFavouriteGames {
  items: FavouriteGameDto[];
  total: number;
  page: number;
  pageSize: number;
}

interface FavouritesContextType {
  favourites: FavouriteGameDto[];
  favouriteIds: Set<string>;
  isLoading: boolean;
  pageSize: number;
  total: number;
  error: string | null;
  fetchFavourites: (page?: number, options?: { force?: boolean }) => Promise<void>;
  addFavourite: (gameId: string) => Promise<void>;
  removeFavourite: (gameId: string) => Promise<void>;
  toggleFavourite: (gameId: string) => Promise<void>;
  isFavourite: (gameId: string) => boolean;
}

const FavouritesContext = createContext<FavouritesContextType | undefined>(undefined);

export const useFavourites = () => {
  const ctx = useContext(FavouritesContext);
  if (!ctx) {
    throw new Error('useFavourites must be used within a FavouritesProvider');
  }
  return ctx;
};

// Lightweight hook
export const useFavouritesNav = () => {
  const { favouriteIds, toggleFavourite, isFavourite } = useFavourites();
  return { favouriteIds, toggleFavourite, isFavourite };
};

interface Props {
  children: React.ReactNode;
}

export const FavouritesProvider: React.FC<Props> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [favourites, setFavourites] = useState<FavouriteGameDto[]>([]);
  const [pagesCache, setPagesCache] = useState<Map<number, FavouriteGameDto[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize] = useState(9);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const lastPageRef = useRef(1);

  const favouriteIds = useMemo(() => new Set(favourites.map(f => f.id)), [favourites]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavourites(1, { force: true });
    } else {
      setFavourites([]);
      setPagesCache(new Map());
      setTotal(0);
      setError(null);
    }
  }, [isAuthenticated]);

  const fetchFavourites = async (requestedPage: number = 1, options?: { force?: boolean }) => {
    if (!isAuthenticated) return;
    const force = options?.force === true;

    // Increment a numeric request id to track the latest in-flight request
    requestRef.current += 1;
    const requestId = requestRef.current;

    setIsLoading(true);
    setError(null);

    if (!force && pagesCache.has(requestedPage)) {
      lastPageRef.current = requestedPage;
      setFavourites(pagesCache.get(requestedPage) || []);
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        page: String(requestedPage),
        pageSize: String(pageSize),
      });

      const authToken = authService.getToken();
      const headers: HeadersInit = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await fetch(`/api/favourites?${params.toString()}`, { headers });

      if (!res.ok) throw new Error('Failed to load favourites');
      const data: PaginatedFavouriteGames = await res.json();

      // Ignore if a newer request has been started
      if (requestRef.current !== requestId) return;

      const safeItems = Array.isArray(data.items) ? data.items : [];

      setFavourites(safeItems);
      setTotal(typeof data.total === 'number' ? data.total : safeItems.length);
      lastPageRef.current = requestedPage;
      setPagesCache(prev => {
        const copy = new Map(prev);
        copy.set(requestedPage, safeItems);
        return copy;
      });
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setError('Failed to load favourites');
    } finally {
      if (requestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const addFavourite = async (gameId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to favourite games.');
      return;
    }
    const token = authService.getToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await apiPost(`/api/favourites/${gameId}`, undefined, { headers });
    if (!res.ok && res.status !== 409) return;

    // Refetch current page to keep pagination accurate
    await fetchFavourites(lastPageRef.current, { force: true });
  };

  const removeFavourite = async (gameId: string) => {
    if (!isAuthenticated) return;
    const token = authService.getToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await apiDelete(`/api/favourites/${gameId}`, { headers });
    if (!res.ok) return;

    // Remove from all cached pages to avoid stale ids
    setPagesCache(prev => {
      const copy = new Map<number, FavouriteGameDto[]>();
      prev.forEach((items, pageKey) => {
        copy.set(
          pageKey,
          items.filter(item => item.id !== gameId),
        );
      });
      return copy;
    });
    setFavourites(prev => prev.filter(item => item.id !== gameId));
    setTotal(prev => Math.max(0, prev - 1));

    await fetchFavourites(lastPageRef.current, { force: true });
  };

  const toggleFavourite = async (gameId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to favourite games.');
      return;
    }
    if (favouriteIds.has(gameId)) {
      await removeFavourite(gameId);
    } else {
      await addFavourite(gameId);
    }
  };

  const isFavourite = (gameId: string) => favouriteIds.has(gameId);

  const value: FavouritesContextType = {
    favourites,
    favouriteIds,
    isLoading,
    pageSize,
    total,
    error,
    fetchFavourites,
    addFavourite,
    removeFavourite,
    toggleFavourite,
    isFavourite,
  };

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
};
