import { afterEach, describe, expect, it, vi } from "vitest";

const API_BASE_URL = "https://api.example.com";

const loadTransport = async () => {
  vi.resetModules();
  vi.doMock("../../src/config", () => ({
    API_BASE_URL,
    getApiBaseUrl: () => API_BASE_URL,
    getOpenAIApiKey: () => "",
    OPENAI_BETA_FEATURES: "assistants=v2",
    OPENAI_API_KEY: "",
  }));

  return import("../../src/utils/transport");
};

describe("JSON transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends JSON requests through the shared request builder", async () => {
    const { apiJsonRequest } = await loadTransport();
    const responseData = { ok: true };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await apiJsonRequest<typeof responseData>({
      path: "v1/models",
      method: "POST",
      body: { query: "m" },
    });

    expect(result).toEqual(responseData);
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/v1/models`, {
      method: "POST",
      body: JSON.stringify({ query: "m" }),
      headers: expect.objectContaining({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      signal: undefined,
    });
  });

  it("uses the shared error handler adapter for failed JSON requests", async () => {
    const { apiJsonRequest } = await loadTransport();
    const response = new Response(JSON.stringify({ error: "Nope" }), {
      status: 400,
      statusText: "Bad Request",
      headers: { "content-type": "application/json" },
    });
    const errorHandler = {
      extractMessage: vi.fn(() => "Adapted JSON failure"),
      handle: vi.fn(),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await expect(
      apiJsonRequest({
        path: "/bad",
        errorHandler,
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "Adapted JSON failure",
      status: 400,
      data: { error: "Nope" },
    });

    expect(errorHandler.extractMessage).toHaveBeenCalledWith(response, {
      error: "Nope",
    });
    expect(errorHandler.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ApiError",
        message: "Adapted JSON failure",
      }),
    );
  });
});
