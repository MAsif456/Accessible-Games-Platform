import { apiPut, apiPost } from '../utils/apiHelper';

const API_BASE_URL = 'http://localhost:5001/api';

export interface UserSettings {
  _id?: string;
  userId?: string;
  voiceInput: boolean;
  captions: boolean;
  microphoneActive: boolean;
  highContrastMode: boolean;
  highContrastTheme: 'white' | 'black';
  reducedMotion: boolean;
  darkMode: boolean;
}

const userHeader = (userId: string) => ({
  'X-User-Id': userId,
});

export const settingsApi = {
  async getSettings(userId: string): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      headers: { 'X-User-Id': userId },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }
    return response.json();
  },

  async updateSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    const response = await apiPut(
      `${API_BASE_URL}/settings`,
      { userId, ...settings },
      { headers: userHeader(userId) }
    );
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to update settings: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    return data;
  },

  async resetSettings(
    userId: string
  ): Promise<{ message: string; settings: UserSettings }> {
    const response = await apiPost(
      `${API_BASE_URL}/settings/reset`,
      { userId },
      { headers: userHeader(userId) }
    );
    if (!response.ok) {
      throw new Error('Failed to reset settings');
    }
    return response.json();
  },
};

export default settingsApi;

