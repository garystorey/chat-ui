import type { ReactNode } from "react";

type ShowProps = {
  when: boolean;
  children: ReactNode;
};

const Show = ({ when, children }: ShowProps) => (when ? <>{children}</> : null);

export default Show;
