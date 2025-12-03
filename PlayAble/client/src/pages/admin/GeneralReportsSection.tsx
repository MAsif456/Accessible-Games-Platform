import React from 'react';
import Pagination from '../../components/ui/Pagination';
import { formatReportCode, type AdminGeneralReport } from '../../services/adminReportsService';

type GeneralSubTab = 'general' | 'resolved';

interface GeneralReportsSectionProps {
  generalSubTab: GeneralSubTab;
  paginatedGeneralReports: AdminGeneralReport[];
  paginatedResolvedGeneralReports: AdminGeneralReport[];
  generalReportsLoading: boolean;
  resolvedReportsLoading: boolean;
  generalReportsError: string | null;
  resolvedReportsError: string | null;
  generalReportsSearch: string;
  resolvedReportsSearch: string;
  setGeneralReportsSearch: (value: string) => void;
  setResolvedReportsSearch: (value: string) => void;
  generalReportsTotalPages: number;
  resolvedGeneralReportsTotalPages: number;
  generalReportsPage: number;
  resolvedGeneralReportsPage: number;
  setGeneralReportsPage: (page: number) => void;
  setResolvedGeneralReportsPage: (page: number) => void;
  formatDate: (date: string | Date) => string;
  truncateDescription: (text: string, limit?: number) => string;
  formatReporter: (report: AdminGeneralReport) => string;
  openReportModal: (report: AdminGeneralReport, mode: 'reply' | 'view') => void;
}

const GeneralReportsSection: React.FC<GeneralReportsSectionProps> = ({
  generalSubTab,
  paginatedGeneralReports,
  paginatedResolvedGeneralReports,
  generalReportsLoading,
  resolvedReportsLoading,
  generalReportsError,
  resolvedReportsError,
  generalReportsSearch,
  resolvedReportsSearch,
  setGeneralReportsSearch,
  setResolvedReportsSearch,
  generalReportsTotalPages,
  resolvedGeneralReportsTotalPages,
  generalReportsPage,
  resolvedGeneralReportsPage,
  setGeneralReportsPage,
  setResolvedGeneralReportsPage,
  formatDate,
  truncateDescription,
  formatReporter,
  openReportModal,
}) => {
  const isResolved = generalSubTab === 'resolved';
  const reports = isResolved ? paginatedResolvedGeneralReports : paginatedGeneralReports;
  const loading = isResolved ? resolvedReportsLoading : generalReportsLoading;
  const error = isResolved ? resolvedReportsError : generalReportsError;
  const searchValue = isResolved ? resolvedReportsSearch : generalReportsSearch;
  const handleSearch = isResolved ? setResolvedReportsSearch : setGeneralReportsSearch;
  const searchInputId = isResolved ? 'resolved-reports-search' : 'general-reports-search';
  const dateLabel = isResolved ? 'Resolved On' : 'Date';
  const totalPages = isResolved ? resolvedGeneralReportsTotalPages : generalReportsTotalPages;
  const currentPage = isResolved ? resolvedGeneralReportsPage : generalReportsPage;
  const onPageChange = isResolved ? setResolvedGeneralReportsPage : setGeneralReportsPage;

  return (
    <section
      className="admin-section-card"
      aria-labelledby={isResolved ? 'general-resolved-title' : 'general-open-title'}
    >
      <header className="admin-section-card__header">
        <div>
          <h2 id={isResolved ? 'general-resolved-title' : 'general-open-title'}>
            {isResolved ? 'Resolved Reports' : 'General Reports'}
          </h2>
          <p className="admin-section-card__description">
            {isResolved
              ? 'Reports that have been resolved by administrators.'
              : "Open and unresolved reports submitted through the footer 'Report anything to us here' link"}
          </p>
        </div>
      </header>

      <div className="admin-section-card__search-wrapper">
        <label htmlFor={searchInputId} className="sr-only">
          Search general reports
        </label>
        <input
          id={searchInputId}
          type="search"
          className="admin-section-card__search-input"
          placeholder="Search by description, ID, or reporter..."
          value={searchValue}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {error && (
        <div role="alert" className="admin-error-message">
          {error}
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table" aria-label={isResolved ? 'Resolved reports table' : 'General reports table'}>
          <caption className="sr-only">
            {isResolved ? 'Resolved content reports' : 'Open general content reports'}
          </caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Description</th>
              <th scope="col">Reported By</th>
              <th scope="col">{dateLabel}</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="admin-table__empty-row">
                <td colSpan={5}>
                  <p className="admin-table__empty-message">Loading reports...</p>
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr className="admin-table__empty-row">
                <td colSpan={5}>
                  <p className="admin-table__empty-message">
                    {isResolved ? 'No resolved reports' : 'No general reports'}
                  </p>
                </td>
              </tr>
            ) : (
              reports.map(report => (
                <tr key={report.id}>
                  <td>{formatReportCode(report)}</td>
                  <td>{truncateDescription(report.description)}</td>
                  <td>{formatReporter(report)}</td>
                  <td>
                    {formatDate(
                      isResolved && report.resolvedAt ? report.resolvedAt : report.createdAt
                    )}
                  </td>
                  <td className="admin-table__actions-cell">
                    <button
                      type="button"
                      className="admin-table__action-button"
                      onClick={() => openReportModal(report, isResolved ? 'view' : 'reply')}
                    >
                      {isResolved ? 'View' : 'Reply'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            ariaLabel={isResolved ? 'Resolved general reports pagination' : 'General reports pagination'}
          />
        </div>
      )}
    </section>
  );
};

export default GeneralReportsSection;
