import React, { createContext, useContext, useState } from 'react';
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
  page: number;
  pageSize: number;
  total: number;
  fetchFavourites: (page?: number) => Promise<void>;
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
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [total, setTotal] = useState(0);

  const syncFromResult = (result: PaginatedFavouriteGames) => {
    setFavourites(result.items);
    setTotal(result.total);
    setPage(result.page);

    const pageIds = result.items.map(g => g.id);
    setFavouriteIds(prev => {
      const next = new Set(prev);
      if (result.total === 0) {
        next.clear();
        return next;
      }
      for (const id of pageIds) {
        next.add(id);
      }
      return next;
    });
  };

  const fetchFavourites = async (requestedPage: number = 1) => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(requestedPage),
        pageSize: String(pageSize),
      });
      const token = authService.getToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/favourites?${params.toString()}`, { headers });

      if (!res.ok) throw new Error('Failed to load favourites');
      const data: PaginatedFavouriteGames = await res.json();
      syncFromResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
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

    setFavouriteIds(prev => {
      const copy = new Set(prev);
      copy.add(gameId);
      return copy;
    });

    await fetchFavourites(page);
  };

  const removeFavourite = async (gameId: string) => {
    if (!isAuthenticated) return;
    const token = authService.getToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await apiDelete(`/api/favourites/${gameId}`, { headers });
    if (!res.ok) return;

    setFavouriteIds(prev => {
      const copy = new Set(prev);
      copy.delete(gameId);
      return copy;
    });

    await fetchFavourites(page);
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
    page,
    pageSize,
    total,
    fetchFavourites,
    addFavourite,
    removeFavourite,
    toggleFavourite,
    isFavourite,
  };

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
};
