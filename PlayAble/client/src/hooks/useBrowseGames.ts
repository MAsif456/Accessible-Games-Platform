import { useEffect, useMemo, useReducer, useState } from 'react';
import { GameDto, GamesMetadata, getGames, getGamesMetadata } from '../services/api';

interface UseBrowseGamesParams {
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  onPageChange: (page: number) => void;
}

const ACCESSIBILITY_LIMIT = 5;

export const SORT_OPTIONS = [
  { id: 'title_asc', label: 'A-Z (Alphabetical)' },
  { id: 'title_desc', label: 'Z-A (Reverse alphabetical)' },
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
] as const;

export type SortOptionId = (typeof SORT_OPTIONS)[number]['id'];
const DEFAULT_SORT: SortOptionId = 'title_asc';

type FilterState = {
  genres: string[];
  accessibility: string[];
  sort: SortOptionId;
};

type BrowseFiltersState = {
  active: FilterState;
  draft: FilterState;
  isFiltersOpen: boolean;
};

type BrowseAction =
  | { type: 'openFilters' }
  | { type: 'closeFilters' }
  | { type: 'toggleDraftGenre'; genre: string }
  | { type: 'toggleDraftAccessibility'; tag: string }
  | { type: 'setDraftSort'; sort: SortOptionId }
  | { type: 'resetSort' }
  | { type: 'applyDraft' }
  | { type: 'resetAll' }
  | { type: 'removeActiveGenre'; genre: string }
  | { type: 'removeActiveAccessibility'; tag: string };

const initialFilterState: FilterState = {
  genres: [],
  accessibility: [],
  sort: DEFAULT_SORT,
};

const initialBrowseState: BrowseFiltersState = {
  active: initialFilterState,
  draft: initialFilterState,
  isFiltersOpen: false,
};

const metadataCache: { data?: GamesMetadata; promise?: Promise<GamesMetadata> } = {};

