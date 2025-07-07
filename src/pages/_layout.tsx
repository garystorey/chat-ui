import "../styles.css";

import type { ReactNode } from "react";

type RootLayoutProps = { children: ReactNode };

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <article>
      {/* <header>Header</header> */}
      <main>{children}</main>
      {/* <footer>Copyright</footer> */}
    </article>
  );
}
