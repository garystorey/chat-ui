import '@testing-library/jest-dom/vitest';

declare const Buffer: {
  from: (input: string, encoding: string) => { toString: (encoding: string) => string };
};

if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = (value: string) => Buffer.from(value, 'binary').toString('base64');
}
