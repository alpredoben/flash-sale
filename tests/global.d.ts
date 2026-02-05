// Type declarations for testing utilities

declare global {
  namespace NodeJS {
    interface Global {
      sleep: (ms: number) => Promise<void>;
    }
  }

  var sleep: (ms: number) => Promise<void>;
}

export {};
