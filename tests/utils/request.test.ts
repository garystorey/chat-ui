import { describe, expect, it, vi } from "vitest";

const loadRequestModule = async (
  configOverrides: Partial<{ apiKey: string; beta: string }> = {},
) => {
  vi.resetModules();
  vi.doMock("../../src/config", () => ({
    getApiBaseUrl: () => "https://api.example.com",
    getOpenAIApiKey: () => configOverrides.apiKey ?? "",
    OPENAI_BETA_FEATURES: configOverrides.beta ?? "assistants=v2",
  }));

  return import("../../src/utils/request");
};

describe("request utilities", () => {
  it("identifies JSON-like values while guarding against known non-JSON types", async () => {
    const { isJsonLike } = await loadRequestModule();

    expect(isJsonLike({})).toBe(true);
    expect(isJsonLike([])).toBe(true);
    expect(isJsonLike(new FormData())).toBe(false);
    expect(isJsonLike(new URLSearchParams())).toBe(false);
    expect(isJsonLike(new Blob())).toBe(false);
    expect(isJsonLike("string")).toBe(false);
    expect(isJsonLike(null)).toBe(false);
  });

  it("parses JSON responses safely and throws on malformed payloads", async () => {
    const { parseJson } = await loadRequestModule();

    const validResponse = new Response(JSON.stringify({ ok: true }));
    await expect(parseJson(validResponse)).resolves.toEqual({ ok: true });

    const emptyResponse = new Response("");
    await expect(parseJson(emptyResponse)).resolves.toBeNull();

    const invalidResponse = new Response("{oops");
    await expect(parseJson(invalidResponse)).rejects.toThrow(
      "Failed to parse server response as JSON",
    );
  });

  it("exposes ApiError metadata for downstream handling", async () => {
    const { ApiError } = await loadRequestModule();

    const error = new ApiError("Bad Request", 400, { reason: "Invalid" });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("Bad Request");
    expect(error.status).toBe(400);
    expect(error.data).toEqual({ reason: "Invalid" });
  });

  it("builds JSON requests with default headers and OpenAI-specific values when configured", async () => {
    const { buildRequest } = await loadRequestModule({
      apiKey: "secret",
      beta: "beta-flag",
    });

    const result = buildRequest({
      path: "v1/resource",
      method: "POST",
      body: { query: "hi" },
    });

    expect(result.url).toBe("https://api.example.com/v1/resource");
    expect(result.requestBody).toBe(JSON.stringify({ query: "hi" }));
    expect(result.requestHeaders.Authorization).toBe("Bearer secret");
    expect(result.requestHeaders["OpenAI-Beta"]).toBe("beta-flag");
    expect(result.requestHeaders["Content-Type"]).toBe("application/json");
    expect(result.method).toBe("POST");
  });

  it("respects existing headers and bypasses JSON serialization for string bodies", async () => {
    const { buildRequest } = await loadRequestModule();

    const result = buildRequest({
      path: "/plain",
      method: "PUT",
      body: "raw-body",
      headers: {
        Authorization: "Bearer provided",
        "Content-Type": "text/plain",
      },
    });

    expect(result.url).toBe("https://api.example.com/plain");
    expect(result.requestBody).toBe("raw-body");
    expect(result.requestHeaders.Authorization).toBe("Bearer provided");
    expect(result.requestHeaders["Content-Type"]).toBe("text/plain");
  });
});
