'use client';

import React from 'react';

// Carbon styles are imported via SCSS in globals.css
// This provider sets up any Carbon context needed

interface CarbonProviderProps {
  children: React.ReactNode;
}

export function CarbonProvider({ children }: CarbonProviderProps) {
  return (
    <>
      {children}
    </>
  );
}
