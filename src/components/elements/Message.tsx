import { ComponentProps, PropsWithChildren, ReactElement } from "react";

export type MessageProps = PropsWithChildren<{
  error: ReactElement | string | null;
  id: string;
}> &
  Omit<ComponentProps<"div">, "id">;

export function Message({ error, children, id }: MessageProps) {
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
