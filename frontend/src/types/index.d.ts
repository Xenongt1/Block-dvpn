export interface RequestArguments {
  method: string;
  params?: any[] | undefined;
}

export interface Ethereum {
  isMetaMask?: boolean;
  request: (args: RequestArguments) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Ethereum;
  }
}

export {}; 