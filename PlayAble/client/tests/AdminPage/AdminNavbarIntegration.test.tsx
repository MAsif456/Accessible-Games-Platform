import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../../src/components/ui/Navbar';

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

  const adminButton = screen.getByRole('menuitem', { name: /admin/i });
  expect(adminButton).toBeInTheDocument();

  fireEvent.click(adminButton);
  expect(handleNavigate).toHaveBeenCalledWith('/admin');
});
