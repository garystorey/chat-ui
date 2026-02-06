import type { SVGProps } from "react";

const EyeIcon = (props: SVGProps<SVGSVGElement>) => (
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
      d="M2.25 12S5.5 5.25 12 5.25 21.75 12 21.75 12 18.5 18.75 12 18.75 2.25 12 2.25 12Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default EyeIcon;
