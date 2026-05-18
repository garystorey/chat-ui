import { RefObject, useEffect } from "react";

const useAutoResizeTextarea = (
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
) => {
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    const computedStyle = getComputedStyle(textarea);
    const maxHeight = parseFloat(computedStyle.maxHeight);
    const scrollHeight = textarea.scrollHeight;

    if (!Number.isNaN(maxHeight)) {
      const clampedHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${clampedHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = "hidden";
    }
  }, [ref, value]);
};

export default useAutoResizeTextarea;
