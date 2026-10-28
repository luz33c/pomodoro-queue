import { useEffect, useRef, useState } from "react";

/** Length of the shake keyframe in styles/animations.css */
const SHAKE_MS = 500;

/**
 * True for one shake after each `shake()` call; apply it with `motion-safe:animate-shake`.
 * Returns the flag and the trigger.
 */
export function useShake() {
  const [shaking, setShaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const shake = () => {
    clearTimeout(timer.current);
    setShaking(true);
    timer.current = setTimeout(() => setShaking(false), SHAKE_MS);
  };

  return [shaking, shake] as const;
}
