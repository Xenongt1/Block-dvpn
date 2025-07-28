declare global {
  interface Window {
    ethereum: Ethereum;
  }
}

export interface Ethereum {
  isMetaMask?: boolean;
  enable: () => Promise<string[]>;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
}

export {}; 