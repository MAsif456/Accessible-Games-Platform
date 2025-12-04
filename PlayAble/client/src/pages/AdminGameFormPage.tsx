import React, { useEffect, useMemo, useState } from 'react';
import type { GameDto } from '../services/api';
import {
  AdminGameInput,
  createAdminGame,
  deleteAdminGame,
  getAdminGameById,
  updateAdminGame,
  getAdminGames,
} from '../services/gamesAdminService';

/**
 * Props for the AdminGameFormPage component.
 * @interface AdminGameFormPageProps
 * @property {'create' | 'edit'} mode - Form mode: create new game or edit existing
 * @property {string} [gameId] - MongoDB ObjectId of game to edit (required in edit mode)
 * @property {function} onNavigate - Navigation callback
 * @property {function} showPrompt - Toast/alert callback for user feedback
 */
interface AdminGameFormPageProps {
  mode: 'create' | 'edit';
  gameId?: string;
  onNavigate: (path: string) => void;
  showPrompt: (message: string, type?: 'success' | 'error') => void;
}

/**
 * Accessibility category types supported by the platform.
 * @typedef {'Visual' | 'Auditory' | 'Motor' | 'Cognitive' | 'Speech'} AccessibilityCategory
 */
type AccessibilityCategory = 'Visual' | 'Auditory' | 'Motor' | 'Cognitive' | 'Speech';

/**
 * Structure for accessibility feature tags with category classification.
 * @interface AccessibilityFeatureTag
 * @property {AccessibilityCategory} category - The accessibility category
 * @property {string} name - Human-readable feature name
 */
interface AccessibilityFeatureTag {
  category: AccessibilityCategory;
  name: string;
}

/**
 * Structure for store/platform links (currently not persisted to backend).
 * @interface StoreLink
 * @property {string} id - Unique identifier for the link
 * @property {string} platform - Platform name (e.g., 'Steam', 'PlayStation')
 * @property {string} url - Full URL to the game on that platform
 */
interface StoreLink {
  id: string;
  platform: string;
  url: string;
}

/**
 * Internal form state structure for managing game data before submission.
 * @interface FormState
 * @property {string} title - Game title
 * @property {string} studio - Developer/studio name
 * @property {string} shortDescription - Brief description for cards
 * @property {string} fullDescription - Complete game description
 * @property {string} thumbnailUrl - Cover image URL or data URI
 * @property {string} yearOfRelease - Year as string from select input
 * @property {string[]} genres - Selected genre names
 * @property {AccessibilityFeatureTag[]} accessibilityFeatures - Tagged accessibility features
 * @property {StoreLink[]} storeLinks - Platform store links (not currently saved)
 */
interface FormState {
  title: string;
  studio: string;
  shortDescription: string;
  fullDescription: string;
  thumbnailUrl: string;
  yearOfRelease: string; // 4-digit year string used to derive releaseYear
  genres: string[];
  accessibilityFeatures: AccessibilityFeatureTag[];
  storeLinks: StoreLink[];
}

const ALL_GENRES = [
  'Action',
  'Adventure',
  'RPG',
  'Strategy',
  'Platformer',
  'Puzzle',
  'Simulation',
  'Sports',
  'Racing',
  'Fighting',
  'Indie',
  'Multiplayer',
];

const ACCESSIBILITY_CATEGORIES: AccessibilityCategory[] = [
  'Visual',
  'Auditory',
  'Motor',
  'Cognitive',
  'Speech',
];

const STORE_PLATFORMS = ['Steam', 'Epic Games Store', 'Nintendo Switch', 'PlayStation', 'Xbox', 'Mobile'];

const initialFormState: FormState = {
  title: '',
  studio: '',
  shortDescription: '',
  fullDescription: '',
  thumbnailUrl: '',
  yearOfRelease: '',
  genres: [],
  accessibilityFeatures: [],
  storeLinks: [],
};

/**
 * Validation error structure mapping field names to error messages.
 * @interface ValidationErrors
 */
interface ValidationErrors {
  [key: string]: string | undefined;
}

