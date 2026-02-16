export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function interpolateKeyframes(keyframes: { at: number; value: number }[], distance: number): number {
  if (keyframes.length === 0) return 0;
  if (distance <= keyframes[0].at) return keyframes[0].value;
  if (distance >= keyframes[keyframes.length - 1].at) return keyframes[keyframes.length - 1].value;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (distance >= a.at && distance <= b.at) {
      const t = (distance - a.at) / (b.at - a.at);
      return lerp(a.value, b.value, t);
    }
  }
  return keyframes[keyframes.length - 1].value;
}
