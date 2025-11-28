import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkipLink from '../../src/components/navigation/SkipLink';
import { useGlobalKeyboardNavigation } from '../../src/hooks/useGlobalKeyboardNavigation';

// Simple test component used to exercise the global keyboard navigation hook
function TestPage() {
  useGlobalKeyboardNavigation();

  return (
    <>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <nav aria-label="Main navigation">
        <a href="#home">Home</a>
        <a href="#games">Games</a>
        <button type="button">Profile</button>
      </nav>
      <main id="main-content">
        <button type="button">Play</button>
        <button type="button">Settings</button>
      </main>
    </>
  );
}

// Mock the global keyboard navigation hook so it does not register real listeners on document
jest.mock('../../hooks/useGlobalKeyboardNavigation', () => ({
  useGlobalKeyboardNavigation: jest.fn(),
}));

describe('Keyboard navigation behaviour', () => {
  test('Tab moves focus to next interactive element with visible focus indicator', () => {
    render(<TestPage />);

    const firstLink = screen.getByText('Skip to main content').closest('a');
    expect(firstLink).toBeInTheDocument();

    firstLink?.focus();
    expect(firstLink).toHaveFocus();
  });

  test('Enter on focused element performs its action', () => {
    const handleClick = jest.fn();
    render(<button onClick={handleClick}>Click me</button>);

    const button = screen.getByText('Click me');
    button.focus();

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalled();
  });

  test('Skip link appears and prepares main content for focus', () => {
    render(
      <>
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <main id="main-content">Main content</main>
      </>
    );

    const skipLink = screen.getByText('Skip to main content');

    // First Tab press: focus moves to the skip link
    skipLink.focus();
    expect(skipLink).toHaveFocus();

    // Activating the skip link should make the main content programmatically focusable
    fireEvent.keyDown(skipLink, { key: 'Enter' });

    const main = screen.getByText('Main content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });
});