/**
 * Admin game form component for creating and editing games.
 *
 * @component
 * @param {AdminGameFormPageProps} props - Component props
 * @returns {JSX.Element} The admin game form page
 *
 * @description
 * Comprehensive form for game management with the following features:
 * - Create or edit mode based on props
 * - Multi-step form with validation
 * - Genre and accessibility feature selection
 * - Image upload (converts to data URI)
 * - Store link management (UI only, not persisted)
 * - Duplicate title prevention
 * - Confirmation dialog for deletion
 *
 * **Validation Rules:**
 * - All basic fields (title, studio, descriptions, thumbnail, year) are required
 * - At least one genre must be selected
 * - At least two accessibility features must be added
 * - Title must be unique across all games
 *
 * **State Management:**
 * - Loads existing game data in edit mode
 * - Preserves original release year for seeded games to prevent data corruption
 * - Tracks loading, saving, and deleting states for UX feedback
 *
 * @example
 * <AdminGameFormPage
 *   mode="create"
 *   onNavigate={navigate}
 *   showPrompt={showToast}
 * />
 *
 * @example
 * <AdminGameFormPage
 *   mode="edit"
 *   gameId="507f1f77bcf86cd799439011"
 *   onNavigate={navigate}
 *   showPrompt={showToast}
 * />
 */
