import { ComponentProps, PropsWithChildren, ReactElement } from "react";

export type FieldDescriptionProps = PropsWithChildren<{
  error: ReactElement | string | null;
  id: string;
}> &
  Omit<ComponentProps<"div">, "id">;

export function FieldDescription({
  error,
  children,
  id,
}: FieldDescriptionProps) {
  return (
    <>
      <p className="field-description" id={`${id}-description`}>
        {children}
      </p>
      <output className="field-error" id={`${id}-error`}>
        {error ?? ""}
      </output>
    </>
  );
}
