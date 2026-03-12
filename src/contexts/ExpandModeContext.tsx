import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react';

export type ExpandMode = 'אחד' | 'חופשי';

interface ExpandModeContextType {
  expandMode: ExpandMode;
  toggleExpandMode: () => void;
}

const ExpandModeContext = createContext<ExpandModeContextType | undefined>(undefined);

interface ExpandModeProviderProps {
  children: ReactNode;
}

export const ExpandModeProvider: React.FC<ExpandModeProviderProps> = ({ children }) => {
  const [expandMode, setExpandMode] = useState<ExpandMode>(() => {
    const saved = localStorage.getItem('expand_mode');
    return (saved === 'חופשי' ? 'חופשי' : 'אחד') as ExpandMode;
  });

  useEffect(() => {
    localStorage.setItem('expand_mode', expandMode);
  }, [expandMode]);

  const toggleExpandMode = () => {
    setExpandMode(prev => (prev === 'אחד' ? 'חופשי' : 'אחד'));
  };

  return (
    <ExpandModeContext.Provider value={{ expandMode, toggleExpandMode }}>
      {children}
    </ExpandModeContext.Provider>
  );
};

export const useExpandMode = () => {
  const context = useContext(ExpandModeContext);
  if (context === undefined) {
    throw new Error('useExpandMode must be used within an ExpandModeProvider');
  }
  return context;
};
