/**
 * Skip to main content link - appears at top when you press Tab.
 * Lets keyboard users bypass the navbar.
 */
import React from 'react';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

/**
 * A link that appears at the top of the page when you press Tab.
 * When clicked, it will focus on the element that matches the href.
 * This is useful for bypassing navigation and other elements that
 * are not interesting for keyboard users.
 * @param {string} href - The href of the target element.
 * @param {React.ReactNode} children - The text content of the link.
 */
const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.querySelector(href);
    if (target instanceof HTMLElement) {
      target.focus();
      // Make sure target is focusable
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
    }
  };

  return (
    <a
      href={href}      className="skip-link"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleClick(e as any);
        }
      }}
    >
      {children}
    </a>
  );
};

export default SkipLink;
