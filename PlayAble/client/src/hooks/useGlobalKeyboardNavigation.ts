import { useEffect, useCallback } from 'react';

/**
 * Global keyboard navigation - automatically handles arrow keys, Home/End, etc.
 * Works across the whole app without manual setup for each page.
 */
export function useGlobalKeyboardNavigation() {
  // Find all focusable elements currently visible
  const findFocusableElements = useCallback((): HTMLElement[] => {
    const selectors = [
      'a[href]:not([tabindex="-1"]):not([disabled])',
      'button:not([tabindex="-1"]):not([disabled])',
      'input:not([tabindex="-1"]):not([disabled])',
      'select:not([tabindex="-1"]):not([disabled])',
      'textarea:not([tabindex="-1"]):not([disabled])',
      '[tabindex="0"]',
      '[role="button"]:not([tabindex="-1"]):not([disabled])',
      '[role="menuitem"]:not([tabindex="-1"]):not([disabled])',
      '[role="gridcell"]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]'
    ].join(', ');

    const elements = document.querySelectorAll(selectors) as NodeListOf<HTMLElement>;
    return Array.from(elements).filter(element => {
      // Filter out hidden or non-interactive elements
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        !element.hasAttribute('hidden')
      );    });  }, []);

  // Get focusable elements within a container
  const findElementsInContainer = useCallback((container: Element): HTMLElement[] => {
    const allElements = findFocusableElements();
    return allElements.filter(element => container.contains(element));  }, [findFocusableElements]);

  // Work out what kind of navigation context we're in (navbar, grid, etc.)
  const getNavigationContext = useCallback((element: HTMLElement) => {
    // Determine if element is part of a navigation group
    const navbar = element.closest('.navbar__nav-list, [role="menubar"]');
    const footer = element.closest('.site-footer__links');
    const grid = element.closest('.browse-page__grid, [role="grid"]');
    const toolbar = element.closest('[role="toolbar"]');
    const menu = element.closest('[role="menu"]');
    
    if (navbar) return { type: 'navbar', container: navbar, direction: 'horizontal' };
    if (footer) return { type: 'footer', container: footer, direction: 'horizontal' };
    if (grid) return { type: 'grid', container: grid, direction: 'both' };
    if (toolbar) return { type: 'toolbar', container: toolbar, direction: 'horizontal' };
    if (menu) return { type: 'menu', container: menu, direction: 'vertical' };      return null;  }, []);

  // Move focus to another element, with looping at boundaries
  const navigateInContext = useCallback((
    currentElement: HTMLElement, 
    direction: 'next' | 'previous' | 'up' | 'down' | 'first' | 'last',
    context: { type: string; container: Element; direction: string }
  ) => {
    const elements = findElementsInContainer(context.container);
    const currentIndex = elements.indexOf(currentElement);
    
    if (currentIndex === -1) return false;

    let targetIndex = currentIndex;

    switch (direction) {
      case 'next':
      case 'down':
        targetIndex = currentIndex + 1;
        if (targetIndex >= elements.length) targetIndex = 0; // Loop to beginning
        break;
        
      case 'previous':
      case 'up':
        targetIndex = currentIndex - 1;
        if (targetIndex < 0) targetIndex = elements.length - 1; // Loop to end
        break;
        
      case 'first':
        targetIndex = 0;
        break;
        
      case 'last':
        targetIndex = elements.length - 1;
        break;
    }

    if (targetIndex >= 0 && targetIndex < elements.length) {
      elements[targetIndex].focus();
      return true;
    }
      return false;  }, [findElementsInContainer]);

  /**
   * Global keyboard event handler that processes all keyboard interactions.
   * Handles arrow keys, Home/End, Enter/Space, and Escape based on the current context.
   */
  const handleGlobalKeyDown = useCallback((event: KeyboardEvent) => {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return;

    // Don't interfere with text input fields where users are typing
    if (
      activeElement.tagName === 'INPUT' && 
      ['text', 'search', 'email', 'password', 'url'].includes((activeElement as HTMLInputElement).type)
    ) return;
    
    if (activeElement.tagName === 'TEXTAREA') return;
    if (activeElement.contentEditable === 'true') return;

    const context = getNavigationContext(activeElement);
    if (!context) return;    let handled = false;

    // Handle keyboard navigation based on the key pressed
    switch (event.key) {
      case 'ArrowLeft':
        // Navigate to previous item in horizontal layouts (navbar, footer, toolbar)
        if (context.direction === 'horizontal' || context.direction === 'both') {
          handled = navigateInContext(activeElement, 'previous', context);
        }
        break;
        
      case 'ArrowRight':
        // Navigate to next item in horizontal layouts
        if (context.direction === 'horizontal' || context.direction === 'both') {
          handled = navigateInContext(activeElement, 'next', context);
        }
        break;
        
      case 'ArrowUp':
        // Navigate to previous item in vertical layouts (menus, grids)
        if (context.direction === 'vertical' || context.direction === 'both') {
          handled = navigateInContext(activeElement, 'up', context);
        }
        break;
        
      case 'ArrowDown':
        // Navigate to next item in vertical layouts
        if (context.direction === 'vertical' || context.direction === 'both') {
          handled = navigateInContext(activeElement, 'down', context);
        }
        // Special case: open dropdown menus when pressing down on a menu trigger
        if (context.type === 'navbar' && activeElement.getAttribute('aria-haspopup') === 'menu') {
          activeElement.click();
          handled = true;
        }
        break;
        
      case 'Home':
        // Jump to first item in the navigation group
        handled = navigateInContext(activeElement, 'first', context);        break;
        
      case 'End':
        // Jump to last item in the navigation group
        handled = navigateInContext(activeElement, 'last', context);
        break;
        
      case 'Enter':
      case ' ':
        // Activate buttons, links, and menu items when Enter or Space is pressed
        if (
          activeElement.tagName === 'BUTTON' ||
          activeElement.tagName === 'A' ||
          activeElement.getAttribute('role') === 'button' ||
          activeElement.getAttribute('role') === 'menuitem'
        ) {
          event.preventDefault();
          activeElement.click();
          handled = true;
        }
        break;
          case 'Escape':
        // Close open dropdowns/menus and return focus to the trigger element
        const openDropdown = document.querySelector('[aria-expanded="true"]') as HTMLElement;
        if (openDropdown) {
          openDropdown.setAttribute('aria-expanded', 'false');
          openDropdown.focus();
          handled = true;
        }
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();    }
  }, [getNavigationContext, navigateInContext]);

  // Set up global keyboard event listener when component mounts
  useEffect(() => {
    // Use capture phase (true) to ensure we handle events before they bubble
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    
    // Clean up event listener when component unmounts
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [handleGlobalKeyDown]);

  return {
    findFocusableElements,
    getNavigationContext
  };
}

export default useGlobalKeyboardNavigation;
