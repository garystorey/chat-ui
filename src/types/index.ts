export * from "./common";
export * from "./colors";
export * from "./heading";
export * from "./flex";
export * from "./User";

export type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};
