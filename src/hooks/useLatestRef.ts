import { RefObject, useEffect, useRef } from "react";

const useLatestRef = <T>(value: T): RefObject<T> => {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
};

export default useLatestRef;
