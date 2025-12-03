import React, { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../../components/ui/Navbar';

jest.mock('../../src/context/AuthContext', () => {
  const actual = jest.requireActual('../../src/context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'admin-1', name: 'Admin', role: 'admin' },
      isAuthenticated: true,
      logout: jest.fn(),
    }),
    AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

jest.mock('../../src/context/VoiceAssistantContext', () => {
  const actual = jest.requireActual('../../src/context/VoiceAssistantContext');
  return {
    ...actual,
    useVoiceAssistant: () => ({
      microphoneActive: false,
      voiceInputEnabled: false,
      cancelListening: jest.fn(),
      forceStopRecognition: jest.fn(),
    }),
    VoiceAssistantProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

test('admin navbar button is visible and triggers admin navigation', () => {
  const handleNavigate = jest.fn();

  render(
    <Navbar
      role="admin"
      searchTerm=""
      onSearchChange={jest.fn()}
      onSearchSubmit={jest.fn()}
      onClearSearch={jest.fn()}
      currentPath="/browse"
      onNavigate={handleNavigate}
      onLogout={jest.fn()}
    />
  );

  const adminButton = screen.getByRole('button', { name: /admin/i });
  expect(adminButton).toBeInTheDocument();

  fireEvent.click(adminButton);
  expect(handleNavigate).toHaveBeenCalledWith('/admin');
});
