import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Suggestions from "../../src/components/Suggestions";
import type { Suggestion } from "../../src/types";

afterEach(() => {
  cleanup();
});

const buildSuggestion = (id: number): Suggestion => ({
  id,
  title: `Suggestion ${id}`,
  description: `Description ${id}`,
  actionLabel: "Select",
  icon: "💡",
  handleSelect: vi.fn(),
});

describe("Suggestions", () => {
  it("renders a list of suggestion cards", () => {
    const suggestions = [buildSuggestion(1), buildSuggestion(2)];

    render(<Suggestions suggestions={suggestions} classes={["suggestions"]} />);

    const section = screen
      .getByRole("heading", { name: "Suggested prompts" })
      .closest("section");
    expect(section).not.toBeNull();
    expect(section).toHaveClass("suggestions");

    suggestions.forEach((suggestion) => {
      expect(screen.getByText(suggestion.title)).toBeInTheDocument();
      expect(screen.getByText(suggestion.description)).toBeInTheDocument();
    });
  });

  it("delegates selection events to the suggestion handlers", () => {
    const suggestion = buildSuggestion(3);

    render(<Suggestions suggestions={[suggestion]} />);

    fireEvent.click(
      screen.getByRole("button", { name: suggestion.actionLabel }),
    );

    expect(suggestion.handleSelect).toHaveBeenCalledTimes(1);
  });
});
