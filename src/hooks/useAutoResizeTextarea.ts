import { RefObject, useEffect } from "react";

const useAutoResizeTextarea = (
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string
) => {
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    const { maxHeight } = getComputedStyle(textarea);
    const maxHeightValue = Number.parseFloat(maxHeight);
    const resolvedMaxHeight = Number.isNaN(maxHeightValue)
      ? Infinity
      : maxHeightValue;

    const nextHeight = Math.min(textarea.scrollHeight, resolvedMaxHeight);
    textarea.style.height = `${nextHeight}px`;
  }, [ref, value]);
};

export default useAutoResizeTextarea;
