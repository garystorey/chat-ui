import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import List from "../../src/components/List";

afterEach(() => {
  cleanup();
});

type Item = { id: string; label: string };

const ItemElement = ({ item }: { item: Item }) => <span>{item.label}</span>;

const sampleItems: Item[] = [
  { id: "1", label: "Alpha" },
  { id: "2", label: "Bravo" },
  { id: "3", label: "Charlie" },
];

describe("List", () => {
  it("renders all provided items by default", () => {
    render(
      <List<Item>
        items={sampleItems}
        keyfield="id"
        as={(item) => <ItemElement item={item} />}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(sampleItems.length);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("limits the rendered items when a limit is provided", () => {
    render(
      <List<Item>
        items={sampleItems}
        keyfield="id"
        limit={1}
        as={(item) => <ItemElement item={item} />}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Bravo")).toBeNull();
  });

  it("supports custom key functions", () => {
    render(
      <List<Item>
        items={sampleItems}
        keyfield={(item) => `${item.label}-key`}
        as={(item) => <ItemElement item={item} />}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(sampleItems.length);
  });
});
