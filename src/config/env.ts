export const readViteEnv = (key: string): string | undefined => {
  try {
    return (import.meta as unknown as { env?: Record<string, string> }).env?.[
      key
    ];
  } catch (error) {
    return undefined;
  }
};

export const readViteBooleanEnv = (key: string, fallback = false) => {
  const value = readViteEnv(key);
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  return fallback;
};

export const readViteIntegerEnv = (key: string, fallback: number) => {
  const value = readViteEnv(key);
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};
