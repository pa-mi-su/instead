import { useCallback, useRef } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

export function useScrollRestoration(
  offset: number,
  onOffsetChange: (offset: number) => void,
) {
  const scrollRef = useRef<ScrollView>(null);
  const layoutReady = useRef(false);
  const contentReady = useRef(false);
  const restored = useRef(false);

  const restoreIfReady = useCallback(() => {
    if (!layoutReady.current || !contentReady.current || restored.current)
      return;
    restored.current = true;
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ y: Math.max(0, offset), animated: false }),
    );
  }, [offset]);

  const onLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      layoutReady.current = true;
      restoreIfReady();
    },
    [restoreIfReady],
  );

  const onContentSizeChange = useCallback(() => {
    contentReady.current = true;
    restoreIfReady();
  }, [restoreIfReady]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) =>
      onOffsetChange(event.nativeEvent.contentOffset.y),
    [onOffsetChange],
  );

  return { scrollRef, onLayout, onContentSizeChange, onScroll };
}
