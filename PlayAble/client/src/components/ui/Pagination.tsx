import React from 'react';

/**
 * Accessible pagination control for list/grid navigation.
 */
interface PaginationProps {
  /** Current page number */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Function to call when page changes */
  onPageChange: (page: number) => void;
  /** ARIA label for the pagination navigation */
  ariaLabel?: string;
}

/**
 * Pagination component for navigating through pages.
 * @param {PaginationProps} props - Props for the Pagination component.
 * @returns {JSX.Element | null} - Rendered Pagination component or null if totalPages is less than or equal to 1.
 */
const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, ariaLabel }) => {
  // Return null if there is only one page
  if (totalPages <= 1) return null;

  // Generate an array of page numbers
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