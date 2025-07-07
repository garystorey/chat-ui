import type { Sizes, Alignment } from "./common";

export type HeadingLevels = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type HeadingSizes = Omit<Sizes, "xs, xl, xxl">;
export type HeadingVariants =
  | "standard"
  | "Underlined"
  | "caps"
  | "caps-underline";
export type HeadingAlignment = Omit<Alignment, "top, bottom"> | "indent";
