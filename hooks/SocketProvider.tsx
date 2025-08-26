'use client';

import React, { createContext, useContext } from 'react';
import { useSocket } from './useSocket';

const SocketContext = createContext<ReturnType<typeof useSocket> | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketValue = useSocket();
  
  return (
    <SocketContext.Provider value={socketValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within a SocketProvider');
  return ctx;