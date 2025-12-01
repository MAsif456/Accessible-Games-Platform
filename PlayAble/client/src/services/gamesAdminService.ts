import { GameDto } from './api';
import authService from './authService';
import { apiPost, apiPut, apiDelete } from '../utils/apiHelper';

/**
 * Response structure for admin games listing endpoint.
 * @interface AdminGamesResponse
 * @property {GameDto[]} games - Array of game data transfer objects
 */
export interface AdminGamesResponse {
  games: GameDto[];
}

/**
 * Performs an authenticated fetch request with automatic JWT token injection.
 *
 * @param {RequestInfo} input - URL or Request object
 * @param {RequestInit} init - Fetch options
 * @returns {Promise<Response>} Fetch response
 *
 * @description
 * Wrapper around fetch that automatically includes:
 * - Content-Type: application/json header
 * - Authorization: Bearer <token> header if user is logged in
 *
 * @private
 */
async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const token = authService.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(input, { ...init, headers });
}

/**
 * Fetches all games for admin management.
 *
 * @returns {Promise<AdminGamesResponse>} List of all games
 * @throws {Error} If the request fails
 *
 * @description
 * Retrieves all games (including unpublished) for admin dashboard display.
 * Requires valid admin authentication token.
 *
 * @example
 * const { games } = await getAdminGames();
 */
export async function getAdminGames(): Promise<AdminGamesResponse> {
  const res = await authFetch('/api/admin/games');
  if (!res.ok) {
    throw new Error(`Failed to fetch admin games: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetches a single game by ID for admin editing.
 *
 * @param {string} id - MongoDB ObjectId of the game
 * @returns {Promise<{ game: GameDto }>} Game data wrapped in object
 * @throws {Error} If the request fails or game not found
 *
 * @description
 * Retrieves complete game details for editing in the admin form.
 * The ID is URL-encoded to handle special characters safely.
 *
 * @example
 * const { game } = await getAdminGameById('507f1f77bcf86cd799439011');
 */
export async function getAdminGameById(id: string): Promise<{ game: GameDto }> {
  const res = await authFetch(`/api/admin/games/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch game: ${res.status}`);
  }
  return res.json();
}

/**
 * Input type for creating or updating games via admin API.
 *
 * @typedef {Object} AdminGameInput
 * @description
 * Derived from GameDto but excludes auto-generated fields (id, _id)
 * and makes thumbnailUrl optional to support both URLs and data URIs.
 * Release year can be a number or empty string from form inputs.
 */
export type AdminGameInput = Omit<
  GameDto,
  'id' | '_id' | 'thumbnailUrl'
> & {
  thumbnailUrl?: string;
  releaseYear?: number | '';
};

/**
 * Creates a new game in the catalog.
 *
 * @param {AdminGameInput} input - Game data to create
 * @returns {Promise<{ game: GameDto }>} Created game data
 * @throws {Error} If the request fails or validation errors occur
 *
 * @description
 * Sends a POST request to create a new game. Automatically includes:
 * - CSRF protection via apiPost helper
 * - JWT authentication token
 * - Content-Type and other required headers
 *
 * @security Requires admin authentication. CSRF protected.
 *
 * @example
 * const { game } = await createAdminGame({
 *   slug: 'celeste',
 *   title: 'Celeste',
 *   studio: 'Maddy Makes Games',
 *   description: 'A platformer about climbing a mountain',
 *   genres: ['Platformer', 'Indie'],
 *   accessibilityTags: ['Motor: Assist Mode'],
 *   releaseYear: 2018
 * });
 */
export async function createAdminGame(input: AdminGameInput): Promise<{ game: GameDto }> {
  const token = authService.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await apiPost('/api/admin/games', input, { headers });
  if (!res.ok) {
    throw new Error(`Failed to create game: ${res.status}`);
  }
  return res.json();
}

/**
 * Updates an existing game with partial data.
 *
 * @param {string} id - MongoDB ObjectId of the game to update
 * @param {Partial<AdminGameInput>} input - Partial game data to update
 * @returns {Promise<{ game: GameDto }>} Updated game data
 * @throws {Error} If the request fails or game not found
 *
 * @description
 * Sends a PUT request to update specific fields of an existing game.
 * Only the provided fields are updated; others remain unchanged.
 * Automatically includes:
 * - CSRF protection via apiPut helper
 * - JWT authentication token
 *
 * @security Requires admin authentication. CSRF protected.
 *
 * @example
 * const { game } = await updateAdminGame('507f1f77bcf86cd799439011', {
 *   title: 'Updated Title',
 *   description: 'Updated description'
 * });
 */
export async function updateAdminGame(
  id: string,
  input: Partial<AdminGameInput>
): Promise<{ game: GameDto }> {
  const token = authService.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await apiPut(`/api/admin/games/${encodeURIComponent(id)}`, input, { headers });
  if (!res.ok) {
    throw new Error(`Failed to update game: ${res.status}`);
  }
  return res.json();
}

/**
 * Permanently deletes a game from the catalog.
 *
 * @param {string} id - MongoDB ObjectId of the game to delete
 * @returns {Promise<void>}
 * @throws {Error} If the request fails
 *
 * @description
 * Sends a DELETE request to permanently remove a game from the database.
 * This action cannot be undone. Automatically includes:
 * - CSRF protection via apiDelete helper
 * - JWT authentication token
 *
 * @security Requires admin authentication. CSRF protected.
 *
 * @example
 * await deleteAdminGame('507f1f77bcf86cd799439011');
 */
export async function deleteAdminGame(id: string): Promise<void> {
  const token = authService.getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await apiDelete(`/api/admin/games/${encodeURIComponent(id)}`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to delete game: ${res.status}`);
  }
}
