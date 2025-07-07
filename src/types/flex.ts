export type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";

export type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";

export type JustifyContent =
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "start"
  | "end"
  | "left"
  | "right"
  | "normal"
  | "stretch"
  | "safe center"
  | "unsafe center";

export type AlignItems =
  | "stretch"
  | "flex-start"
  | "flex-end"
  | "center"
  | "baseline"
  | "first baseline"
  | "last baseline"
  | "start"
  | "end"
  | "self-start"
  | "self-end"
  | "normal";

export type AlignContent =
  | "stretch"
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly"
  | "start"
  | "end"
  | "baseline"
  | "first baseline"
  | "last baseline"
  | "normal";

export type AlignSelf =
  | "auto"
  | "stretch"
  | "flex-start"
  | "flex-end"
  | "center"
  | "baseline"
  | "start"
  | "end"
  | "self-start"
  | "self-end"
  | "normal";

export type FlexGrow = number;
export type FlexShrink = number;
export type FlexBasis = string | number; // e.g., 'auto', '100px', '25%', 0

export type Gap = string | number; // e.g., '1rem', '10px', 8
