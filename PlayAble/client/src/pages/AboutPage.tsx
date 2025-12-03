import AboutUs from './AboutUs';

interface AboutPageProps {
  onNavigate?: (path: string) => void;
}

/**
 * About Us page component explaining the platform's mission and accessibility features.
 *
 * @returns {JSX.Element} The About Us page
 *
 * @description
 * Comprehensive informational page covering:
 * - Platform mission and purpose
 * - Target audience (Visual, Auditory, Motor, Cognitive, Speech impairments)
 * - WCAG 2.1 AA compliance statement
 * - Platform accessibility features
 * - Voice command instructions
 * - Keyboard navigation guide
 * - How to report accessibility issues
 * - Call-to-action buttons
 *
 * **Accessibility Features:**
 * - Semantic HTML with proper heading hierarchy
 * - ARIA labels for all sections
 * - Keyboard-accessible navigation buttons
 * - Screen reader optimized content structure
 * - Clear, plain language explanations
 *
 * **Navigation Handlers:**
 * - handleNavigateToBrowse: Routes to /browse
 * - handleNavigateToSettings: Routes to /settings
 * - handleNavigateToReport: Routes to /report/general
 *
 * @example
 * <AboutPage onNavigate={navigate} />
 */
const AboutPage = ({ onNavigate }: AboutPageProps) => {
  return (
    <main className="page-empty" aria-label="About page">
      <AboutUs onNavigate={onNavigate} />
    </main>
  );
};

export default AboutPage;
