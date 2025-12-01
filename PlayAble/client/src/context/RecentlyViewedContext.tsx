
import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import authService from '../services/authService';
import { apiDelete } from '../utils/apiHelper';

export interface RecentlyViewedGameDto {
  id: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
}

interface RecentlyViewedResponse {
  games: RecentlyViewedGameDto[];
  total: number;
}

interface RecentlyViewedContextType {
  games: RecentlyViewedGameDto[];
  total: number;
  isLoading: boolean;
  fetchRecentlyViewed: () => Promise<void>;
  clearRecentlyViewed: () => Promise<void>;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

export const useRecentlyViewed = () => {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  }
  return ctx;
};

interface Props {
  children: React.ReactNode;
}

export const RecentlyViewedProvider: React.FC<Props> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [games, setGames] = useState<RecentlyViewedGameDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecentlyViewed = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const token = authService.getToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/recently-viewed', { headers });
      if (!res.ok) throw new Error('Failed to load recently viewed games');
      const data: RecentlyViewedResponse = await res.json();
      setGames(data.games);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearRecentlyViewed = async () => {
    if (!isAuthenticated) return;
    const token = authService.getToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await apiDelete('/api/recently-viewed', { headers });
    if (!res.ok) {
      console.error('Failed to clear recently viewed history');
      return;
    }
    setGames([]);
    setTotal(0);
  };

  const value: RecentlyViewedContextType = {
    games,
    total,
    isLoading,
    fetchRecentlyViewed,
    clearRecentlyViewed,
  };

  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
};