import { describe, expect, it } from "vitest";
import {
  truncate,
  normalizeWhitespace,
  getPlainTextFromHtml,
} from "../../src/utils/text";

describe("text utilities", () => {
  it("truncates long strings and leaves short strings untouched", () => {
    expect(truncate("", 10)).toBe("");
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("lorem ipsum dolor sit amet", 10)).toBe("lorem ips…");
  });

  it("normalizes whitespace sequences", () => {
    expect(normalizeWhitespace("foo\n\nbar\t baz")).toBe("foo bar baz");
  });

  it("derives text content from HTML markup when DOM is available", () => {
    expect(getPlainTextFromHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world",
    );
  });

  it("falls back to a regex-based implementation when DOM globals are missing", () => {
    const globalRef = globalThis as typeof globalThis & {
      window?: typeof window;
      document?: typeof document;
    };
    const originalWindow = globalRef.window;
    const originalDocument = globalRef.document;

    // @ts-expect-error Intentionally removing DOM globals to exercise the fallback path
    globalRef.window = undefined;
    // @ts-expect-error Same as above
    globalRef.document = undefined;

    expect(getPlainTextFromHtml("<div>  Foo <em>bar</em> </div>")).toBe(
      "Foo bar",
    );

    globalRef.window = originalWindow;
    globalRef.document = originalDocument;
  });
});
