import React from 'react';

interface ModalProps {
  isOpen: boolean;
  titleId: string;
  descriptionId?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, titleId, descriptionId, onClose, children }) => {
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
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
