import { useState } from 'react';

// A simple, UI-agnostic confirmation modal hook that callers can combine
// with their own modal implementation. This avoids depending on
// external UI libraries like react-bootstrap.

export interface ConfirmationState {
  show: boolean;
  title: string;
  body: string;
  onConfirm: () => void;
}

export const useConfirmationModal = () => {
  const [state, setState] = useState<ConfirmationState>({
    show: false,
    title: '',
    body: '',
    onConfirm: () => {},
  });

  const handleShow = (title: string, body: string, onConfirm: () => void) => {
    setState({ show: true, title, body, onConfirm });
  };

  const handleHide = () => {
    setState(prev => ({ ...prev, show: false }));
  };

  return {
    ...state,
    handleShow,
    handleHide,
  };
};

// If a component wants a concrete modal UI, it can import this hook
// and render its own dialog using the returned state. This file no longer
// depends on 'react-bootstrap'.