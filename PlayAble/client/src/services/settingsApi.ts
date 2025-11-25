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

export const settingsApi = {
  async getSettings(): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }
    return response.json();
  },

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error('Failed to update settings');
    }
    return response.json();
  },

  async resetSettings(): Promise<{ message: string; settings: UserSettings }> {
    const response = await fetch(`${API_BASE_URL}/settings/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to reset settings');
    }
    return response.json();
  },
};

