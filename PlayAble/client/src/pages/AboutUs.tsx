import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { applyAccessibilityPreferences, DEFAULT_HIGH_CONTRAST_THEME } from '../utils/accessibility';

/**
 * Props for the AboutUs page component.
 * @interface AboutUsProps
 * @property {function} [onNavigate] - Optional navigation callback for in-app navigation
 */
interface AboutUsProps {
  onNavigate?: (path: string) => void;
}

/**
 * About Us page component explaining the platform's mission and accessibility features.
 *
 * @component
 * @param {AboutUsProps} props - Component props
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
 * <AboutUs onNavigate={navigate} />
 */
const AboutUs = ({ onNavigate }: AboutUsProps) => {
  const { userSettings } = useAuth();

  /**
   * Applies accessibility preferences to the document when visual settings change.
   * Updates CSS custom properties and classes to reflect high contrast mode, theme,
   * reduced motion, and dark mode preferences.
   * 
   * @effect
   * @dependencies userSettings
   */
  useEffect(() => {
    if (userSettings) {
      applyAccessibilityPreferences(userSettings);
    } else {
      // For non-logged-in users, check session storage for settings
      const SESSION_STORAGE_KEY = 'playable_session_settings';
      try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const sessionSettings = {
            ...parsed,
            highContrastTheme: parsed.highContrastTheme || DEFAULT_HIGH_CONTRAST_THEME,
          };
          applyAccessibilityPreferences(sessionSettings);
        } else {
          // Apply default preferences (all off)
          applyAccessibilityPreferences({
            highContrastMode: false,
            darkMode: false,
            highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
          });
        }
      } catch (error) {
        console.error('Failed to load session settings:', error);
        // Apply default preferences on error
        applyAccessibilityPreferences({
          highContrastMode: false,
          darkMode: false,
          highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
        });
      }
    }
  }, [userSettings]);

  /**
   * Navigates to the Browse Games page.
   */
  const handleNavigateToBrowse = () => {
    onNavigate?.('/browse');
  };

  /**
   * Navigates to the Accessibility Settings page.
   */
  const handleNavigateToSettings = () => {
    onNavigate?.('/settings');
  };

  /**
   * Navigates to the Report Issue page.
   */
  const handleNavigateToReport = () => {
    onNavigate?.('/report/general');
  };

  return (
    <div className="about-page">
      {/* Page Header */}
      <header className="about-page__header">
        <h1 className="about-page__title">About Accessible Games Platform</h1>
        <p className="about-page__subtitle">
          Breaking down barriers and making gaming accessible for everyone, regardless of ability.
        </p>
      </header>

      {/* Main Content */}
      <div className="about-page__content">
        {/* Section 1: Our Mission */}
        <section className="about-section about-card" aria-labelledby="mission-heading">
          <div className="about-section__icon about-section__icon--blue" aria-hidden="true">
            🎮
          </div>
          <div className="about-section__text">
            <h2 id="mission-heading" className="about-section__heading">
              Our Mission
            </h2>
            <p className="about-section__paragraph">
              We believe that everyone deserves to experience the joy of gaming. The Accessible Games Platform was created to bridge the gap in the market when traditional game stores and platforms often overlook the needs of disabled gamers.
            </p>
          </div>
        </section>

        {/* Section 2: Closing the Gap */}
        <section className="about-section about-card" aria-labelledby="gap-heading">
          <div className="about-section__icon about-section__icon--orange" aria-hidden="true">
            🔧
          </div>
          <div className="about-section__text">
            <h2 id="gap-heading" className="about-section__heading">
              Closing the Gap
            </h2>
            <p className="about-section__paragraph">
              Traditional app stores and game platforms don't adequately help disabled players find games that meet their specific accessibility needs. Users are often left guessing whether a game will be playable for them, leading to frustration and wasted money.
            </p>
            <p className="about-section__paragraph">
              Our platform addresses this by providing comprehensive accessibility information upfront, allowing users to filter and search specifically for games that match their requirements.
            </p>
          </div>
        </section>

        {/* Section 3: Who We Support */}
        <section className="about-section" aria-labelledby="support-heading">
          <h2 id="support-heading" className="about-section__heading about-section__heading--standalone">
            Who We Support
          </h2>
          <p className="about-section__intro">
            Our platform is designed to support gamers with a wide range of accessibility needs:
          </p>

          <div className="about-grid">
            {/* Visual Impairments */}
            <article className="about-grid__card about-grid__card--visual">
              <div className="about-grid__icon" aria-hidden="true">
                👁️
              </div>
              <h3 className="about-grid__heading">Visual Impairments</h3>
              <p className="about-grid__text">
                Games with screen reader support, high contrast modes, colourblind options, and customisable visual settings.
              </p>
            </article>

            {/* Hearing Impairments */}
            <article className="about-grid__card about-grid__card--hearing">
              <div className="about-grid__icon" aria-hidden="true">
                👂
              </div>
              <h3 className="about-grid__heading">Hearing Impairments</h3>
              <p className="about-grid__text">
                Games featuring subtitles, captions, visual sound cues, and audio-independent gameplay.
              </p>
            </article>

            {/* Motor Impairments */}
            <article className="about-grid__card about-grid__card--motor">
              <div className="about-grid__icon" aria-hidden="true">
                ✋
              </div>
              <h3 className="about-grid__heading">Motor Impairments</h3>
              <p className="about-grid__text">
                Games with remappable controls, one-handed modes, adjustable difficulty, and alternative input methods.
              </p>
            </article>

            {/* Cognitive Impairments */}
            <article className="about-grid__card about-grid__card--cognitive">
              <div className="about-grid__icon" aria-hidden="true">
                🧠
              </div>
              <h3 className="about-grid__heading">Cognitive Impairments</h3>
              <p className="about-grid__text">
                Games with simplified interfaces, clear instructions, reduced sensory overload, and adjustable complexity.
              </p>
            </article>

            {/* Speech Impairments */}
            <article className="about-grid__card about-grid__card--speech">
              <div className="about-grid__icon" aria-hidden="true">
                💬
              </div>
              <h3 className="about-grid__heading">Speech Impairments</h3>
              <p className="about-grid__text">
                Games with text chat options, alternative communication methods, and gameplay that doesn't require voice commands.
              </p>
            </article>
          </div>
        </section>

        {/* Section 4: What Makes Us Different */}
        <section className="about-section" aria-labelledby="different-heading">
          <div className="about-section__icon-header">
            <div className="about-section__icon about-section__icon--purple" aria-hidden="true">
              🤖
            </div>
            <h2 id="different-heading" className="about-section__heading">
              What Makes Us Different
            </h2>
          </div>

          <ul className="about-checklist">
            <li className="about-checklist__item">
              <span className="about-checklist__check" aria-hidden="true">
                ✓
              </span>
              <div className="about-checklist__content">
                <strong className="about-checklist__title">Comprehensive Accessibility Tags:</strong>
                <span className="about-checklist__text">
                  {' '}
                  Every game is tagged with detailed accessibility features, making it easy to find exactly what you need.
                </span>
              </div>
            </li>
            <li className="about-checklist__item">
              <span className="about-checklist__check" aria-hidden="true">
                ✓
              </span>
              <div className="about-checklist__content">
                <strong className="about-checklist__title">Advanced Filtering:</strong>
                <span className="about-checklist__text">
                  {' '}
                  Filter by specific accessibility features, genres, ratings, and more to find your perfect game.
                </span>
              </div>
            </li>
            <li className="about-checklist__item">
              <span className="about-checklist__check" aria-hidden="true">
                ✓
              </span>
              <div className="about-checklist__content">
                <strong className="about-checklist__title">Platform Accessibility:</strong>
                <span className="about-checklist__text">
                  {' '}
                  Our platform itself follows WCAG 2.1 AA standards with features like voice commands, keyboard navigation, and screen reader optimisation.
                </span>
              </div>
            </li>
            <li className="about-checklist__item">
              <span className="about-checklist__check" aria-hidden="true">
                ✓
              </span>
              <div className="about-checklist__content">
                <strong className="about-checklist__title">Community-Driven:</strong>
                <span className="about-checklist__text">
                  {' '}
                  Users can report issues and provide feedback to help us continuously improve the platform.
                </span>
              </div>
            </li>
          </ul>
        </section>

        {/* Section 5: Our Commitment */}
        <section className="about-section about-card about-card--commitment" aria-labelledby="commitment-heading">
          <div className="about-section__icon about-section__icon--blue" aria-hidden="true">
            🌟
          </div>
          <div className="about-section__text">
            <h2 id="commitment-heading" className="about-section__heading">
              Our Commitment
            </h2>
            <p className="about-section__paragraph">
              We are committed to maintaining and improving this platform to ensure it remains a valuable resource for the gaming community. We actively listen to user feedback, work to add new features and accessibility options based on real user needs.
            </p>
            <p className="about-section__paragraph about-section__paragraph--emphasis">
              Gaming should be for everyone, and we're here to make that a reality.
            </p>
          </div>
        </section>

        {/* Section 6: Accessibility Standards & Compliance */}
        <section className="about-section" aria-labelledby="standards-heading">
          <h2 id="standards-heading" className="about-section__heading about-section__heading--standalone">
            Accessibility Standards &amp; Compliance
          </h2>

          {/* In Plain Language */}
          <div className="about-info-box">
            <div className="about-info-box__header">
              <span className="about-info-box__icon" aria-hidden="true">
                ℹ️
              </span>
              <h3 className="about-info-box__title">In Plain Language:</h3>
            </div>
            <p className="about-info-box__text">
              This website is designed to work for everyone, including people who use screen readers, keyboard navigation, or voice commands. We follow industry accessibility standards so all features are accessible.
            </p>
          </div>

          {/* WCAG Conformance Statement */}
          <p className="about-section__paragraph">
            This platform conforms to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1</strong> at the <strong>AA level</strong>. This means we meet internationally recognised standards for web accessibility.
          </p>

          {/* WCAG Principles Grid */}
          <div className="about-principles">
            <article className="about-principles__card">
              <span className="about-principles__check" aria-hidden="true">
                ✓
              </span>
              <h3 className="about-principles__heading">Perceivable</h3>
              <p className="about-principles__text">
                All content can be seen or heard, with alternatives for images and captions for videos.
              </p>
            </article>

            <article className="about-principles__card">
              <span className="about-principles__check" aria-hidden="true">
                ✓
              </span>
              <h3 className="about-principles__heading">Operable</h3>
              <p className="about-principles__text">
                Everything works with keyboard, mouse, touch, or voice commands.
              </p>
            </article>

            <article className="about-principles__card">
              <span className="about-principles__check" aria-hidden="true">
                ✓
              </span>
              <h3 className="about-principles__heading">Understandable</h3>
              <p className="about-principles__text">
                Clear language, predictable navigation, and helpful error messages.
              </p>
            </article>

            <article className="about-principles__card">
              <span className="about-principles__check" aria-hidden="true">
                ✓
              </span>
              <h3 className="about-principles__heading">Robust</h3>
              <p className="about-principles__text">
                Works with assistive technologies like screen readers and magnifiers.
              </p>
            </article>
          </div>
        </section>

        {/* Section 7: Platform Accessibility Features */}
        <section className="about-section" aria-labelledby="features-heading">
          <h2 id="features-heading" className="about-section__heading about-section__heading--standalone">
            Platform Accessibility Features
          </h2>

          <ul className="about-checklist">
            <li className="about-checklist__item">
              <span className="about-checklist__check about-checklist__check--blue" aria-hidden="true">
                ✓
              </span>
              <div className="about-checklist__content">
                <strong className="about-checklist__title">Voice Input &amp; Captions:</strong>
                <span className="about-checklist__text"> Enabled by default</span>
              </div>
            </li>
            <li className="about-checklist__item">
              <span className="about-checklist__check about-checklist__check--blue" aria-hidden="true">
                ✓
              </span>
              <div className="about-checklist__content">
                <strong className="about-checklist__title">High Contrast Mode:</strong>
                <span className="about-checklist__text"> Enhanced visibility with stronger colour contrasts</span>
              </div>
            </li>
            <li className="about-checklist__item">
              <span className="about-checklist__check about-checklist__check--blue" aria-hidden="true">
                ✓
              </span>
              <div className="about-checklist__content">
                <strong className="about-checklist__title">Reduced Motion:</strong>
                <span className="about-checklist__text"> Minimise animations for users sensitive to motion</span>
              </div>
            </li>
            <li className="about-checklist__item">
              <span className="about-checklist__check about-checklist__check--blue" aria-hidden="true">
                ✓
              </span>
              <div className="about-checklist__content">
                <strong className="about-checklist__title">Screen Reader Optimisation:</strong>
                <span className="about-checklist__text"> Semantic HTML, ARIA labels, and live regions</span>
              </div>
            </li>
            <li className="about-checklist__item">
              <span className="about-checklist__check about-checklist__check--blue" aria-hidden="true">
                ✓
              </span>
              <div className="about-checklist__content">
                <strong className="about-checklist__title">Keyboard Navigation:</strong>
                <span className="about-checklist__text"> Complete keyboard access with visible focus indicators</span>
              </div>
            </li>
          </ul>

          <p className="about-section__update-notice">
            <strong>Last Updated:</strong> October 22, 2025. We review and update our accessibility practices quarterly to ensure we're meeting current standards and user needs.
          </p>
        </section>

        {/* Section 8: How to Use Voice Commands */}
        <section className="about-section" aria-labelledby="voice-heading">
          <h2 id="voice-heading" className="about-section__heading about-section__heading--standalone">
            How to Use Voice Commands
          </h2>
          <p className="about-section__intro">
            Voice input is enabled by default on our platform. Here's how to use it:
          </p>

          <ol className="about-steps">
            <li className="about-steps__item">
              <div className="about-steps__number" aria-hidden="true">
                1
              </div>
              <div className="about-steps__content">
                <h3 className="about-steps__title">Activate Voice Input:</h3>
                <p className="about-steps__text">
                  Say "Hey Assistant" or press{' '}
                  <kbd className="about-kbd">Ctrl</kbd> + <kbd className="about-kbd">Shift</kbd> +{' '}
                  <kbd className="about-kbd">V</kbd>
                </p>
              </div>
            </li>
            <li className="about-steps__item">
              <div className="about-steps__number" aria-hidden="true">
                2
              </div>
              <div className="about-steps__content">
                <h3 className="about-steps__title">Listen for Confirmation:</h3>
                <p className="about-steps__text">
                  You'll see a microphone icon when the system is listening
                </p>
              </div>
            </li>
            <li className="about-steps__item">
              <div className="about-steps__number" aria-hidden="true">
                3
              </div>
              <div className="about-steps__content">
                <h3 className="about-steps__title">Speak Your Command:</h3>
                <p className="about-steps__text">
                  Say commands like "Go to favourites" or "Open accessibility settings"
                </p>
              </div>
            </li>
          </ol>

          <p className="about-section__note">
            You can disable voice input anytime in{' '}
            <button
              type="button"
              className="about-link-button"
              onClick={handleNavigateToSettings}
            >
              Accessibility Settings
            </button>
          </p>
        </section>

        {/* Section 9: How to Use Keyboard Navigation */}
        <section className="about-section" aria-labelledby="keyboard-heading">
          <div className="about-section__icon-header">
            <div className="about-section__icon about-section__icon--grey" aria-hidden="true">
              ⌨️
            </div>
            <h2 id="keyboard-heading" className="about-section__heading">
              How to Use Keyboard Navigation
            </h2>
          </div>
          <p className="about-section__intro">
            Every feature on this platform can be accessed using only your keyboard. No mouse required!
          </p>

          <h3 className="about-subsection__heading">Essential Keyboard Shortcuts</h3>

          <table className="about-table">
            <thead>
              <tr>
                <th scope="col" className="about-table__header">
                  Key
                </th>
                <th scope="col" className="about-table__header">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="about-table__row">
                <td className="about-table__cell">
                  <kbd className="about-kbd">Tab</kbd>
                </td>
                <td className="about-table__cell">Move to next interactive element</td>
              </tr>
              <tr className="about-table__row">
                <td className="about-table__cell">
                  <kbd className="about-kbd">Shift</kbd> + <kbd className="about-kbd">Tab</kbd>
                </td>
                <td className="about-table__cell">Move to previous interactive element</td>
              </tr>
              <tr className="about-table__row">
                <td className="about-table__cell">
                  <kbd className="about-kbd">Enter</kbd>
                </td>
                <td className="about-table__cell">Activate buttons and links</td>
              </tr>
              <tr className="about-table__row">
                <td className="about-table__cell">
                  <kbd className="about-kbd">Space</kbd>
                </td>
                <td className="about-table__cell">Toggle switches and checkboxes</td>
              </tr>
              <tr className="about-table__row">
                <td className="about-table__cell">
                  <kbd className="about-kbd">Escape</kbd>
                </td>
                <td className="about-table__cell">Close dialogues and cancel actions</td>
              </tr>
              <tr className="about-table__row">
                <td className="about-table__cell">
                  <kbd className="about-kbd">Arrow Keys</kbd>
                </td>
                <td className="about-table__cell">Navigate menus and options</td>
              </tr>
            </tbody>
          </table>

          <div className="about-tip">
            <span className="about-tip__icon" aria-hidden="true">
              💡
            </span>
            <p className="about-tip__text">
              <strong>Tip:</strong> Look for the blue outline around elements as you navigate. This shows you where your keyboard focus is.
            </p>
          </div>
        </section>

        {/* Section 10: Report Accessibility Issues */}
        <section className="about-section" aria-labelledby="report-heading">
          <h2 id="report-heading" className="about-section__heading about-section__heading--standalone">
            Report Accessibility Issues
          </h2>
          <p className="about-section__intro">
            We take accessibility seriously and want to hear about any problems you encounter. If something isn't working correctly or you need help, please contact us:
          </p>

          <div className="about-contact">
            <div className="about-contact__card">
              <div className="about-contact__icon" aria-hidden="true">
                ✉️
              </div>
              <div className="about-contact__content">
                <h3 className="about-contact__heading">Email Our Accessibility Team</h3>
                <a
                  href="mailto:accessibility@accessiblegames.example"
                  className="about-contact__link"
                >
                  accessibility@accessiblegames.example
                </a>
                <p className="about-contact__note">We aim to respond within 3 business days</p>
              </div>
            </div>
          </div>

          <div className="about-report-form">
            <h3 className="about-subsection__heading">Use Our Report Issue Form</h3>
            <p className="about-section__paragraph">
              Submit detailed reports about accessibility problems, missing features, or suggestions for improvement.
            </p>
            <button
              type="button"
              className="about-button about-button--primary"
              onClick={handleNavigateToReport}
            >
              Report an Issue
            </button>
          </div>

          <div className="about-info-box about-info-box--subtle">
            <h3 className="about-subsection__heading">When reporting an issue, please include:</h3>
            <ul className="about-list">
              <li>What you were trying to do</li>
              <li>What happened instead</li>
              <li>What browser and assistive technology you're using</li>
              <li>Any error messages you saw</li>
            </ul>
          </div>
        </section>

        {/* Section 11: Ready to Start Gaming? (CTA) */}
        <section className="about-cta" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="about-cta__heading">
            Ready to Start Gaming?
          </h2>
          <p className="about-cta__text">
            Browse our collection of accessible games and find your next favourite title.
          </p>
          <div className="about-cta__buttons">
            <button
              type="button"
              className="about-button about-button--primary about-button--large"
              onClick={handleNavigateToBrowse}
            >
              <span aria-hidden="true">🎮</span> Browse Games
            </button>
            <button
              type="button"
              className="about-button about-button--secondary about-button--large"
              onClick={handleNavigateToSettings}
            >
              <span aria-hidden="true">⚙️</span> Accessibility Settings
            </button>
            <button
              type="button"
              className="about-button about-button--secondary about-button--large"
              onClick={handleNavigateToReport}
            >
              <span aria-hidden="true">🚩</span> Report an Issue
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
