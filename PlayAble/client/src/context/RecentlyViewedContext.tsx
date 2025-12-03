
import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import authService from '../services/authService';
import { apiDelete } from '../utils/apiHelper';

/**
 * Data transfer object for recently viewed games.
 * @interface RecentlyViewedGameDto
 * @property {string} id - Game's MongoDB ObjectId
 * @property {string} title - Game title
 * @property {string} studio - Developer/studio name
 * @property {string} description - Game description
 * @property {string} thumbnailUrl - Cover image URL
 * @property {string[]} genres - Array of genre names
 * @property {string[]} accessibilityTags - Array of accessibility feature tags
 */
export interface RecentlyViewedGameDto {
  id: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
}

/**
 * Server shape for recently viewed list.
 * API response structure for recently viewed endpoint.
 * @interface RecentlyViewedResponse
 * @property {RecentlyViewedGameDto[]} games - Array of recently viewed games
 * @property {number} total - Total count of recently viewed games
 */
interface RecentlyViewedResponse {
  games: RecentlyViewedGameDto[];
  total: number;
}

/**
 * Context value type for recently viewed functionality.
 * @interface RecentlyViewedContextType
 * @property {RecentlyViewedGameDto[]} games - Current list of recently viewed games
 * @property {number} total - Total number of games in history
 * @property {boolean} isLoading - Loading state indicator
 * @property {function} fetchRecentlyViewed - Fetches recently viewed games from API
 * @property {function} clearRecentlyViewed - Clears all recently viewed history
 */
interface RecentlyViewedContextType {
  games: RecentlyViewedGameDto[];
  total: number;
  isLoading: boolean;
  fetchRecentlyViewed: () => Promise<void>;
  clearRecentlyViewed: () => Promise<void>;
}

/**
 * React Context for recently viewed games state and actions.
 * @private
 */
const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

/**
 * Custom hook to access recently viewed context.
 *
 * @returns {RecentlyViewedContextType} Recently viewed context value
 * @throws {Error} If used outside RecentlyViewedProvider
 *
 * @example
 * const { games, fetchRecentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
 */
export const useRecentlyViewed = () => {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  }
  return ctx;
};

/**
 * Props for RecentlyViewedProvider component.
 * @interface Props
 * @property {React.ReactNode} children - Child components
 */
interface Props {
  children: React.ReactNode;
}

/**
 * Provider component for recently viewed games functionality.
 *
 * @component
 * @param {Props} props - Component props
 * @returns {JSX.Element} Provider wrapping children
 *
 * @description
 * Manages state and API interactions for the recently viewed games feature.
 * Provides games list, total count, loading state, and actions to fetch/clear history.
 *
 * **Features:**
 * - Fetches recently viewed games from backend
 * - Clears viewing history with CSRF protection
 * - Only fetches when user is authenticated
 * - Updates state after successful operations
 *
 * @example
 * <RecentlyViewedProvider>
 *   <App />
 * </RecentlyViewedProvider>
 */
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
