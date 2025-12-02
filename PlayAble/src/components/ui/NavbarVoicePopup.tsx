import React from 'react';

export interface VoicePopupProps {
  isOpen: boolean;
}

const NavbarVoicePopup: React.FC<VoicePopupProps> = ({ isOpen }) => {
  if (!isOpen) return null;
  return (
    <div className="voice-popup" aria-label="Voice listening popup">
      {/* Empty placeholder popup for future implementation */}
    </div>
  );
};

export default NavbarVoicePopup;
