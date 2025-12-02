import React from 'react';
import { GameDto } from '../services/api';

/**
 * Minimal game shape needed by GameCard.
 */
interface BasicGameLike {
  id: string;
  title: string;
  studio: string;
  description: string;
  thumbnailUrl: string;
  genres: string[];
  accessibilityTags: string[];
}

/**
 * Props for the GameCard component.
 */
interface GameCardProps<TGame extends BasicGameLike> {
  /** The game data */
  game: TGame;
  /** Function to call when card is clicked */
  onClick: () => void;
  /** Label for the favourite button */
  favouriteLabel?: string;
  /** Function to call when favourite button is clicked */
  onFavouriteClick?: (gameId: string) => void;
  /** Indicates if the game is a favourite */
  isFavourite?: boolean;
}

/**
 * GameCard component for displaying game information.
 * @param {GameCardProps} props - Props for the GameCard component.
 * @returns {JSX.Element} - Rendered GameCard component.
 */
const GameCard = <TGame extends BasicGameLike>({
  game,
  onClick,
  favouriteLabel,
  onFavouriteClick,
  isFavourite,
}: GameCardProps<TGame>) => {
  const favourite = !!isFavourite;

  /**
   * Handle click on the favourite button.
   * @param {React.MouseEvent<HTMLButtonElement>} e - Mouse event.
   */
  const handleFavouriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card click from firing when favourite toggled.
    onFavouriteClick?.(game.id);
  };

  return (
    <article
      className="game-card"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="game-card__favourite-wrapper">
        {onFavouriteClick && (
          <button
            type="button"
            className={`game-card__favourite-button${favourite ? ' game-card__favourite-button--active' : ''}`}
            onClick={handleFavouriteClick}
            aria-pressed={favourite}
          >
            <span
              className={`game-card__favourite-icon${favourite ? ' game-card__favourite-icon--active' : ''}`}
              aria-hidden="true"
            />
            <span className="game-card__favourite-label">
              {favouriteLabel || (favourite ? 'Unfavourite' : 'Add to favourites')}
            </span>
          </button>
        )}
      </div>
      <GameThumbnail url={game.thumbnailUrl} title={game.title} />
      <div className="game-card__body">
        <GameHeader title={game.title} studio={game.studio} />
        <GameDescription description={game.description} />
        <GameTags genres={game.genres} tags={game.accessibilityTags} />
      </div>
    </article>
  );
};

/**
 * GameHeader component for displaying game title and studio.
 * @param {{ title: string; studio: string }} props - Props for the GameHeader component.
 * @returns {JSX.Element} - Rendered GameHeader component.
 */
const GameHeader: React.FC<{ title: string; studio: string }> = ({ title, studio }) => (
  <header className="game-card__header">
    <h2 className="game-card__title">{title}</h2>
    <p className="game-card__studio">{studio}</p>
  </header>
);

/**
 * GameThumbnail component for displaying game thumbnail image.
 * @param {{ url: string; title: string }} props - Props for the GameThumbnail component.
 * @returns {JSX.Element} - Rendered GameThumbnail component.
 */
const GameThumbnail: React.FC<{ url: string; title: string }> = ({ url, title }) => (
  <img className="game-card__thumbnail" src={url} alt={title} />
);

/**
 * GameDescription component for displaying game description.
 * @param {{ description: string }} props - Props for the GameDescription component.
 * @returns {JSX.Element} - Rendered GameDescription component.
 */
const GameDescription: React.FC<{ description: string }> = ({ description }) => (
  <p className="game-card__description">{description}</p>
);

/**
 * GameTags component for displaying game genres and accessibility tags.
 * @param {{ genres: string[]; tags: string[] }} props - Props for the GameTags component.
 * @returns {JSX.Element} - Rendered GameTags component.
 */
const GameTags: React.FC<{ genres: string[]; tags: string[] }> = ({ genres, tags }) => (
  <div className="game-card__meta">
    <div className="game-card__tags">
      {genres.map(g => (
        <span key={g} className="pill pill--genre">
          {g}
        </span>
      ))}
    </div>
    <div className="game-card__accessibility">
      {tags.map(t => (
        <span key={t} className="pill pill--accessibility">
          {t}
        </span>
      ))}
    </div>
  </div>
);

export default GameCard;