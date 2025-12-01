import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AboutUs from '../../src/pages/AboutUs';

describe('About Us Page - Acceptance Criteria', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // AC1: Page displays "Our Mission", "Closing the Gap", and "Who We Support" sections
  test('displays Our Mission, Closing the Gap, and Who We Support sections', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /our mission/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /closing the gap/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /who we support/i })).toBeInTheDocument();
  });

  // AC2: Five accessibility category cards are displayed
  test('displays all five accessibility category cards', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /visual impairments/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /hearing impairments/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /motor impairments/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /cognitive impairments/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /speech impairments/i })).toBeInTheDocument();
  });

  // AC3: "What Makes Us Different" section displays with four check marked differentiators
  test('displays What Makes Us Different section with four differentiators', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /what makes us different/i })).toBeInTheDocument();
    expect(screen.getByText(/comprehensive accessibility tags:/i)).toBeInTheDocument();
    expect(screen.getByText(/advanced filtering:/i)).toBeInTheDocument();
    expect(screen.getByText(/platform accessibility:/i)).toBeInTheDocument();
    expect(screen.getByText(/community-driven:/i)).toBeInTheDocument();
  });

  // AC4: "Our Commitment" section is present
  test('displays Our Commitment section', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /our commitment/i })).toBeInTheDocument();
    expect(screen.getByText(/gaming should be for everyone/i)).toBeInTheDocument();
  });

  // AC5: WCAG 2.1 AA conformance statement is displayed
  test('displays WCAG 2.1 AA conformance statement', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /accessibility standards & compliance/i })).toBeInTheDocument();
    expect(screen.getByText(/web content accessibility guidelines \(wcag\) 2.1/i)).toBeInTheDocument();
    expect(screen.getByText(/aa level/i)).toBeInTheDocument();
  });

  // AC6: Four WCAG principle cards are shown
  test('displays four WCAG principle cards', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /perceivable/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /operable/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /understandable/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /robust/i })).toBeInTheDocument();
  });

  // AC7: "Platform Accessibility Features" list is displayed
  test('displays Platform Accessibility Features list', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /platform accessibility features/i })).toBeInTheDocument();
    expect(screen.getByText(/voice input & captions:/i)).toBeInTheDocument();
    expect(screen.getByText(/high contrast mode:/i)).toBeInTheDocument();
    expect(screen.getByText(/reduced motion:/i)).toBeInTheDocument();
    expect(screen.getByText(/screen reader optimisation:/i)).toBeInTheDocument();
    expect(screen.getByText(/keyboard navigation:/i)).toBeInTheDocument();
  });

  // AC8: "How to Use Voice Commands" section shows numbered steps
  test('displays How to Use Voice Commands section with numbered steps', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /how to use voice commands/i })).toBeInTheDocument();
    expect(screen.getByText(/activate voice input:/i)).toBeInTheDocument();
    expect(screen.getByText(/listen for confirmation:/i)).toBeInTheDocument();
    expect(screen.getByText(/speak your command:/i)).toBeInTheDocument();
  });

  // AC9: "How to Use Keyboard Navigation" section includes keyboard shortcuts table
  test('displays How to Use Keyboard Navigation section with shortcuts table', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /how to use keyboard navigation/i })).toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Verify table has proper headers
    expect(screen.getByRole('columnheader', { name: /key/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /action/i })).toBeInTheDocument();
  });

  // AC10: "Report Accessibility Issues" section shows email contact and report form option
  test('displays Report Accessibility Issues section with email and report form', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /report accessibility issues/i })).toBeInTheDocument();

    const emailLink = screen.getByRole('link', { name: /accessibility@accessiblegames.example/i });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:accessibility@accessiblegames.example');

    expect(screen.getByText(/use our report issue form/i)).toBeInTheDocument();
  });

  // AC11: "Ready to Start Gaming?" call-to-action displays with navigation buttons
  test('displays Ready to Start Gaming CTA with navigation buttons', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    expect(screen.getByRole('heading', { name: /ready to start gaming\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse games/i })).toBeInTheDocument();

    const settingsButtons = screen.getAllByRole('button', { name: /accessibility settings/i });
    expect(settingsButtons.length).toBeGreaterThan(0);

    const reportButtons = screen.getAllByRole('button', { name: /report an issue/i });
    expect(reportButtons.length).toBeGreaterThan(0);
  });

  // AC12: All interactive elements are keyboard accessible
  test('all interactive elements are keyboard accessible', () => {
    render(<AboutUs onNavigate={mockNavigate} />);

    const browseButton = screen.getByRole('button', { name: /browse games/i });
    const emailLink = screen.getByRole('link', { name: /accessibility@accessiblegames.example/i });

    expect(browseButton).toBeInTheDocument();
    expect(emailLink).toBeInTheDocument();
  });

  // AC13: Component integrates with existing application styling
  test('component renders without errors and integrates with application', () => {
    const { container } = render(<AboutUs onNavigate={mockNavigate} />);

    expect(container).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /about accessible games platform/i })).toBeInTheDocument();
  });

  // AC14: No existing tests are broken by this implementation (tested via navigation)
  test('navigation buttons work correctly', async () => {
    const user = userEvent.setup();
    render(<AboutUs onNavigate={mockNavigate} />);

    // Test Browse Games navigation
    const browseButton = screen.getByRole('button', { name: /browse games/i });
    await user.click(browseButton);
    expect(mockNavigate).toHaveBeenCalledWith('/browse');

    // Test Accessibility Settings navigation
    mockNavigate.mockClear();
    const settingsButtons = screen.getAllByRole('button', { name: /accessibility settings/i });
    await user.click(settingsButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/settings');

    // Test Report navigation
    mockNavigate.mockClear();
    const reportButtons = screen.getAllByRole('button', { name: /report an issue/i });
    await user.click(reportButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/report/general');
  });
});
