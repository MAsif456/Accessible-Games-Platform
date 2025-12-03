import React from 'react';

export interface VoicePopupProps {
  isOpen: boolean;
}

/**
 * A voice popup component that is displayed in the navbar.
 * It is only visible when the isOpen prop is set to true.
 * Currently, it is an empty placeholder popup for future implementation.
 * @param {VoicePopupProps} props - The props for this component.
 * @param {boolean} props.isOpen - Whether the popup is visible or not.
 */
const NavbarVoicePopup: React.FC<VoicePopupProps> = ({ isOpen }) => {
  if (!isOpen) return null;
  return (
    <div className="voice-popup" aria-label="Voice listening popup">
      {/* Empty placeholder popup for future implementation */}
    </div>
  );
};

export default NavbarVoicePopup;
