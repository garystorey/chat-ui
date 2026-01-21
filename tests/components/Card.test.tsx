import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Card from "../../src/components/Card";

afterEach(() => {
  cleanup();
});

describe("Card", () => {
  const props = {
    title: "Summarize",
    description: "Summarize long documents",
    label: "Use prompt",
    icon: "✨",
  };

  it("renders the provided metadata and merges class names", () => {
    render(<Card {...props} className="extra" onSelect={vi.fn()} />);

    const container = screen
      .getByRole("button", { name: props.label })
      .closest("div");
    expect(container).not.toBeNull();
    expect(container).toHaveClass("suggestion-card");
    expect(container).toHaveClass("extra");
    expect(screen.getByText(props.title)).toBeInTheDocument();
    expect(screen.getByText(props.description)).toBeInTheDocument();
  });

  it("invokes onSelect when the CTA button is clicked", () => {
    const onSelect = vi.fn();

    render(<Card {...props} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: props.label }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
