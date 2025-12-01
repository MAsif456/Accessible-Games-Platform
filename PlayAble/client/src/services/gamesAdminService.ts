import { GameDto } from './api';
import authService from './authService';
import { apiPost, apiPut, apiDelete } from '../utils/apiHelper';

export interface AdminGamesResponse {
  games: GameDto[];
}

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

export async function getAdminGames(): Promise<AdminGamesResponse> {
  const res = await authFetch('/api/admin/games');
  if (!res.ok) {
    throw new Error(`Failed to fetch admin games: ${res.status}`);
  }
  return res.json();
}

export async function getAdminGameById(id: string): Promise<{ game: GameDto }> {
  const res = await authFetch(`/api/admin/games/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch game: ${res.status}`);
  }
  return res.json();
}

export type AdminGameInput = Omit<
  GameDto,
  'id' | '_id' | 'thumbnailUrl'
> & {
  thumbnailUrl?: string;
  releaseYear?: number | '';
};

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
