import { DependencyList, RefObject, useEffect } from 'react';

type UseScrollToBottomOptions = {
  behavior?: ScrollBehavior;
};

const useScrollToBottom = <T extends Element>(
  ref: RefObject<T | null>,
  dependencies: DependencyList = [],
  { behavior = 'smooth' }: UseScrollToBottomOptions = {}
) => {
  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, [behavior, dependencies]);
};

export default useScrollToBottom;
