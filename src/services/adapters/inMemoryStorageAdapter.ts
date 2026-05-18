export const createInMemoryStorageAdapter = () => {
  const store = new Map<string, string>();

  const adapter = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  } as const;

  return adapter;
};

export default createInMemoryStorageAdapter;
