import "@testing-library/jest-dom/vitest";

type BufferLike = {
  from(input: string, encoding: string): { toString(encoding: string): string };
};

const getBuffer = (): BufferLike | undefined =>
  (globalThis as { Buffer?: BufferLike }).Buffer;

if (typeof globalThis.btoa !== "function") {
  const buffer = getBuffer();

  globalThis.btoa = (value: string) => {
    if (buffer) {
      return buffer.from(value, "binary").toString("base64");
    }
    throw new Error("btoa is not supported");
  };
}

type StorageLike = {
  length: number;
  clear: () => void;
  getItem: (key: string) => string | null;
  key: (index: number) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

const createMemoryStorage = (): StorageLike => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
};

const needsStorageShim = () => {
  try {
    const storage = (window as unknown as { localStorage?: unknown }).localStorage as
      | Partial<StorageLike>
      | undefined;
    return (
      !storage ||
      typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function" ||
      typeof storage.removeItem !== "function" ||
      typeof storage.clear !== "function"
    );
  } catch {
    return true;
  }
};

if (typeof window !== "undefined" && needsStorageShim()) {
  Object.defineProperty(window, "localStorage", {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  });
}
