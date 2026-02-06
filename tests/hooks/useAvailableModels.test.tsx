import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const loadUseAvailableModels = async () => {
  vi.resetModules();
  vi.doMock("../../src/utils", async () => {
    const actual =
      await vi.importActual<typeof import("../../src/utils")>(
        "../../src/utils",
      );

    return {
      ...actual,
      buildRequest: () => ({
        url: "https://api.example.com/v1/models",
        requestHeaders: {},
        requestBody: undefined,
        method: "GET",
        signal: undefined,
      }),
    };
  });

  return import("../../src/hooks/useAvailableModels");
};

describe("useAvailableModels", () => {
  const originalFetch = globalThis.fetch;

  const resetLocalStorage = () => {
    try {
      const storage = window.localStorage as unknown as {
        clear?: () => void;
        length?: number;
        key?: (index: number) => string | null;
        removeItem?: (key: string) => void;
      };

      storage.removeItem?.("chat-ui-selected-model");

      if (typeof storage.clear === "function") {
        storage.clear();
        return;
      }

      if (
        typeof storage.length === "number" &&
        typeof storage.key === "function" &&
        typeof storage.removeItem === "function"
      ) {
        for (let i = storage.length - 1; i >= 0; i -= 1) {
          const key = storage.key(i);
          if (key) {
            storage.removeItem(key);
          }
        }
      }
    } catch {}
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetLocalStorage();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const stubFetchModels = (payload: unknown) => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;
  };

  it("selects stored model when it exists in the fetched model list", async () => {
    const { default: useAvailableModels, SELECTED_MODEL_STORAGE_KEY } =
      await loadUseAvailableModels();

    window.localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, "m2");

    stubFetchModels({
      object: "list",
      data: [{ id: "m1" }, { id: "m2" }],
    });

    const setAvailableModels = vi.fn();
    const setSelectedModel = vi.fn();
    const setIsLoadingModels = vi.fn();

    renderHook(() =>
      useAvailableModels({
        connectionStatus: "online",
        refreshKey: 0,
        setAvailableModels,
        setSelectedModel,
        setIsLoadingModels,
      }),
    );

    await waitFor(() => {
      expect(setSelectedModel).toHaveBeenCalled();
    });

    const updater = setSelectedModel.mock.calls.at(-1)?.[0] as (
      current: string,
    ) => string;

    expect(updater("")).toBe("m2");
  });

  it("ignores stored model when it is not in the fetched list and falls back to the first model", async () => {
    const { default: useAvailableModels, SELECTED_MODEL_STORAGE_KEY } =
      await loadUseAvailableModels();

    window.localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, "m2");

    stubFetchModels({
      object: "list",
      data: [{ id: "m1" }, { id: "m3" }],
    });

    const setAvailableModels = vi.fn();
    const setSelectedModel = vi.fn();
    const setIsLoadingModels = vi.fn();

    renderHook(() =>
      useAvailableModels({
        connectionStatus: "online",
        refreshKey: 0,
        setAvailableModels,
        setSelectedModel,
        setIsLoadingModels,
      }),
    );

    await waitFor(() => {
      expect(setSelectedModel).toHaveBeenCalled();
    });

    const updater = setSelectedModel.mock.calls.at(-1)?.[0] as (
      current: string,
    ) => string;

    expect(updater("")).toBe("m1");
  });

  it("keeps the current selected model when it still exists in the fetched list", async () => {
    const { default: useAvailableModels } = await loadUseAvailableModels();

    stubFetchModels({
      object: "list",
      data: [{ id: "m1" }, { id: "m2" }],
    });

    const setAvailableModels = vi.fn();
    const setSelectedModel = vi.fn();
    const setIsLoadingModels = vi.fn();

    renderHook(() =>
      useAvailableModels({
        connectionStatus: "online",
        refreshKey: 0,
        setAvailableModels,
        setSelectedModel,
        setIsLoadingModels,
      }),
    );

    await waitFor(() => {
      expect(setSelectedModel).toHaveBeenCalled();
    });

    const updater = setSelectedModel.mock.calls.at(-1)?.[0] as (
      current: string,
    ) => string;

    expect(updater("m2")).toBe("m2");
  });

  it("prefers server-reported loaded model over stored model", async () => {
    const { default: useAvailableModels, SELECTED_MODEL_STORAGE_KEY } =
      await loadUseAvailableModels();

    window.localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, "m2");

    stubFetchModels({
      object: "list",
      current_model: "m1",
      data: [{ id: "m1" }, { id: "m2" }],
    });

    const setAvailableModels = vi.fn();
    const setSelectedModel = vi.fn();
    const setIsLoadingModels = vi.fn();

    renderHook(() =>
      useAvailableModels({
        connectionStatus: "online",
        refreshKey: 0,
        setAvailableModels,
        setSelectedModel,
        setIsLoadingModels,
      }),
    );

    await waitFor(() => {
      expect(setSelectedModel).toHaveBeenCalled();
    });

    const updater = setSelectedModel.mock.calls.at(-1)?.[0] as (
      current: string,
    ) => string;

    expect(updater("")).toBe("m1");
  });
});
