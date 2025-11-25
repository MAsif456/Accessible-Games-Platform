const API_BASE_URL = 'http://localhost:5001/api';

export interface UserSettings {
  _id?: string;
  userId?: string;
  voiceInput: boolean;
  captions: boolean;
  microphoneActive: boolean;
  highContrastMode: boolean;
  highContrastTheme: 'tidepool' | 'sunset' | 'twilight' | 'midnight';
  reducedMotion: boolean;
  darkMode: boolean;
}

const userHeader = (userId: string) => ({
  'Content-Type': 'application/json',
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
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: userHeader(userId),
      body: JSON.stringify({ userId, ...settings }),
    });
    if (!response.ok) {
      throw new Error('Failed to update settings');
    }
    return response.json();
  },

  async resetSettings(
    userId: string
  ): Promise<{ message: string; settings: UserSettings }> {
    const response = await fetch(`${API_BASE_URL}/settings/reset`, {
      method: 'POST',
      headers: userHeader(userId),
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      throw new Error('Failed to reset settings');
    }
    return response.json();
  },
};

export default settingsApi;

