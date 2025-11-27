import { useEffect, useMemo, useState } from 'react';
import { GameDto, getGames } from '../services/api';

interface UseBrowseGamesParams {
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  onPageChange: (page: number) => void;
}

export function useBrowseGames({ currentPage, pageSize, searchTerm, onPageChange }: UseBrowseGamesParams) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedAccessibility, setSelectedAccessibility] = useState<string[]>([]);
  const [releaseYear, setReleaseYear] = useState<string>('Any Year');
  const [sortBy, setSortBy] = useState<string>('A-Z');

  const [tempSelectedGenres, setTempSelectedGenres] = useState<string[]>([]);
  const [tempSelectedAccessibility, setTempSelectedAccessibility] = useState<string[]>([]);
  const [tempReleaseYear, setTempReleaseYear] = useState<string>('Any Year');
  const [tempSortBy, setTempSortBy] = useState<string>('A-Z');
  const [showAllGenres, setShowAllGenres] = useState(false);

  const [games, setGames] = useState<GameDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allGamesForFilters, setAllGamesForFilters] = useState<GameDto[]>([]);

  const effectiveSearchTerm = searchTerm;

  const apiSort = useMemo(() => {
    switch (sortBy) {
      case 'Newest':
        return 'newest';
      case 'Oldest':
        return 'oldest';
      case 'A-Z':
      default:
        return 'title_asc';
    }
  }, [sortBy]);

  const allGenres = useMemo(
    () => Array.from(new Set(allGamesForFilters.flatMap(g => g.genres))).sort(),
    [allGamesForFilters],
  );

  const allAccessibility = useMemo(
    () => Array.from(new Set(allGamesForFilters.flatMap(g => g.accessibilityTags))).sort(),
    [allGamesForFilters],
  );

  const toggleSelection = (value: string, current: string[], setter: (val: string[]) => void) => {
    setter(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  useEffect(() => {
    let isCancelled = false;
    async function loadGames() {
      try {
        setLoading(true);
        setError(null);
        const { games, totalPages, totalResults } = await getGames({
          page: currentPage,
          pageSize,
          search: effectiveSearchTerm || undefined,
          genres: selectedGenres.length ? selectedGenres : undefined,
          tags: selectedAccessibility.length ? selectedAccessibility : undefined,
          sort: apiSort,
        });
        if (!isCancelled) {
          setGames(games);
          setTotalPages(totalPages);
          setTotalResults(totalResults);
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Failed to load games');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadGames();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, pageSize, effectiveSearchTerm, selectedGenres, selectedAccessibility, apiSort]);

  useEffect(() => {
    let isCancelled = false;
    async function loadAllGamesForFilters() {
      try {
        const { games } = await getGames({ page: 1, pageSize: 1000, sort: 'title_asc' });
        if (!isCancelled) {
          setAllGamesForFilters(games);
        }
      } catch {}
    }
    loadAllGamesForFilters();
    return () => {
      isCancelled = true;
    };
  }, []);

  const appliedFilterCount =
    selectedGenres.length +
    selectedAccessibility.length +
    (releaseYear === 'Any Year' ? 0 : 1) +
    (sortBy === 'A-Z' ? 0 : 1);

  const hasNoResults = !loading && totalResults === 0;
  const hasActiveFilters = appliedFilterCount > 0;

  const handleApplyFilters = () => {
    setSelectedGenres(tempSelectedGenres);
    setSelectedAccessibility(tempSelectedAccessibility);
    setReleaseYear(tempReleaseYear);
    setSortBy(tempSortBy);
    setIsFiltersOpen(false);
    if (currentPage !== 1) {
      onPageChange(1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearAll = () => {
    setTempSelectedGenres([]);
    setTempSelectedAccessibility([]);
    setTempReleaseYear('Any Year');
    setTempSortBy('A-Z');
    setSelectedGenres([]);
    setSelectedAccessibility([]);
    setReleaseYear('Any Year');
    setSortBy('A-Z');
    if (currentPage !== 1) {
      onPageChange(1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeAccessibility = (tag: string) => {
    setSelectedAccessibility(prev => prev.filter(t => t !== tag));
  };

  return {
    games,
    totalPages,
    totalResults,
    loading,
    error,
    isFiltersOpen,
    setIsFiltersOpen,
    selectedGenres,
    setSelectedGenres,
    selectedAccessibility,
    setSelectedAccessibility,
    releaseYear,
    setReleaseYear,
    sortBy,
    setSortBy,
    tempSelectedGenres,
    setTempSelectedGenres,
    tempSelectedAccessibility,
    setTempSelectedAccessibility,
    tempReleaseYear,
    setTempReleaseYear,
    tempSortBy,
    setTempSortBy,
    showAllGenres,
    setShowAllGenres,
    allGenres,
    allAccessibility,
    appliedFilterCount,
    hasActiveFilters,
    hasNoResults,
    handleApplyFilters,
    handleClearAll,
    removeAccessibility,
    toggleSelection,
  } as const;
}
