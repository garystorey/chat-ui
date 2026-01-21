import type { SVGProps } from "react";

const MicIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    focusable="false"
    {...props}
  >
    <path
      d="M8 1.5a2 2 0 0 0-2 2v3a2 2 0 1 0 4 0v-3a2 2 0 0 0-2-2Zm4.5 5a.5.5 0 0 0-1 0A3.5 3.5 0 0 1 8 10a3.5 3.5 0 0 1-3.5-3.5.5.5 0 0 0-1 0A4.5 4.5 0 0 0 7.5 10.45V12H5.75a.75.75 0 1 0 0 1.5h4.5a.75.75 0 1 0 0-1.5H8.5v-1.55A4.5 4.5 0 0 0 12.5 6.5Z"
      fill="currentColor"
    />
  </svg>
);

export default MicIcon;