function cloneFilterState(state: FilterState): FilterState {
  return {
    genres: [...state.genres],
    accessibility: [...state.accessibility],
    sort: state.sort,
  };
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

function filtersReducer(state: BrowseFiltersState, action: BrowseAction): BrowseFiltersState {
  switch (action.type) {
    case 'openFilters':
      return {
        ...state,
        isFiltersOpen: true,
        draft: cloneFilterState(state.active),
      };
    case 'closeFilters':
      return { ...state, isFiltersOpen: false };
    case 'toggleDraftGenre':
      return {
        ...state,
        draft: { ...state.draft, genres: toggleValue(state.draft.genres, action.genre) },
      };
    case 'toggleDraftAccessibility':
      return {
        ...state,
        draft: {
          ...state.draft,
          accessibility: toggleValue(state.draft.accessibility, action.tag),
        },
      };
    case 'setDraftSort':
      return { ...state, draft: { ...state.draft, sort: action.sort } };
    case 'applyDraft':
      return {
        active: cloneFilterState(state.draft),
        draft: cloneFilterState(state.draft),
        isFiltersOpen: false,
      };
    case 'resetSort':
      return {
        ...state,
        active: { ...state.active, sort: DEFAULT_SORT },
        draft: { ...state.draft, sort: DEFAULT_SORT },
      };
    case 'resetAll':
      return {
        ...state,
        active: cloneFilterState(initialFilterState),
        draft: cloneFilterState(initialFilterState),
      };
    case 'removeActiveGenre': {
      const nextGenres = state.active.genres.filter(g => g !== action.genre);
      const nextDraftGenres = state.draft.genres.filter(g => g !== action.genre);
      return {
        ...state,
        active: { ...state.active, genres: nextGenres },
        draft: { ...state.draft, genres: nextDraftGenres },
      };
    }
    case 'removeActiveAccessibility': {
      const nextAccessibility = state.active.accessibility.filter(tag => tag !== action.tag);
      const nextDraftAccessibility = state.draft.accessibility.filter(tag => tag !== action.tag);
      return {
        ...state,
        active: { ...state.active, accessibility: nextAccessibility },
        draft: { ...state.draft, accessibility: nextDraftAccessibility },
      };
    }
    default:
      return state;
  }
}

function useGamesMetadata() {
  const [metadata, setMetadata] = useState<GamesMetadata>({
    genres: [],
    accessibilityTags: [],
    releaseYears: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (metadataCache.data) {
      setMetadata(metadataCache.data);
      setLoading(false);
      return;
    }

    const promise = metadataCache.promise || getGamesMetadata();
    metadataCache.promise = promise;

    promise
      .then(data => {
        metadataCache.data = data;
        if (!mounted) return;
        setMetadata(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        metadataCache.promise = undefined;
        setError('Failed to load filters');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { metadata, loading, error };
}

function useGamesQuery({
  currentPage,
  pageSize,
  searchTerm,
  filters,
}: {
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  filters: FilterState;
}) {
  const [state, setState] = useState<{
    games: GameDto[];
    totalPages: number;
    totalResults: number;
    loading: boolean;
    error: string | null;
  }>({
    games: [],
    totalPages: 1,
    totalResults: 0,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const trimmedSearch = searchTerm.trim();

    setState(prev => ({ ...prev, loading: true, error: null }));

    getGames(
      {
        page: currentPage,
        pageSize,
        search: trimmedSearch || undefined,
        genres: filters.genres.length ? filters.genres : undefined,
        tags: filters.accessibility.length ? filters.accessibility : undefined,
        sort: filters.sort,
      },
      { signal: controller.signal }
    )
      .then(({ games, totalPages, totalResults }) => {
        if (controller.signal.aborted) return;
        setState({ games, totalPages, totalResults, loading: false, error: null });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState(prev => ({ ...prev, loading: false, error: 'Failed to load games' }));
      });

    return () => controller.abort();
  }, [currentPage, pageSize, searchTerm, filters]);

  return state;
}

export function useBrowseGames({ currentPage, pageSize, searchTerm, onPageChange }: UseBrowseGamesParams) {
  const [filtersState, dispatch] = useReducer(filtersReducer, initialBrowseState);
  const { metadata, loading: metadataLoading } = useGamesMetadata();

  const { games, totalPages, totalResults, loading, error } = useGamesQuery({
    currentPage,
    pageSize,
    searchTerm,
    filters: filtersState.active,
  });

  const appliedFilterCount = useMemo(
    () =>
      filtersState.active.genres.length +
      filtersState.active.accessibility.length +
      (filtersState.active.sort === DEFAULT_SORT ? 0 : 1),
    [filtersState.active]
  );

  const hasActiveFilters = appliedFilterCount > 0;
  const hasNoResults = !loading && totalResults === 0;

  const openFilters = () => dispatch({ type: 'openFilters' });
  const closeFilters = () => dispatch({ type: 'closeFilters' });

  const toggleDraftGenre = (genre: string) => dispatch({ type: 'toggleDraftGenre', genre });

  const toggleDraftAccessibility = (tag: string) =>
    dispatch({ type: 'toggleDraftAccessibility', tag });

  const setDraftSort = (sort: SortOptionId) => dispatch({ type: 'setDraftSort', sort });

  const applyFilters = () => {
    dispatch({ type: 'applyDraft' });
    if (currentPage !== 1) {
      onPageChange(1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    dispatch({ type: 'resetAll' });
    if (currentPage !== 1) {
      onPageChange(1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeGenre = (genre: string) => {
    dispatch({ type: 'removeActiveGenre', genre });
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  const removeAccessibility = (tag: string) => {
    dispatch({ type: 'removeActiveAccessibility', tag });
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  const resetSort = () => {
    dispatch({ type: 'resetSort' });
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  return {
    games,
    totalPages,
    totalResults,
    loading,
    error,
    hasNoResults,
    filters: {
      active: filtersState.active,
      draft: filtersState.draft,
      isOpen: filtersState.isFiltersOpen,
      hasActiveFilters,
      appliedFilterCount,
      open: openFilters,
      close: closeFilters,
      apply: applyFilters,
      clear: clearFilters,
      removeGenre,
      removeAccessibility,
      resetSort,
      toggleDraftGenre,
      toggleDraftAccessibility,
      setDraftSort,
    },
    metadata: {
      genres: metadata.genres,
      accessibility: metadata.accessibilityTags,
      loading: metadataLoading,
    },
    sortOptions: SORT_OPTIONS,
    defaultSortId: DEFAULT_SORT,
    accessibilityLimit: ACCESSIBILITY_LIMIT,
  } as const;
}
