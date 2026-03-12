import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useVibration } from '../contexts/VibrationContext';
import { useExpandMode } from '../contexts/ExpandModeContext';

export const MainMenu: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { vibrationEnabled, toggleVibration } = useVibration();
  const { expandMode, toggleExpandMode } = useExpandMode();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeToggle = () => {
    toggleTheme();
    setIsOpen(false);
  };

  const handleVibrationToggle = () => {
    toggleVibration();
    setIsOpen(false);
  };

  const handleExpandModeToggle = () => {
    toggleExpandMode();
    setIsOpen(false);
  };

  return (
    <div className="main-menu">
      <button className="menu-button" onClick={() => setIsOpen(!isOpen)}>
        ☰
      </button>
      {isOpen && (
        <div className="menu-dropdown">
          <button onClick={handleThemeToggle}>
            {theme === 'dark' ? '🔆': '🌙'} עבור למראה { theme === 'dark' ? 'בהיר': 'כהה'}
          </button>
          <button onClick={handleVibrationToggle}>
            {vibrationEnabled ? '📳' : '🔕'} רטט {vibrationEnabled ? 'פעיל' : 'כבוי'}
          </button>
          <button onClick={handleExpandModeToggle}>
            {expandMode === 'אחד' ? '📂' : '📁'} קטגוריות פתוחות: {expandMode}
          </button>
        </div>
      )}
    </div>
  );
};