const AdminGameFormPage: React.FC<AdminGameFormPageProps> = ({ mode, gameId, onNavigate, showPrompt }) => {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [newFeatureCategory, setNewFeatureCategory] = useState<AccessibilityCategory | ''>('');
  const [newFeatureName, setNewFeatureName] = useState('');

  const [newStorePlatform, setNewStorePlatform] = useState('');
  const [newStoreUrl, setNewStoreUrl] = useState('');

  const [existingTitles, setExistingTitles] = useState<string[]>([]);
  const [originalTitle, setOriginalTitle] = useState<string | null>(null);

  const [originalReleaseYear, setOriginalReleaseYear] = useState<number | null>(null);

  // Helper: list of years for the dropdown (e.g., from 2000 to current year)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const years: string[] = [];
    for (let y = currentYear; y >= startYear; y -= 1) {
      years.push(String(y));
    }
    return years;
  }, []);

  // Load existing game in edit mode
  useEffect(() => {
    if (mode === 'edit' && gameId) {
      setLoading(true);
      let isMounted = true;
      
      getAdminGameById(gameId)
        .then(res => {
          if (!isMounted) return;
          
          const game: GameDto = res.game;

          const releaseDate = game.releaseYear ? String(game.releaseYear) : '';

          // Normalise genres from seeded data so they match the ALL_GENRES labels
          const normalizedGenres = (game.genres || [])
            .map(g => g.trim())
            .map(g => {
              const match = ALL_GENRES.find(canonical => canonical.toLowerCase() === g.toLowerCase());
              return match || g;
            });

          setForm(prev => ({
            ...prev,
            title: game.title,
            studio: game.studio,
            shortDescription: game.description,
            fullDescription: game.description,
            thumbnailUrl: game.thumbnailUrl,
            yearOfRelease: releaseDate,
            genres: normalizedGenres,
            accessibilityFeatures: (game.accessibilityTags || []).map(tag => {
              const [maybeCategory, ...rest] = tag.split(':');
              const trimmedCategory = (maybeCategory || '').trim();
              const restJoined = rest.join(':').trim();

              const category = (ACCESSIBILITY_CATEGORIES as string[]).includes(trimmedCategory)
                ? (trimmedCategory as AccessibilityCategory)
                : 'Visual';

              const name = restJoined || 'Accessibility feature';

              return {
                category,
                name,
              };
            }),
            storeLinks: [],
          }));
          setOriginalTitle(game.title);
          setOriginalReleaseYear(game.releaseYear ?? null);
        })
        .catch(err => {
          // Don't log errors if component is unmounted or if it's a 404 (game was likely deleted)
          if (!isMounted) return;
          
          // If it's a 404 or "not found", the game was likely deleted - navigate away silently
          const errorMessage = err.message || String(err);
          if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('Not Found')) {
            // Game was likely deleted, navigate away without showing error
            onNavigate('/admin');
            return;
          }
          
          console.error('Failed to load game', err);
          showPrompt('Unable to load game details.', 'error');
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
      
      return () => {
        isMounted = false;
      };
    }
  }, [mode, gameId, showPrompt, onNavigate]);

  useEffect(() => {
    // Load existing games once so we can prevent duplicate titles on create
    let isMounted = true;
    const gamesPromise = getAdminGames();
    if (gamesPromise && typeof gamesPromise.then === 'function') {
      gamesPromise
        .then(res => {
          if (isMounted) {
            setExistingTitles((res.games || []).map(g => g.title.toLowerCase().trim()));
          }
        })
        .catch(() => {
          // Non-blocking; we just skip duplicate-title check if this fails
          if (isMounted) {
            setExistingTitles([]);
          }
        });
    } else {
      // Fallback if getAdminGames doesn't return a promise (e.g., in tests)
      setExistingTitles([]);
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  const pageTitle = mode === 'create' ? 'Add New Game' : `Edit Game${form.title ? `: ${form.title}` : ''}`;
  const pageSubtitle =
    mode === 'create'
      ? 'Add a new game to the Accessible Games Platform with complete accessibility information.'
      : 'Update game details and accessibility information.';

  const handleBack = () => {
    onNavigate('/admin');
  };

  const updateField = (field: keyof FormState, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleGenre = (genre: string) => {
    setForm(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const groupedAccessibility = useMemo(() => {
    const groups: Record<AccessibilityCategory, AccessibilityFeatureTag[]> = {
      Visual: [],
      Auditory: [],
      Motor: [],
      Cognitive: [],
      Speech: [],
    };

    for (const feature of form.accessibilityFeatures) {
      groups[feature.category].push(feature);
    }
    return groups;
  }, [form.accessibilityFeatures]);

  const handleAddFeature = () => {
    if (!newFeatureCategory) return;

    const rawName = newFeatureName.trim();
    const name = rawName || 'Accessibility feature';

    // prevent adding the exact same feature twice (same category + name, case-insensitive)
    const exists = form.accessibilityFeatures.some(
      f => f.category === newFeatureCategory && f.name.toLowerCase() === name.toLowerCase(),
    );
    if (exists) {
      return;
    }

    setForm(prev => ({
      ...prev,
      accessibilityFeatures: [
        ...prev.accessibilityFeatures,
        { category: newFeatureCategory as AccessibilityCategory, name },
      ],
    }));
    setNewFeatureName('');
  };

  const handleRemoveFeature = (feature: AccessibilityFeatureTag) => {
    setForm(prev => ({
      ...prev,
      accessibilityFeatures: prev.accessibilityFeatures.filter(
        f => !(f.category === feature.category && f.name === feature.name),
      ),
    }));
  };

  const handleAddStoreLink = () => {
    if (!newStorePlatform || !newStoreUrl.trim()) return;
    setForm(prev => ({
      ...prev,
      storeLinks: [
        ...prev.storeLinks,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          platform: newStorePlatform,
          url: newStoreUrl.trim(),
        },
      ],
    }));
    setNewStoreUrl('');
  };

  const handleRemoveStoreLink = (id: string) => {
    setForm(prev => ({ ...prev, storeLinks: prev.storeLinks.filter(link => link.id !== id) }));
  };

  const validate = (): boolean => {
    const nextErrors: ValidationErrors = {};

    if (!form.title.trim()) nextErrors.title = 'Game title is required.';
    if (!form.studio.trim()) nextErrors.studio = 'Developer/Studio is required.';
    if (!form.shortDescription.trim()) nextErrors.shortDescription = 'Short description is required.';
    if (!form.fullDescription.trim()) nextErrors.fullDescription = 'Full description is required.';
    if (!form.thumbnailUrl.trim()) nextErrors.thumbnailUrl = 'Cover image URL is required.';
    if (!form.yearOfRelease) nextErrors.yearOfRelease = 'Please select a year of release.';
    if (form.genres.length === 0) nextErrors.genres = 'Please select at least one genre.';
    if (form.accessibilityFeatures.length < 2)
      nextErrors.accessibilityFeatures = 'Please add at least two accessibility features.';

    // Duplicate title check on create and edit (if title actually changes)
    if (existingTitles.length) {
      const normalizedTitle = form.title.toLowerCase().trim();
      const isSameAsOriginal =
        mode === 'edit' && originalTitle && normalizedTitle === originalTitle.toLowerCase().trim();

      if (!isSameAsOriginal && existingTitles.includes(normalizedTitle)) {
        nextErrors.title = 'A game with this title already exists. Please use a different title.';
      }
    }

    setErrors(nextErrors);

    const firstErrorKey = Object.keys(nextErrors)[0];
    if (firstErrorKey) {
      const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[data-error-key="${firstErrorKey}"]`,
      );
      if (el) {
        el.focus();
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const isEdit = mode === 'edit' && !!gameId;

      // For seeded games in edit mode, prevent changing the stored releaseYear by reusing originalReleaseYear
      const derivedYear = form.yearOfRelease ? parseInt(form.yearOfRelease, 10) : undefined;
      const releaseYear = isEdit && originalReleaseYear != null ? originalReleaseYear : derivedYear;

      const payload: AdminGameInput = {
        slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        title: form.title,
        studio: form.studio,
        description: form.fullDescription,
        thumbnailUrl: form.thumbnailUrl,
        genres: form.genres,
        accessibilityTags: form.accessibilityFeatures.map(f => `${f.category}: ${f.name}`),
        releaseYear,
      };

      if (mode === 'create') {
        await createAdminGame(payload);
        showPrompt('Game added successfully.', 'success');
      } else if (isEdit && gameId) {
        await updateAdminGame(gameId, payload);
        showPrompt('Game updated successfully.', 'success');
      }
      onNavigate('/admin');
    } catch (err) {
      console.error('Failed to save game', err);
      showPrompt('There was a problem saving the game. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!gameId) return;
    setDeleting(true);
    try {
      await deleteAdminGame(gameId);
      showPrompt('Game deleted successfully.', 'success');
      onNavigate('/admin');
    } catch (err) {
      console.error('Failed to delete game', err);
      showPrompt('There was a problem deleting the game. Please try again.', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const isEdit = mode === 'edit';

  return (
    <div className="admin-game-form-page">
      <div className="admin-game-form-page__inner">
        <button type="button" className="admin-game-form-page__back" onClick={handleBack}>
          <span
            aria-hidden="true"
            style={{ marginRight: '0.35rem', fontSize: '1.1rem', fontWeight: 700 }}
          >
            ⇠
          </span>
          <span>Back to Admin Dashboard</span>
        </button>

        <header className="admin-game-form-page__header">
          <h1 className="admin-game-form-page__title">{pageTitle}</h1>
          <p className="admin-game-form-page__subtitle">{pageSubtitle}</p>
        </header>

        {loading ? (
          <p className="admin-game-form-page__loading">Loading game details...</p>
        ) : (
          <form className="admin-game-form" onSubmit={handleSubmit} noValidate>
            <section className="admin-game-form__section" aria-labelledby="basic-info-heading">
              <header className="admin-game-form__section-header">
                <h2 id="basic-info-heading">Basic Information</h2>
                <p>Enter the core details about the game</p>
              </header>

              <div className="admin-game-form__field-grid">
                <div className="admin-game-form__field">
                  <label htmlFor="title">
                    Game Title <span className="admin-game-form__required">*</span>
                  </label>
                  <input
                    id="title"
                    data-error-key="title"
                    type="text"
                    value={form.title}
                    onChange={e => updateField('title', e.target.value)}
                  />
                  {errors.title && <p className="admin-game-form__error">{errors.title}</p>}
                </div>

                <div className="admin-game-form__field">
                  <label htmlFor="studio">
                    Developer/Studio <span className="admin-game-form__required">*</span>
                  </label>
                  <input
                    id="studio"
                    data-error-key="studio"
                    type="text"
                    value={form.studio}
                    onChange={e => updateField('studio', e.target.value)}
                  />
                  {errors.studio && <p className="admin-game-form__error">{errors.studio}</p>}
                </div>

                <div className="admin-game-form__field">
                  <label htmlFor="shortDescription">
                    Short Description <span className="admin-game-form__required">*</span>
                  </label>
                  <input
                    id="shortDescription"
                    data-error-key="shortDescription"
                    type="text"
                    placeholder="Brief one-line description (shown on game cards)"
                    value={form.shortDescription}
                    onChange={e => updateField('shortDescription', e.target.value)}
                  />
                  {errors.shortDescription && (
                    <p className="admin-game-form__error">{errors.shortDescription}</p>
                  )}
                </div>

                <div className="admin-game-form__field admin-game-form__field--full">
                  <label htmlFor="fullDescription">
                    Full Description <span className="admin-game-form__required">*</span>
                  </label>
                  <textarea
                    id="fullDescription"
                    data-error-key="fullDescription"
                    rows={4}
                    placeholder="Detailed game description (shown on game details page)"
                    value={form.fullDescription}
                    onChange={e => updateField('fullDescription', e.target.value)}
                  />
                  {errors.fullDescription && (
                    <p className="admin-game-form__error">{errors.fullDescription}</p>
                  )}
                </div>

                <div className="admin-game-form__field admin-game-form__field--full">
                  <label htmlFor="thumbnailUrl">
                    Cover Image URL <span className="admin-game-form__required">*</span>
                  </label>
                  <input
                    id="thumbnailUrl"
                    data-error-key="thumbnailUrl"
                    type="url"
                    placeholder="https://example.com/game-cover.jpg"
                    value={form.thumbnailUrl}
                    onChange={e => updateField('thumbnailUrl', e.target.value)}
                  />
                  <p className="admin-game-form__help">Enter a direct URL to the games cover image or upload one below.</p>

                  <div className="admin-game-form__upload-row">
                    <label className="admin-game-form__upload-label" htmlFor="thumbnailFile">
                      Or choose an image from your computer
                    </label>
                    <input
                      id="thumbnailFile"
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const result = ev.target?.result;
                          if (typeof result === 'string') {
                            updateField('thumbnailUrl', result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </div>

                  {form.thumbnailUrl && (
                    <div className="admin-game-form__image-preview-wrapper">
                      <img
                        src={form.thumbnailUrl}
                        alt="Game cover preview"
                        className="admin-game-form__image-preview"
                        onError={e => {
                          (e.target as HTMLImageElement).style.visibility = 'hidden';
                        }}
                      />
                    </div>
                  )}

                  {errors.thumbnailUrl && (
                    <p className="admin-game-form__error">{errors.thumbnailUrl}</p>
                  )}
                </div>

                <div className="admin-game-form__field">
                  <label htmlFor="yearOfRelease">
                    Year of Release <span className="admin-game-form__required">*</span>
                  </label>
                  <select
                    id="yearOfRelease"
                    data-error-key="yearOfRelease"
                    value={form.yearOfRelease}
                    onChange={e => updateField('yearOfRelease', e.target.value)}
                    disabled={mode === 'edit' && originalReleaseYear != null}
                  >
                    <option value="">Select year...</option>
                    {yearOptions.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  {errors.yearOfRelease && <p className="admin-game-form__error">{errors.yearOfRelease}</p>}
                </div>
              </div>
            </section>

            <section className="admin-game-form__section" aria-labelledby="genres-heading">
              <header className="admin-game-form__section-header">
                <h2 id="genres-heading">
                  Genres <span className="admin-game-form__required">*</span>
                </h2>
                <p>Select all applicable genres</p>
              </header>

              <div className="admin-game-form__genres-grid">
                {ALL_GENRES.map(genre => (
                  <label key={genre} className="admin-game-form__checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.genres.includes(genre)}
                      onChange={() => toggleGenre(genre)}
                    />
                    <span>{genre}</span>
                  </label>
                ))}
              </div>

              {errors.genres && <p className="admin-game-form__error">{errors.genres}</p>}

              {form.genres.length > 0 && (
                <div className="admin-game-form__genre-tags">
                  {form.genres.map(genre => (
                    <span key={genre} className="admin-game-form__tag">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-game-form__section" aria-labelledby="accessibility-heading">
              <header className="admin-game-form__section-header">
                <h2 id="accessibility-heading">
                  Accessibility Features <span className="admin-game-form__required">*</span>
                </h2>
                <p>Add accessibility features organized by category</p>
              </header>

              <div className="admin-game-form__accessibility-input-row">
                <div className="admin-game-form__field">
                  <label htmlFor="feature-category">Category</label>
                  <select
                    id="feature-category"
                    value={newFeatureCategory}
                    onChange={e => setNewFeatureCategory(e.target.value as AccessibilityCategory | '')}
                  >
                    <option value="">Select category</option>
                    {ACCESSIBILITY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-game-form__field admin-game-form__field--grow">
                  <label htmlFor="feature-name">Feature Name</label>
                  <input
                    id="feature-name"
                    type="text"
                    placeholder="e.g., Subtitles for all dialogue"
                    value={newFeatureName}
                    onChange={e => setNewFeatureName(e.target.value)}
                  />
                </div>

                <div className="admin-game-form__field admin-game-form__field--button">
                  <label className="admin-game-form__label-invisible" htmlFor="feature-add-button">
                    Add feature
                  </label>
                  <button
                    id="feature-add-button"
                    type="button"
                    className="admin-game-form__add-button"
                    onClick={handleAddFeature}
                  >
                    <span className="admin-game-form__add-button-icon">+</span>
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {form.accessibilityFeatures.length === 0 ? (
                <p className="admin-game-form__empty">
                  No accessibility features added yet. Please add at least two features.
                </p>
              ) : form.accessibilityFeatures.length === 1 ? (
                <p className="admin-game-form__empty">
                  1 accessibility feature added. Please add at least one more.
                </p>
              ) : (
                <div className="admin-game-form__accessibility-groups">
                  {ACCESSIBILITY_CATEGORIES.map(category => {
                    const features = groupedAccessibility[category];
                    if (!features.length) return null;
                    return (
                      <div key={category} className="admin-game-form__accessibility-group">
                        <h3>{category}</h3>
                        <div className="admin-game-form__tag-row">
                          {features.map(feature => (
                            <button
                              key={`${category}-${feature.name}`}
                              type="button"
                              className="admin-game-form__tag admin-game-form__tag--removable"
                              onClick={() => handleRemoveFeature(feature)}
                            >
                              {feature.name || 'Accessibility feature'}{' '}
                              <span aria-hidden="true">×</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {errors.accessibilityFeatures && (
                <p className="admin-game-form__error">{errors.accessibilityFeatures}</p>
              )}
            </section>

            <section className="admin-game-form__section" aria-labelledby="store-links-heading">
              <header className="admin-game-form__section-header">
                <h2 id="store-links-heading">App Store Links</h2>
                <p>Add links to purchase or download the game</p>
              </header>

              <div className="admin-game-form__accessibility-input-row">
                <div className="admin-game-form__field">
                  <label htmlFor="store-platform">Store Platform</label>
                  <select
                    id="store-platform"
                    value={newStorePlatform}
                    onChange={e => setNewStorePlatform(e.target.value)}
                  >
                    <option value="">Select platform</option>
                    {STORE_PLATFORMS.map(platform => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-game-form__field admin-game-form__field--grow">
                  <label htmlFor="store-url">Store URL</label>
                  <input
                    id="store-url"
                    type="url"
                    placeholder="https://store.steampowered.com/..."
                    value={newStoreUrl}
                    onChange={e => setNewStoreUrl(e.target.value)}
                  />
                </div>

                <div className="admin-game-form__field admin-game-form__field--button">
                  <label className="admin-game-form__label-invisible" htmlFor="store-add-button">
                    Add store link
                  </label>
                  <button
                    id="store-add-button"
                    type="button"
                    className="admin-game-form__add-button"
                    onClick={handleAddStoreLink}
                  >
                    <span className="admin-game-form__add-button-icon">+</span>
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {form.storeLinks.length > 0 && (
                <ul className="admin-game-form__store-list">
                  {form.storeLinks.map(link => (
                    <li key={link.id} className="admin-game-form__store-list-item">
                      <span className="admin-game-form__store-list-platform">{link.platform}</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-game-form__store-list-url"
                      >
                        {link.url}
                      </a>
                      <button
                        type="button"
                        className="admin-game-form__store-remove"
                        onClick={() => handleRemoveStoreLink(link.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <footer className="admin-game-form__footer">
              {isEdit && (
                <button
                  type="button"
                  className="admin-game-form__delete-button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleting}
                >
                  Delete Game
                </button>
              )}

              <div className="admin-game-form__footer-actions">
                <button
                  type="button"
                  className="admin-game-form__secondary-button"
                  onClick={handleBack}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-game-form__primary-button" disabled={saving}>
                  {isEdit ? 'Save Changes' : 'Add Game'}
                </button>
              </div>
            </footer>
          </form>
        )}

        {deleteConfirmOpen && isEdit && (
          <div className="admin-game-form__dialog-backdrop" role="presentation">
            <div
              className="admin-game-form__dialog admin-game-form__dialog--danger"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              aria-describedby="delete-dialog-description"
            >
              <h2 id="delete-dialog-title" className="admin-game-form__dialog-title">
                Are you absolutely sure?
              </h2>
              <p id="delete-dialog-description" className="admin-game-form__dialog-body">
                This action cannot be undone. This will permanently delete the game from the platform.
              </p>
              <div className="admin-game-form__dialog-actions admin-game-form__dialog-actions--right">
                <button
                  type="button"
                  className="admin-game-form__secondary-button admin-game-form__secondary-button--ghost"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-game-form__primary-button admin-game-form__primary-button--danger"
                  onClick={handleDeleteConfirmed}
                  disabled={deleting}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGameFormPage;
