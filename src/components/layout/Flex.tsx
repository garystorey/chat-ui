import { css } from "../../utils";
import {
  AlignItems,
  AlignSelf,
  JustifyContent,
  FlexDirection,
  FlexWrap,
  Gap,
} from "../../types";

export type FlexProps = React.ComponentPropsWithRef<"div"> & {
  gap?: Gap;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignSelf?: AlignSelf | undefined;
  direction?: FlexDirection;
  wrap?: FlexWrap;
};

export function Flex({
  children,
  direction,
  justifyContent = "flex-start",
  alignItems = "flex-start",
  alignSelf,
  className = "",
  gap = "1rem",
  wrap = "nowrap",
}: FlexProps) {
  const props = !alignSelf
    ? { gap, justifyContent, alignItems }
    : { gap, justifyContent, alignItems };

  const classes = css({
    flex: true,
    flexColumn: direction === "column",
    flexRow: direction === "row",
    flexWrap: wrap === "wrap" || wrap === "wrap-reverse",
    className: !!className,
  });
  return (
    <div className={classes} style={props}>
      {children}
    </div>
  );
}
