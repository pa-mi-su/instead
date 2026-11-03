import { useCallback, useEffect, useRef } from 'react';
import type { ScrollView, View } from 'react-native';

// Measure in one native coordinate space after layout, rather than adding
// child/parent onLayout values whose callbacks may arrive in any order.
export function useScrollDestination(
  destination: string | undefined,
  ready: boolean,
) {
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const targetRef = useRef<View>(null);
  const frame = useRef<number | null>(null);
  const measurement = useRef(0);
  const state = useRef({
    destination,
    ready,
    cancelled: false,
    lastY: -1,
    generation: 0,
  });
  if (state.current.destination !== destination) {
    state.current = {
      destination,
      ready,
      cancelled: false,
      lastY: -1,
      generation: state.current.generation + 1,
    };
  }
  state.current.ready = ready;
  const cancel = useCallback(() => {
    state.current.cancelled = true;
    state.current.generation++;
  }, []);
  const onLayout = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const generation = state.current.generation;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const current = state.current;
      if (
        !current.destination ||
        !current.ready ||
        current.cancelled ||
        generation !== current.generation
      )
        return;
      const content = contentRef.current;
      if (!content || !targetRef.current) return;
      const sequence = ++measurement.current;
      targetRef.current.measureLayout(
        content,
        (_x, y) => {
          const latest = state.current;
          if (
            sequence !== measurement.current ||
            generation !== latest.generation ||
            latest.cancelled ||
            !latest.ready ||
            !Number.isFinite(y)
          )
            return;
          const offset = Math.max(0, y - 12);
          if (offset === latest.lastY) return;
          latest.lastY = offset;
          scrollRef.current?.scrollTo({ y: offset, animated: false });
        },
        () => {
          /* A later layout/content-size event retries an unmounted or unmeasured node. */
        },
      );
    });
  }, []);
  useEffect(() => {
    onLayout();
  }, [destination, ready, onLayout]);
  useEffect(
    () => () => {
      state.current.generation++;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return { scrollRef, contentRef, targetRef, onLayout, cancel };
}
