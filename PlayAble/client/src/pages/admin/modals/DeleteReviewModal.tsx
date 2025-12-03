import React from 'react';
import Modal from '../../../components/ui/Modal';

interface DeleteReviewModalProps {
  reviewToDelete: { id: string; displayId?: string; authorName?: string } | null;
  setReviewToDelete: (review: { id: string; displayId?: string; authorName?: string } | null) => void;
  deleteReview: (reviewId: string) => Promise<void>;
}

const DeleteReviewModal: React.FC<DeleteReviewModalProps> = ({ reviewToDelete, setReviewToDelete, deleteReview }) => (
  <Modal
    isOpen={!!reviewToDelete}
    titleId="delete-review-title"
    onClose={() => setReviewToDelete(null)}
    contentClassName="modal-content--wide"
  >
    <h2 id="delete-review-title" className="dialog__title">
      Delete Review - Admin Action
    </h2>
    {reviewToDelete && (
      <p className="dialog__meta">
        <strong>Review ID:</strong> {reviewToDelete.displayId ?? reviewToDelete.id}
      </p>
    )}
    <p className="dialog__message">
      {`Are you sure you want to delete this review${
        reviewToDelete?.authorName ? ` from ${reviewToDelete.authorName}` : ''
      }? This action cannot be undone.`}
    </p>
    <div className="dialog__actions">
      <button type="button" className="dialog__button dialog__button--secondary" onClick={() => setReviewToDelete(null)}>
        Cancel
      </button>
      <button
        type="button"
        className="dialog__button dialog__button--primary"
        onClick={async () => {
          if (reviewToDelete) {
            await deleteReview(reviewToDelete.id);
            setReviewToDelete(null);
          }
        }}
      >
        Delete Review
      </button>
    </div>
  </Modal>
);

export default DeleteReviewModal;
