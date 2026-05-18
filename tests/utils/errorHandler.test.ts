import { describe, expect, it, vi } from "vitest";
import {
  createApiError,
  defaultErrorHandler,
  extractErrorMessage,
  type ErrorHandler,
} from "../../src/utils/adapters";

describe("ErrorHandler adapter", () => {
  it("extracts top-level and nested response messages", () => {
    const response = new Response(null, {
      status: 400,
      statusText: "Bad Request",
    });

    expect(extractErrorMessage(response, { message: "Top level" })).toBe(
      "Top level",
    );
    expect(extractErrorMessage(response, { error: "String error" })).toBe(
      "String error",
    );
    expect(
      extractErrorMessage(response, { error: { message: "Nested error" } }),
    ).toBe("Nested error");
  });

  it("falls back to response status text for unknown error payloads", () => {
    const response = new Response(null, {
      status: 502,
      statusText: "Bad Gateway",
    });

    expect(extractErrorMessage(response, { detail: "ignored" })).toBe(
      "Bad Gateway",
    );
    expect(extractErrorMessage(response, null)).toBe("Bad Gateway");
  });

  it("creates ApiError values and delegates handling through the adapter", () => {
    const response = new Response(null, {
      status: 429,
      statusText: "Too Many Requests",
    });
    const handle = vi.fn();
    const errorHandler: ErrorHandler = {
      extractMessage: () => "Rate limited",
      handle,
    };

    const error = createApiError(response, { error: "ignored" }, errorHandler);

    expect(error).toMatchObject({
      name: "ApiError",
      message: "Rate limited",
      status: 429,
      data: { error: "ignored" },
    });
    expect(handle).toHaveBeenCalledWith(error);
  });

  it("uses a quiet default handler", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    defaultErrorHandler.handle(new Error("quiet"));

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
