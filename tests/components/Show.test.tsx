import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Show from "../../src/components/Show";

afterEach(() => {
  cleanup();
});

describe("Show", () => {
  it("renders its children when the condition is true", () => {
    render(
      <Show when={true}>
        <p>Visible content</p>
      </Show>,
    );

    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });

  it("returns null when the condition is false", () => {
    render(
      <Show when={false}>
        <p>Hidden content</p>
      </Show>,
    );

    expect(screen.queryByText("Hidden content")).toBeNull();
  });
});
