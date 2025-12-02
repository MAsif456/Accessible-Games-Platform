import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, ariaLabel }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    pages.push(
      <button
        key={p}
        type="button"
        className={`pagination__number${p === page ? ' pagination__number--current' : ''}`}
        onClick={() => onPageChange(p)}
        aria-current={p === page ? 'page' : undefined}
      >
        {p}
      </button>,
    );
  }

  return (
    <nav className="pagination" aria-label={ariaLabel ?? 'Pagination'}>
      <button
        type="button"
        className="pagination__button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        Previous
      </button>
      <div className="pagination__list">{pages}</div>
      <button
        type="button"
        className="pagination__button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </button>
    </nav>
  );
};

export default Pagination;
