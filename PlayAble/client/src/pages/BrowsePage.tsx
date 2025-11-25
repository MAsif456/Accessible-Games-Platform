import React from 'react';

// Demo data for testing keyboard navigation
const demoGames = [
  {
    id: 1,
    title: "Accessible Adventure",
    studio: "Inclusive Games",
    description: "A thrilling adventure game designed for all players",
    tags: ["Adventure", "Story"],
    accessibility: ["Screen Reader", "Audio Cues"]
  },
  {
    id: 2,
    title: "Puzzle Palace",
    studio: "Mind Games",
    description: "Brain-teasing puzzles with multiple input options",
    tags: ["Puzzle", "Logic"],
    accessibility: ["Voice Control", "High Contrast"]
  },
  {
    id: 3,
    title: "Racing Revolution",
    studio: "Speed Studios",
    description: "Fast-paced racing with customizable controls",
    tags: ["Racing", "Action"],
    accessibility: ["Custom Controls", "Subtitles"]
  },
  {
    id: 4,
    title: "Strategy Sphere",
    studio: "Think Tank",
    description: "Deep strategic gameplay for all skill levels",
    tags: ["Strategy", "Turn-based"],
    accessibility: ["Keyboard Only", "Colorblind Support"]
  }
];

const BrowsePage: React.FC = () => {
  const handleGameClick = (gameId: number) => {
    console.log(`Selected game: ${gameId}`);
    // TODO: Navigate to game details
  };

  const handleFilterClick = (filter: string) => {
    console.log(`Applied filter: ${filter}`);
    // TODO: Apply filter logic
  };

  return (
    <div className="browse-page">
      <header className="browse-page__header">
        <h1>Browse Accessible Games</h1>
        
        <div className="browse-page__search-wrapper">
          <label htmlFor="browse-search" className="sr-only">
            Search games by title or accessibility feature
          </label>
          <input
            id="browse-search"
            type="search"
            className="browse-page__search-input"
            placeholder="Search games..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                console.log('Search submitted');
              }
            }}
          />
        </div>

        <div className="browse-page__header-right">
          <span className="browse-page__page-indicator">
            Showing 4 games
          </span>
        </div>
      </header>

      {/* Filter buttons - global system will handle arrow key navigation */}
      <section aria-label="Game filters">
        <h2 className="sr-only">Filter Games</h2>
        <div 
          className="browse-page__filters" 
          role="toolbar"
          aria-label="Game category filters"
        >
          {['All Games', 'Adventure', 'Puzzle', 'Racing', 'Strategy'].map((filter) => (
            <button
              key={filter}
              type="button"
              className="browse-page__filters-button"
              onClick={() => handleFilterClick(filter)}
              aria-pressed={filter === 'All Games' ? 'true' : 'false'}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Game grid - global system will handle 2D arrow key navigation */}
      <main>
        <h2 className="sr-only">Games List</h2>
        <div 
          className="browse-page__grid" 
          role="grid"
          aria-label="Accessible games"
        >
          {demoGames.map((game) => (
            <article 
              key={game.id} 
              className="game-card"
              role="gridcell"
            >
              <button
                type="button"
                onClick={() => handleGameClick(game.id)}
                aria-describedby={`game-${game.id}-description`}
                style={{ 
                  width: '100%', 
                  textAlign: 'left', 
                  background: 'none', 
                  border: 'none', 
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                <div className="game-card__thumbnail" style={{ 
                  backgroundColor: '#e5e7eb', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#6b7280'
                }}>
                  Game Image
                </div>
                <div className="game-card__body">
                  <header className="game-card__header">
                    <h3 className="game-card__title">{game.title}</h3>
                    <p className="game-card__studio">{game.studio}</p>
                  </header>
                  <p id={`game-${game.id}-description`} className="game-card__description">
                    {game.description}
                  </p>
                  <div className="game-card__meta">
                    <div className="game-card__tags">
                      {game.tags.map(tag => (
                        <span key={tag} className="pill pill--genre">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="game-card__accessibility">
                      {game.accessibility.map(feature => (
                        <span key={feature} className="pill pill--accessibility">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            </article>
          ))}
        </div>

        {/* Pagination - global system will handle horizontal arrow key navigation */}
        <nav className="pagination" aria-label="Games pagination">
          <button 
            className="pagination__button" 
            aria-disabled="true"
            disabled
          >
            Previous
          </button>
          <ul className="pagination__list" role="list">
            <li>
              <button 
                className="pagination__number pagination__number--current"
                aria-current="page"
                aria-label="Page 1, current page"
              >
                1
              </button>
            </li>
            <li>
              <button 
                className="pagination__number"
                aria-label="Go to page 2"
              >
                2
              </button>
            </li>
            <li>
              <button 
                className="pagination__number"
                aria-label="Go to page 3"
              >
                3
              </button>
            </li>
          </ul>
          <button 
            className="pagination__button"
            aria-label="Go to next page"
          >
            Next
          </button>
        </nav>
      </main>
    </div>
  );
};

export default BrowsePage;
