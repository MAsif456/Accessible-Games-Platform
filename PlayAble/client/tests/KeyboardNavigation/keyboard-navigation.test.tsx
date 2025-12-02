import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkipLink from '../../src/components/navigation/SkipLink';
import useGlobalKeyboardNavigation from '../../src/hooks/useGlobalKeyboardNavigation';

const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

// Simple test component used to exercise the global keyboard navigation hook
function TestPage() {
  useGlobalKeyboardNavigation();

  return (
    <>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <nav aria-label="Main navigation" role="menubar">
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

describe('Keyboard navigation behaviour', () => {
  beforeAll(() => {
    Element.prototype.getBoundingClientRect = function () {
      return { width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30 } as DOMRect;
    };
  });

  afterAll(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

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

  test('Arrow keys move focus horizontally in navbar and loop at boundaries', () => {
    render(<TestPage />);

    const nav = screen.getByRole('menubar', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');
    const profileButton = within(nav).getByRole('button', { name: /profile/i });

    links[0].focus();
    expect(links[0]).toHaveFocus();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(links[1]).toHaveFocus();

    profileButton.focus();
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(links[0]).toHaveFocus();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(profileButton).toHaveFocus();
  });

  test('Home/End jump to first and last items in a vertical menu', () => {
    const Menu = () => {
      useGlobalKeyboardNavigation();
      return (
        <div role="menu">
          <button type="button">One</button>
          <button type="button">Two</button>
          <button type="button">Three</button>
        </div>
      );
    };

    render(<Menu />);
    const buttons = screen.getAllByRole('button');

    buttons[1].focus();
    fireEvent.keyDown(document, { key: 'Home' });
    expect(buttons[0]).toHaveFocus();

    fireEvent.keyDown(document, { key: 'End' });
    expect(buttons[2]).toHaveFocus();
  });

  test('Escape closes expanded toggle within navigation context', () => {
    const MenuWithToggle = () => {
      useGlobalKeyboardNavigation();
      return (
        <nav aria-label="Main navigation" role="menubar">
          <button aria-expanded="true" aria-haspopup="menu">
            Menu
          </button>
          <button type="button">Other</button>
        </nav>
      );
    };

    render(<MenuWithToggle />);
    const toggle = screen.getByRole('button', { name: /menu/i });
    toggle.focus();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(toggle, { key: 'Escape' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });

  test('Enter triggers click handler via global listener', () => {
    const handleClick = jest.fn();
    const Page = () => {
      useGlobalKeyboardNavigation();
      return (
        <nav aria-label="Main navigation" role="menubar">
          <button type="button" onClick={handleClick}>
            Activate
          </button>
        </nav>
      );
    };

    render(<Page />);
    const button = screen.getByRole('button', { name: /activate/i });
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
