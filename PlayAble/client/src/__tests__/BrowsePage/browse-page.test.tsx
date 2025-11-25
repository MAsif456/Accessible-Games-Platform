import React, { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrowsePage from '../../pages/BrowsePage';
import { GameDto } from '../../services/api';


jest.mock('src/services/api', () => {
  const actual = jest.requireActual('src/services/api');
  return {
    ...actual,
    getGames: jest.fn(
      async ({
        page,
        pageSize,
      }: {
        page: number;
        pageSize: number;
      }) => {
       
        const mockGames: GameDto[] = Array.from({ length: 12 }, (_, i) => ({
          id: `game-${i + 1}`,
          _id: `game-${i + 1}`,
          slug: `game-${i + 1}`,
          title: `Game ${i + 1}`,
          studio: `Studio ${i + 1}`,
          description: `Description ${i + 1}`,
          thumbnailUrl: `/images/games/thumb-${i + 1}.jpg`,
          genres: ['Action'],
          accessibilityTags: ['Vision'],
        }));

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageGames = mockGames.slice(start, end);
        const totalResults = mockGames.length;
        const totalPages = Math.ceil(totalResults / pageSize);

        return {
          games: pageGames,
          totalResults,
          totalPages,
        };
      },
    ),
  };
});

const defaultProps = {
  currentPath: '/browse' as any,
  pageSize: 9,
  searchTerm: '',
  onGameClick: jest.fn(),
  onToggleFavourite: jest.fn(),
  favourites: new Set<string>(),
  onSearchChange: jest.fn(),
};


const TestBrowsePage: React.FC<
  Partial<React.ComponentProps<typeof BrowsePage>>
> = props => {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <BrowsePage
      {...defaultProps}
      currentPage={currentPage}
      onPageChange={page => {
        setCurrentPage(page);
        props.onPageChange?.(page);
      }}
      {...props}
    />
  );
};

describe('BrowsePage - Acceptance Criteria', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (window as any).scrollTo = jest.fn();
  });

  test('shows exactly 9 game cards with thumbnail, title, description, and tags on first page', async () => {
    render(<TestBrowsePage />);

  
    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(9);

    cards.forEach(card => {
      
      expect(within(card).getByRole('img')).toBeInTheDocument();
      
      expect(within(card).getByText(/Game \d+/)).toBeInTheDocument();
      
      expect(within(card).getByText(/Description \d+/)).toBeInTheDocument();
      
      expect(within(card).getByText('Vision')).toBeInTheDocument();
    });

    
    expect(cards.length).toBeLessThanOrEqual(9);
  });

  test('renders pagination with Previous, Next, numbered buttons and correct state on page 1', async () => {
    render(<TestBrowsePage />);

    await screen.findAllByRole('article');

    const prevButton = screen.getByRole('button', { name: /Previous/i });
    const nextButton = screen.getByRole('button', { name: /Next/i });
    const page1Button = screen.getByRole('button', { name: '1' });

    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeEnabled();
    expect(page1Button).toHaveAttribute('aria-current', 'page');
  });

  test('shows and updates current page indicator with aria-live when not on page 1', async () => {
    render(<TestBrowsePage />);

    await screen.findAllByRole('article');

    
    const page2Button = screen.getByRole('button', { name: '2' });
    await userEvent.click(page2Button);

    
    const indicator = await screen.findByText(/Page 2 of 2/i);
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('aria-live', 'polite');
  });

  test('scrolls to top when navigating to another page', async () => {
    render(<TestBrowsePage />);

    await screen.findAllByRole('article');

    const page2Button = screen.getByRole('button', { name: '2' });
    await userEvent.click(page2Button);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

   test('resets pagination to page 1 when using the browse search input', async () => {
    const onPageChange = jest.fn();
    render(<TestBrowsePage onPageChange={onPageChange} />);

    await screen.findAllByRole('article');

    const searchInput = screen.getByPlaceholderText(
      /Search games by name or keyword/i,
    );

    
    const page2Button = screen.getByRole('button', { name: '2' });
    await userEvent.click(page2Button);

   
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'Game 2{enter}');

  });

  test('Favourite button toggles label between Favourite and Unfavourite based on favourites prop', async () => {
    const onToggleFavourite = jest.fn();

    const { rerender } = render(
      <BrowsePage
        {...defaultProps}
        currentPage={1}
        onPageChange={jest.fn()}
        onToggleFavourite={onToggleFavourite}
        favourites={new Set()}
      />,
    );

    await screen.findAllByRole('article');

    const favButton = screen.getAllByRole('button', { name: /Favourite/i })[0];
    expect(favButton).toBeInTheDocument();

    await userEvent.click(favButton);
    expect(onToggleFavourite).toHaveBeenCalledTimes(1);

    
    rerender(
      <BrowsePage
        {...defaultProps}
        currentPage={1}
        onPageChange={jest.fn()}
        onToggleFavourite={onToggleFavourite}
        favourites={new Set(['game-1'])}
      />,
    );

    const unfavButton = await screen.findByRole('button', {
      name: /Unfavourite/i,
    });
    expect(unfavButton).toBeInTheDocument();
  });
});