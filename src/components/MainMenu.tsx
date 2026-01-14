import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const MainMenu: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    toggleTheme();
    setIsOpen(false); // Close menu after selection
  };
  console.log ('debug - in mainmenu', {theme})

  return (
    <div className="main-menu">
      <button className="menu-button" onClick={() => setIsOpen(!isOpen)}>
        ☰
      </button>
      {isOpen && (
        <div className="menu-dropdown">
          <button onClick={handleToggle}>
            {/* Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode */}
            {theme === 'dark' ? '🔆': '🌙'} עבור למראה { theme === 'dark' ? 'בהיר': 'כהה'}
          </button>
        </div>
      )}
    </div>
  );
};
