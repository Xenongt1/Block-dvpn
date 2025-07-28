import React, { createContext, useContext, useState, useCallback } from 'react';

interface VPNContextType {
  connectedNodeAddress: string | null;
  isConnecting: boolean;
  setConnectedNodeAddress: (address: string | null) => void;
  setIsConnecting: (isConnecting: boolean) => void;
}

const VPNContext = createContext<VPNContextType | undefined>(undefined);

export const VPNProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectedNodeAddress, setConnectedNodeAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  return (
    <VPNContext.Provider
      value={{
        connectedNodeAddress,
        isConnecting,
        setConnectedNodeAddress,
        setIsConnecting,
      }}
    >
      {children}
    </VPNContext.Provider>
  );
};

export const useVPNContext = () => {
  const context = useContext(VPNContext);
  if (context === undefined) {
    throw new Error('useVPNContext must be used within a VPNProvider');
  }
  return context;
}; 