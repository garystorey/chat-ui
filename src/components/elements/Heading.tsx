import { ComponentProps, createElement, ReactNode } from "react";
import { css } from "../../utils";
import {
  Colors,
  HeadingLevels,
  HeadingAlignment,
  HeadingSizes,
  HeadingVariants,
} from "../../types";

import "./Heading.css";

export type HeadingProps = ComponentProps<"h1"> & {
  as: HeadingLevels;
  color?: Colors;
  size?: HeadingSizes;
  variant?: HeadingVariants;
  children: ReactNode;
  textAlign?: HeadingAlignment;
};

export function Heading({
  as,
  color = "primary",
  size = "medium",
  variant = "standard",
  textAlign = "left",
  className = "",
  children,
  ...props
}: HeadingProps) {
  const classes = css({
    header: true,
    headerVariantStandard: variant === "standard",
    headerVariantUnderlined: variant === "Underlined",
    headerVariantCapitalized: variant === "caps",
    headerVariantCapsUnderlined: variant === "caps-underline",
    headerColorPrimary: color === "primary",
    headerColorSecondary: color === "secondary",
    headerColorLink: color === "link",
    headerColorText: color === "text",
    headerSizeLarge: size === "large",
    headerSizeMedium: size === "medium",
    headerSizeSmall: size === "small",
    headerTextAlignLeft: textAlign === "left",
    headerTextAlignRight: textAlign === "right",
    headerTextAlignCenter: textAlign === "center",
    headerTextAlignIndent: textAlign === "indent",
    [className]: !!className,
  });

  return createElement(as, { ...props, className: classes }, children);
}
