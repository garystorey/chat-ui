import { FormEvent } from "react";

export function getFormData(e: FormEvent) {
  const el = e.target as HTMLFormElement;
  const data = new FormData(el);
  const json = data.entries().reduce((acc, [key, value]) => {
    acc[key] = typeof value === "string" ? value : value.name;
    return acc;
  }, {} as Record<string, string>);
  return json;
}
