import React from 'react';

/**
 * Lightweight modal overlay used for confirmations and dialogs.
 */
interface ModalProps {
  /** Determines if the modal is open */
  isOpen: boolean;
  /** ID for the title element, used for accessibility */
  titleId: string;
  /** ID for the description element, used for accessibility */
  descriptionId?: string;
  /** Function to call when the modal is requested to close */
  onClose: () => void;
  /** Content to be displayed inside the modal */
  children: React.ReactNode;
  /** Additional class name for the modal content */
  contentClassName?: string;
}

/**
 * Modal component for displaying overlay dialogs.
 * @param {ModalProps} props - Props for the Modal component.
 * @returns {JSX.Element | null} - Rendered Modal component or null if not open.
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  titleId,
  descriptionId,
  onClose,
  children,
  contentClassName = '',
}) => {
  // Return null if modal is not open
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className={`modal-content${contentClassName ? ` ${contentClassName}` : ''}`}
        onClick={e => e.stopPropagation()} // Prevent closing modal when clicking inside content
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;