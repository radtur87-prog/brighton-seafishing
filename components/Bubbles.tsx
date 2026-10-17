import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

interface Bubble {
  left: number; // % of width
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

/** Deterministic pseudo-random so bubbles look the same on every render. */
function makeBubbles(count: number): Bubble[] {
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: count }, () => ({
    left: 4 + rand() * 92,
    size: 4 + rand() * 12,
    duration: 5000 + rand() * 6000,
    delay: rand() * 6000,
    drift: (rand() - 0.5) * 30,
  }));
}

function RisingBubble({ bubble, height }: { bubble: Bubble; height: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(bubble.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: bubble.duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bubble, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -height - 40] });
  const translateX = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, bubble.drift, 0] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.75, 0.5, 0] });

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          left: `${bubble.left}%`,
          width: bubble.size,
          height: bubble.size,
          borderRadius: bubble.size / 2,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
}

/** Gently rising air bubbles, drawn over a photo. Purely decorative. */
export function Bubbles({ count = 14, height }: { count?: number; height: number }) {
  const bubbles = useMemo(() => makeBubbles(count), [count]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bubbles.map((b, i) => (
        <RisingBubble key={i} bubble={b} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    bottom: -20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
