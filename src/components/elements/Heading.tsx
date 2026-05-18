import {
  createElement,
  PropsWithChildren,
  ComponentPropsWithoutRef,
} from "react";

import "./heading.css";

export type HeadingProps = ComponentPropsWithoutRef<"h1"> & {
  as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  size?: "small" | "medium" | "large";
  variant?: "standard" | "underlined" | "caps" | "caps-underline";
  textAlign?: "left" | "right" | "center" | "indent";
};

export function Heading({
  as,
  size = "medium",
  variant = "standard",
  textAlign = "left",
  className = "",
  children,
  ...props
}: HeadingProps) {
  let classes = `header header_variant_${variant} header_size_${size} header_text-align_${textAlign}`;

  classes += className ? ` ${className}` : "";
  classes = classes.trim();

  return createElement(as, { ...props, className: classes }, children);
}

export default Heading;
