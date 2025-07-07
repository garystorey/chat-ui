import { Message } from "./elements";
import {
  ChangeEvent,
  ComponentProps,
  PropsWithChildren,
  ReactNode,
} from "react";

import "./Field.css";

type FormatFunction = (value: string) => string;

export type FieldProps = Omit<ComponentProps<"input">, "name"> &
  PropsWithChildren<{
    label: ReactNode;
    format?: FormatFunction;
    name: string;
    error: string;
    defaultValue?: string | number;
  }>;

export function Field(props: FieldProps) {
  const {
    className = "",
    label,
    name,
    format,
    children,
    error,
    ...rest
  } = props;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (typeof format === "function") {
      e.target.value = format(e.target.value);
    }
  };

  const classes = `field ${className}${error ? ` has-error` : ""}`;
  const describedBy = `${name}-description ${error ? `${name}-error` : ``}`;

  return (
    <div className={classes}>
      <label htmlFor={name}>{label}</label>
      <input
        {...rest}
        id={name}
        name={name}
        onChange={handleChange}
        aria-describedby={describedBy}
      />
      <Message id={name} error={error}>
        {children}
      </Message>
    </div>
  );
}
