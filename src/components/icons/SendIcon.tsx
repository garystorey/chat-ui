import type { SVGProps } from "react";

const SendIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    focusable="false"
    {...props}
  >
    <path
      d="m2.383 2.076 14.168 7.387a.75.75 0 0 1 0 1.074L2.383 17.924A.75.75 0 0 1 1.25 17.25v-4.5a.75.75 0 0 1 .75-.75H9.5a.75.75 0 0 0 0-1.5H2A.75.75 0 0 1 1.25 9V4.75a.75.75 0 0 1 1.133-.674Z"
      fill="currentColor"
    />
  </svg>
);

export default SendIcon;
