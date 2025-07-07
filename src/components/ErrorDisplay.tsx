"use cllient";
import { useState } from "react";
import { Button } from "./elements";

interface ErrorDisplayProps {
  errors: Record<string, string | undefined>;
}

let toggle = true;

export function ErrorDisplay({ errors }: ErrorDisplayProps) {
  const [showMessage, setShowMessage] = useState(true);

  if (!errors) return <></>;
  if (Object.values(errors).every((error) => !error || error.trim() === "")) {
    return <></>;
  }
  if (showMessage && toggle)
    return (
      <div className="error-display" aria-live="polite">
        The login form has the following errors:
        <ul>
          {Object.entries(errors).map(([id, error]) => (
            <li key={id} className="field-error" id={`${id}-error`}>
              {error ?? ""}
            </li>
          ))}
        </ul>
      </div>
    );

  return <></>;
}
