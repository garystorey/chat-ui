export type ListProps<ListItem> = React.ComponentPropsWithRef<"section"> & {
  items: ListItem[];
  keyfield: keyof ListItem | ((item: ListItem) => string);
  limit?: number;
  as: (item: ListItem) => React.ReactNode;
};

export function List<ListItem>({
  items,
  keyfield,
  limit = -1,
  as,
  ...props
}: ListProps<ListItem>) {
  return (
    <section {...props}>
      {items.map((item: ListItem, index: number) => {
        if (limit > -1 && index + 1 > limit) return null;
        const key =
          typeof keyfield === "function"
            ? keyfield(item)
            : (item[keyfield] as string);
        return as({ ...item, key });
      })}
    </section>
  );
}
