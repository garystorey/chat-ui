import type { SVGProps } from "react";

const ThinkingIcon = (props: SVGProps<SVGSVGElement>) => (
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
      d="M9 18h6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M10 21h4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M8.5 14.5c-1.6-1.1-2.5-2.7-2.5-4.6a6 6 0 1 1 12 0c0 1.9-.9 3.5-2.5 4.6-.6.4-1 .9-1.2 1.6l-.3 1.4h-3l-.3-1.4c-.2-.7-.6-1.2-1.2-1.6Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ThinkingIcon;
