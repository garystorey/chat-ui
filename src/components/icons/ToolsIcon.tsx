import type { SVGProps } from "react";

const ToolsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    focusable="false"
    {...props}
  >
    <path
      d="M14.7 6.3a5 5 0 0 0-6.9 6.9l-5.2 5.2a1.25 1.25 0 0 0 1.77 1.77l5.2-5.2a5 5 0 0 0 6.9-6.9l-2.35 2.35-2.12-.53-.53-2.12L14.7 6.3Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ToolsIcon;
