import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

interface ConfirmationModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ show, onHide, onConfirm, title, body }) => {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const useConfirmationModal = () => {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [onConfirm, setOnConfirm] = useState<() => void>(() => {});

  const handleShow = (newTitle: string, newBody: string, newOnConfirm: () => void) => {
    setTitle(newTitle);
    setBody(newBody);
    setOnConfirm(() => newOnConfirm);
    setShow(true);
  };

  const handleHide = () => {
    setShow(false);
  };

  return {
    show,
    title,
    body,
    onConfirm,
    handleShow,
    handleHide,
  };
};

export { ConfirmationModal, useConfirmationModal };