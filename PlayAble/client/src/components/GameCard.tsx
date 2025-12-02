import React, { useMemo } from 'react';
import { GameDto } from '../services/api';
import { deriveAccessibilityBadges } from '../utils/accessibility';

export interface BasicGameLike
  extends Pick<
    GameDto,
    'id' | 'title' | 'studio' | 'description' | 'thumbnailUrl' | 'genres' | 'accessibilityTags' | 'specificAccessibilityTags'
  > {}

export interface GameCardProps<TGame extends BasicGameLike = BasicGameLike> {
  game: TGame;
  onClick: () => void;
  favouriteLabel?: string;
  onFavouriteClick?: (gameId: string) => void;
  isFavourite?: boolean;
}

const GameThumbnail: React.FC<{ url: string; title: string }> = ({ url, title }) => (
  <img className="game-card__thumbnail" src={url} alt={title} />
);

const GameHeader: React.FC<{ title: string; studio: string }> = ({ title, studio }) => (
  <header className="game-card__header">
    <h2 className="game-card__title">{title}</h2>
    <p className="game-card__studio">{studio}</p>
  </header>
);

const GameDescription: React.FC<{ description: string }> = ({ description }) => (
  <p className="game-card__description">{description}</p>
);

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

const GameCard = <TGame extends BasicGameLike>({
  game,
  onClick,
  favouriteLabel,
  onFavouriteClick,
  isFavourite,
}: GameCardProps<TGame>) => {
  const favourite = !!isFavourite;
  const derivedAccessibilityTags = useMemo(
    () => deriveAccessibilityBadges(game),
    [game.accessibilityTags, game.specificAccessibilityTags]
  );

  const handleFavouriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onFavouriteClick) {
      onFavouriteClick(game.id);
    }
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
        <button
          type="button"
          className={`game-card__favourite-button${favourite ? ' game-card__favourite-button--active' : ''}`}
          aria-pressed={favourite}
          onClick={handleFavouriteClick}
        >
          <span className="game-card__favourite-label">{favouriteLabel ?? 'Favourite'}</span>
        </button>
      </div>
      <button
        type="button"
        className="sr-only game-card__view-details"
        onClick={onClick}
      >
        View Details
      </button>
      <GameThumbnail url={game.thumbnailUrl} title={game.title} />
      <div className="game-card__body">
        <GameHeader title={game.title} studio={game.studio} />
        <GameDescription description={game.description} />
        <GameTags genres={game.genres} tags={derivedAccessibilityTags} />
      </div>
    </article>
  );
};

export default GameCard;
