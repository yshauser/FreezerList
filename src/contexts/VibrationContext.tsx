import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react';

interface VibrationContextType {
  vibrationEnabled: boolean;
  toggleVibration: () => void;
}

const VibrationContext = createContext<VibrationContextType | undefined>(undefined);

interface VibrationProviderProps {
  children: ReactNode;
}

export const VibrationProvider: React.FC<VibrationProviderProps> = ({ children }) => {
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => {
    const savedVibration = localStorage.getItem('vibration_enabled');
    return savedVibration !== null ? savedVibration === 'true' : true; // Default to true
  });

  useEffect(() => {
    localStorage.setItem('vibration_enabled', String(vibrationEnabled));
  }, [vibrationEnabled]);

  const toggleVibration = () => {
    setVibrationEnabled((prev) => !prev);
  };

  return (
    <VibrationContext.Provider value={{ vibrationEnabled, toggleVibration }}>
      {children}
    </VibrationContext.Provider>
  );
};

export const useVibration = () => {
  const context = useContext(VibrationContext);
  if (context === undefined) {
    throw new Error('useVibration must be used within a VibrationProvider');
  }
  return context;
};
