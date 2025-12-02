/**
 * Arrow key navigation for lists and grids.
 * Handles direction and looping behaviour.
 */
import { useEffect, useState, useCallback, useRef } from 'react';

export interface UseKeyboardNavigationOptions {
  direction?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  selectOnFocus?: boolean;
}

export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options: UseKeyboardNavigationOptions = {}
) {
  const {
    direction = 'both',
    loop = true,
    selectOnFocus = false
  } = options;

  const [currentIndex, setCurrentIndex] = useState(-1);
  const currentIndexRef = useRef(currentIndex);

  // Keep ref in sync with state to avoid stale closures
  useEffect(() => {    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Focus a specific item
  const setFocus = useCallback((index: number) => {
    if (items[index]) {
      items[index].focus();      setCurrentIndex(index);    }
  }, [items]);

  // Navigate to next/previous/first/last item
  const moveFocus = useCallback((direction: 'next' | 'previous' | 'first' | 'last') => {
    if (!items.length) return;

    let newIndex = currentIndexRef.current;

    switch (direction) {
      case 'next':
        newIndex = currentIndexRef.current + 1;
        if (newIndex >= items.length) {
          newIndex = loop ? 0 : items.length - 1;
        }
        break;
      case 'previous':
        newIndex = currentIndexRef.current - 1;
        if (newIndex < 0) {
          newIndex = loop ? items.length - 1 : 0;
        }
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = items.length - 1;
        break;
    }    setFocus(newIndex);
  }, [items, loop, setFocus]);

  /**
   * Keyboard event handler for processing navigation keys.
   * 
   * Processes arrow keys, Home/End, and Enter/Space based on the configured direction.
   * Prevents default browser scrolling behaviour for handled keys.
   * 
   * @param {KeyboardEvent} event - The keyboard event to handle
   * @returns {boolean} True if the event was handled, false otherwise
   * 
   * @remarks
   * Attach this handler to the container element or document to enable keyboard navigation.
   * The handler only processes keys relevant to the configured direction.
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!items.length) return;

    const { key } = event;
    let handled = false;

    // Arrow key navigation
    if (direction === 'horizontal' || direction === 'both') {
      if (key === 'ArrowLeft') {
        event.preventDefault();
        moveFocus('previous');
        handled = true;
      } else if (key === 'ArrowRight') {
        event.preventDefault();
        moveFocus('next');
        handled = true;
      }
    }

    if (direction === 'vertical' || direction === 'both') {
      if (key === 'ArrowUp') {
        event.preventDefault();
        moveFocus('previous');
        handled = true;
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        moveFocus('next');
        handled = true;
      }
    }

    // Home/End keys
    if (key === 'Home') {
      event.preventDefault();
      moveFocus('first');
      handled = true;
    } else if (key === 'End') {
      event.preventDefault();
      moveFocus('last');
      handled = true;
    }

    // Enter/Space activation
    if ((key === 'Enter' || key === ' ') && selectOnFocus && currentIndexRef.current >= 0) {
      event.preventDefault();
      const currentItem = items[currentIndexRef.current];
      if (currentItem) {
        currentItem.click();
      }      handled = true;
    }

    return handled;
  }, [items, direction, moveFocus, selectOnFocus]);

  // Set initial focus on mount or when items change
  const initializeFocus = useCallback((startIndex = 0) => {
    if (items.length > 0) {
      setFocus(startIndex);
    }
  }, [items, setFocus]);

  return {
    currentIndex,
    setFocus,
    moveFocus,
    handleKeyDown,
    initializeFocus
  };
}

export default useKeyboardNavigation;
