import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import authService from '../services/authService';
import { apiPost, apiDelete } from '../utils/apiHelper';
import Modal from '../components/ui/Modal';

export interface FavouriteGameDto {
  id: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
}

/**
 * Paginated favourites payload from the API.
 */
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

/**
 * Hook to access the FavouritesContext.
 *
 * Throws an error if used outside of a FavouritesProvider.
 *
 * @returns The current FavouritesContext state.
 */
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

/**
 * Provides access to the user's favourite games and mutation functions.
 *
 * Must be wrapped around the App component.
 *
 * @example
 * <FavouritesProvider>
 *   <App />
 * </FavouritesProvider>
 */
export const FavouritesProvider: React.FC<Props> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState<FavouriteGameDto[]>([]);
  const [pagesCache, setPagesCache] = useState<Map<number, FavouriteGameDto[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize] = useState(9);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
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

  /**
   * Fetches the user's favourite games and updates the favourites state.
   *
   * If `force` is true, it will ignore the cache and fetch the latest data.
   *
   * If `force` is false and the requested page is in the cache, it will
   * return the cached data.
   *
   * @param {number} requestedPage The page number to fetch.
   * @param {Object} options Optional options object.
   * @param {boolean} options.force If true, ignore the cache and fetch the latest data.
   */
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

  /**
   * Adds a game to the user's favourites list, then refetches the current
   * page to keep pagination accurate.
   *
   * @param {string} gameId - the id of the game to favourite
   *
   * @returns {Promise<void>}
   */
  const addFavourite = async (gameId: string) => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    const token = authService.getToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await apiPost(`/api/favourites/${gameId}`, undefined, { headers });
    if (!res.ok && res.status !== 409) return;

    // Refetch current page to keep pagination accurate
    await fetchFavourites(lastPageRef.current, { force: true });
  };

  /**
   * Removes a game from the user's favourites list, then refetches the current
   * page to keep pagination accurate.
   *
   * @param {string} gameId - the id of the game to unfavourite
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Toggle the favourite status of a game.
   *
   * If the user is not signed in, show a modal and do nothing.
   * If the game is already favourited, remove it from the user's favourites list.
   * If the game is not favourited, add it to the user's favourites list.
   *
   * @param {string} gameId - the id of the game to toggle favourite status for
   *
   * @returns {Promise<void>}
   */
  const toggleFavourite = async (gameId: string) => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
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

  return (
    <>
      <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
      <Modal
        isOpen={showSignInModal}
        titleId="sign-in-required-title"
        descriptionId="sign-in-required-description"
        onClose={() => setShowSignInModal(false)}
      >
        <h2 id="sign-in-required-title" className="dialog__title">
          Sign In Required
        </h2>
        <p id="sign-in-required-description" className="dialog__message">
          Please sign in to favourite games.
        </p>
        <div className="dialog__actions">
          <button
            type="button"
            className="dialog__button dialog__button--secondary"
            onClick={() => setShowSignInModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dialog__button dialog__button--primary"
            onClick={() => {
              setShowSignInModal(false);
              navigate('/signin');
            }}
          >
            Sign In
          </button>
        </div>
      </Modal>
    </>
  );
};
