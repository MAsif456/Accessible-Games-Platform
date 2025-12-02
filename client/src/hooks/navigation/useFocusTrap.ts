/**
 * Traps focus within a container (for modals, dropdowns, etc.)
 * Stops Tab from escaping to the page behind.
 */
import { useEffect, useRef, useCallback } from 'react';

export interface UseFocusTrapOptions {
  isActive: boolean;
  initialFocus?: 'first' | 'last' | HTMLElement | null;
  restoreFocus?: boolean;
}

export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions
) {
  const {
    isActive,
    initialFocus = 'first',
    restoreFocus = true
  } = options;
  const containerRef = useRef<T>(null);
  const previousActiveElementRef = useRef<Element | null>(null);

  // Get all focusable elements in the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableElementsSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    const elements = containerRef.current.querySelectorAll(focusableElementsSelector) as NodeListOf<HTMLElement>;
    return Array.from(elements).filter(element => {
      return element.offsetWidth > 0 && 
             element.offsetHeight > 0 && 
             !element.hasAttribute('hidden') &&             window.getComputedStyle(element).visibility !== 'hidden';    });  }, []);

  // Focus the initial element when trap activates
  const setInitialFocus = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    let elementToFocus: HTMLElement | undefined;

    if (initialFocus === 'first') {
      elementToFocus = focusableElements[0];
    } else if (initialFocus === 'last') {
      elementToFocus = focusableElements[focusableElements.length - 1];
    } else if (initialFocus instanceof HTMLElement) {
      elementToFocus = initialFocus;
    }

    if (elementToFocus) {      elementToFocus.focus();    }  }, [getFocusableElements, initialFocus]);

  // Handle Tab/Shift+Tab to trap focus
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (activeElement === firstElement || !focusableElements.includes(activeElement)) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab (forward)
      if (activeElement === lastElement || !focusableElements.includes(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }    }  }, [isActive, getFocusableElements]);

  /**
   * Handles Escape key for modal dismissal.
   */
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isActive) {
      // Allow parent components to handle escape
      return false;
    }  }, [isActive]);

  // Set up and tear down the focus trap
  useEffect(() => {
    if (isActive) {
      // Store the currently focused element so we can return to it later
      previousActiveElementRef.current = document.activeElement;
      
      // Set initial focus based on configuration
      setInitialFocus();
      
      // Add keyboard event listeners for Tab trapping
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keydown', handleEscapeKey);
    } else {
      // Restore focus to the previously focused element when trap deactivates
      if (restoreFocus && previousActiveElementRef.current instanceof HTMLElement) {
        previousActiveElementRef.current.focus();
      }
    }

    // Clean up event listeners when component unmounts or trap deactivates
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isActive, handleKeyDown, handleEscapeKey, setInitialFocus, restoreFocus]);

  return {
    containerRef,
    setInitialFocus,
    getFocusableElements
  };
}

export default useFocusTrap;
