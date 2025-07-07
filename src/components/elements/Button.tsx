import React, { ComponentPropsWithRef } from "react";
import { css } from "../../utils";
import { ButtonSizes, ButtonVariants, Colors } from "../../types";

import "./Button.css";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariants;
  color?: Colors;
  size?: ButtonSizes;
};

export function Button({
  children,
  variant = "standard",
  color = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = css({
    button: true,
    buttonVariantStandard: variant === "standard",
    buttonVariantOutline: variant === "outline",
    buttonVariantText: variant === "text",
    buttonColorPrimary: color === "primary",
    buttonColorSecondary: color === "secondary",
    buttonColorText: color === "text",
    buttonColorLink: color === "link",
    buttonSizeFixed: props.size === "fixed",
    buttonSizeFull: props.size === "full",
    buttonSizeContent: !props.size || props.size === "content",
    [`${color}`]: !!["primary", "secondary", "link", "text"].includes(color),
    [className]: !!className,
  });

  return (
    <button {...props} type={type} className={classes}>
      {children}
    </button>
  );
}

export type ButtonGroupProps = {
  className?: string;
  gap?: number;
  direction?: "row" | "column";
  children: React.ReactNode;
};
export function ButtonGroup({
  className = "",
  gap = 1,
  direction = "row",
  children,
}: ButtonGroupProps) {
  const classes = `flex flex-${
    direction === "column" ? "col" : "row"
  } ${className}`;
  return (
    <div className={classes} style={{ gap: `${gap}rem` }}>
      {children}
    </div>
  );
}
