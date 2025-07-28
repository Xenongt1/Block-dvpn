declare module 'web3modal' {
  interface Web3ModalOptions {
    cacheProvider?: boolean;
    providerOptions?: any;
    theme?: string;
  }

  class Web3Modal {
    constructor(options: Web3ModalOptions);
    connect(): Promise<any>;
    clearCachedProvider(): void;
    on(event: string, callback: (result: any) => void): void;
    off(event: string, callback: (result: any) => void): void;
  }

  export = Web3Modal;
} 