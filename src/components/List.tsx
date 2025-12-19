import type { ComponentPropsWithoutRef, ForwardedRef, ReactNode } from 'react';
import { forwardRef } from 'react';

type ListProps<ListItem> = ComponentPropsWithoutRef<'ul'> & {
  items: ListItem[];
  keyfield: keyof ListItem | ((item: ListItem) => string);
  limit?: number;
  as: (item: ListItem) => ReactNode;
};

function ListInner<ListItem>(
  { items, keyfield, limit = -1, as, ...props }: ListProps<ListItem>,
  ref: ForwardedRef<HTMLUListElement>
) {
  const getKey =
    typeof keyfield === 'function'
      ? keyfield
      : (item: ListItem) => String(item[keyfield]);

  const visibleItems = limit > -1 ? items.slice(0, limit) : items;

  return (
    <ul {...props} ref={ref}>
      {visibleItems.map((item) => (
        <li key={getKey(item)}>{as(item)}</li>
      ))}
    </ul>
  );
}

const List = forwardRef(ListInner) as <ListItem>(
  props: ListProps<ListItem> & { ref?: ForwardedRef<HTMLUListElement> }
) => ReturnType<typeof ListInner>;

export default List;
