import { useEffect } from 'react';

const classUsageCounts = new Map<string, number>();

const useToggleBodyClass = (className: string, active: boolean) => {
  useEffect(() => {
    if (typeof document === 'undefined' || !active) {
      return;
    }

    const { body } = document;
    const nextCount = (classUsageCounts.get(className) ?? 0) + 1;
    classUsageCounts.set(className, nextCount);
    body.classList.add(className);

    return () => {
      const currentCount = classUsageCounts.get(className) ?? 0;
      const next = currentCount - 1;

      if (next <= 0) {
        classUsageCounts.delete(className);
        body.classList.remove(className);
        return;
      }

      classUsageCounts.set(className, next);
    };
  }, [className, active]);
};

export default useToggleBodyClass;
