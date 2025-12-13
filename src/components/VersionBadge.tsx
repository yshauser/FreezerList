// src/components/VersionBadge.tsx
import React from 'react';

export const VersionBadge: React.FC = () => {
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
  return (
    <div className="app-version" dir="ltr" aria-label="גרסת האפליקציה">
      {version ? `v${version}` : 'v?'}
    </div>
  );
};
