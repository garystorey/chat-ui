import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ThinkingIndicator from "../../src/components/ThinkingIndicator";

afterEach(() => {
  cleanup();
});

describe("ThinkingIndicator", () => {
  it("renders the default label", () => {
    render(<ThinkingIndicator />);

    expect(screen.getByRole("status")).toHaveTextContent("Working");
  });

  it("renders a custom label when one is provided", () => {
    render(<ThinkingIndicator label="Considering" />);

    expect(screen.getByText("Considering")).toBeInTheDocument();
  });
});
