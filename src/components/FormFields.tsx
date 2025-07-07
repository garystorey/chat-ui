import { ComponentPropsWithRef, memo } from "react";

import "./Field.css";

type InternalFieldProps = {
  name: string;
  label: string;
  description?: string;
  error?: string;
};

type FieldProps = Omit<ComponentPropsWithRef<"input">, "name"> &
  InternalFieldProps;

export const Field = memo(
  ({
    type = "text",
    label,
    description = "",
    error = "",
    name,
    ...props
  }: FieldProps) => {
    const hasError = error !== "";
    const describedBy = hasError
      ? `${name}-error`
      : `${name}-helper ${name}-error`;

    if (type === "checkbox" || type === "radio") {
      return (
        <div className={`field fieldRow ${hasError ? "errored" : ""}`}>
          <input
            id={name}
            name={name}
            type={type}
            {...props}
            aria-describedby={describedBy}
          />
          <label htmlFor={name}>{label}</label>
          <output
            role="alert"
            className={`${!error ? "field-error-inactive" : ""}`}
            id={`${name}-error`}
          >
            {error}
          </output>
          {!error ? <aside id={`${name}-helper`}>{description}</aside> : null}
        </div>
      );
    }

    return (
      <div className={`field ${hasError ? "errored" : ""}`}>
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          name={name}
          type={type}
          {...props}
          aria-describedby={describedBy}
        />
        <output
          role="alert"
          className={`${!error ? "field-error-inactive" : ""}`}
          id={`${name}-error`}
        >
          {error}
        </output>
        {!error ? <aside id={`${name}-helper`}>{description}</aside> : null}
      </div>
    );
  }
);
