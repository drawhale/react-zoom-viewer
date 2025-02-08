import { MutableRefObject } from 'react';

type RefCallback<T> = (instance: T | null) => void;
type Ref<T> = RefCallback<T> | MutableRefObject<T | null> | null;

export const useMergedRef =
  <T extends HTMLElement = HTMLElement>(...refs: Ref<T>[]) =>
  (element: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref && typeof ref === 'object') {
        ref.current = element;
      }
    });
  };
