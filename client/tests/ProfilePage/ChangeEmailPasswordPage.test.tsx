import { render, screen, fireEvent } from '@testing-library/react';
import ChangeEmailPasswordPage from '../../src/pages/ChangeEmailPasswordPage';
import { AuthProvider } from '../../src/context/AuthContext';

const renderChangePage = (onNavigate = jest.fn()) => {
  return render(
    <AuthProvider>
      <ChangeEmailPasswordPage onNavigate={onNavigate} />
    </AuthProvider>
  );
};

// Password validation acceptance criteria

test('requires new password to be at least 8 characters and contain a number', async () => {
  renderChangePage();

  fireEvent.change(screen.getByLabelText('New Password'), {
    target: { value: 'short' },
  });
  fireEvent.change(screen.getByLabelText('Confirm New Password'), {
    target: { value: 'short' },
  });
  fireEvent.submit(screen.getByRole('button', { name: /change password/i }));

  expect(await screen.findByText(/at least 8 characters long/i)).toBeInTheDocument();
});


test('Back to Profile navigates back without submitting forms', () => {
  const onNavigate = jest.fn();
  renderChangePage(onNavigate);

  fireEvent.click(screen.getByRole('button', { name: /back to profile/i }));

  expect(onNavigate).toHaveBeenCalledWith('/my-profile');
});
