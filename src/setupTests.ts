import '@testing-library/jest-dom/vitest';

type BufferLike = {
  from(input: string, encoding: string): { toString(encoding: string): string };
};

const getBuffer = (): BufferLike | undefined => (globalThis as { Buffer?: BufferLike }).Buffer;

if (typeof globalThis.btoa !== 'function') {
  const buffer = getBuffer();

  globalThis.btoa = (value: string) => {
    if (buffer) {
      return buffer.from(value, 'binary').toString('base64');
    }
    throw new Error('btoa is not supported');
  };
}
