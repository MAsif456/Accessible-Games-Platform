import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App';

// Mock window.open so we can assert external navigation without actually leaving the test environment
const originalWindowOpen = window.open;

beforeAll(() => {
  // @ts-ignore
  window.open = jest.fn();
});

afterAll(() => {
  window.open = originalWindowOpen;
});

// Helper: render the whole app starting from browse and click into first game
async function renderAndNavigateToFirstGame() {
  render(
    <MemoryRouter initialEntries={['/browse']}>
      <App />
    </MemoryRouter>
  );

  const gameCardButton = await screen.findByRole('button', { name: /view details/i });
  fireEvent.click(gameCardButton);

  await screen.findByRole('heading', { name: /accessibility reviews/i });
}

describe('Game Details Page layout and behaviour', () => {
  test('shows core game info above the fold after navigating from catalogue', async () => {
    await renderAndNavigateToFirstGame();

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/studio/i)).toBeInTheDocument();
    expect(screen.getByText(/genre/i)).toBeInTheDocument();
    expect(screen.getByAltText(/game thumbnail/i)).toBeInTheDocument();
    expect(screen.getByText(/accessibility features/i)).toBeInTheDocument();
  });

  test('shows About This Game and release/download section when scrolled', async () => {
    await renderAndNavigateToFirstGame();

    const aboutHeading = await screen.findByRole('heading', { name: /about this game/i });
    expect(aboutHeading).toBeInTheDocument();

    const releaseLabel = screen.getByText(/release year/i);
    const downloadHeading = screen.getByText(/download now/i);
    expect(releaseLabel.compareDocumentPosition(downloadHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('shows Accessibility Reviews and See Reviews link in lower section', async () => {
    await renderAndNavigateToFirstGame();

    const reviewsHeading = screen.getByRole('heading', { name: /accessibility reviews/i });
    expect(reviewsHeading).toBeInTheDocument();

    const seeReviewsLink = screen.getByRole('button', { name: /see reviews/i });
    expect(seeReviewsLink).toBeInTheDocument();
    fireEvent.click(seeReviewsLink);
  });

  test('shows separate, clearly labelled App Store and Play Store download buttons', async () => {
    await renderAndNavigateToFirstGame();

    const appStoreButton = screen.getByRole('button', { name: /download on the app store/i });
    const playStoreButton = screen.getByRole('button', { name: /get it on google play/i });

    expect(appStoreButton).toBeInTheDocument();
    expect(playStoreButton).toBeInTheDocument();
  });

  test('clicking external download shows confirmation with destination name', async () => {
    await renderAndNavigateToFirstGame();

    const appStoreButton = screen.getByRole('button', { name: /download on the app store/i });
    fireEvent.click(appStoreButton);

    const modalTitle = await screen.findByText(/you are about to leave playable/i);
    expect(modalTitle).toBeInTheDocument();
    expect(screen.getByText(/app store/i)).toBeInTheDocument();
  });

  test('external link confirmation allows proceed or cancel without leaving on cancel', async () => {
    await renderAndNavigateToFirstGame();

    const appStoreButton = screen.getByRole('button', { name: /download on the app store/i });
    fireEvent.click(appStoreButton);

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    const proceedButton = screen.getByRole('button', { name: /proceed/i });

    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/you are about to leave playable/i)).not.toBeInTheDocument();
    });

    expect(window.open).not.toHaveBeenCalled();

    fireEvent.click(appStoreButton);
    await screen.findByText(/you are about to leave playable/i);
    fireEvent.click(proceedButton);

    await waitFor(() => {
      expect(window.open).toHaveBeenCalled();
    });
  });
});
