import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  type PressableProps,
} from 'react-native';

export function AnimatedPressable({
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue: reduceMotion ? 1 : toValue,
      stiffness: 420,
      damping: 25,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...props}
        style={style}
        onPressIn={event => {
          animate(0.965);
          onPressIn?.(event);
        }}
        onPressOut={event => {
          animate(1);
          onPressOut?.(event);
        }}
      />
    </Animated.View>
  );
}
