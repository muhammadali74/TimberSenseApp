/**
 * WS-B. Colour definitions shared by the point shader and the UI legend, so both always agree.
 * All values are sRGB hex.
 */

export const CLASS_COLORS = {
  ground: '#89AF46',
  wood: '#865E3C',
  leaves: '#63CF00',
} as const;

/** Farmevo orange — hover/selection accent in 3D. */
export const HIGHLIGHT_COLOR = '#F57E26';

/** Height-above-ground ramp (low → high), Potree-like elevation gradient. */
export const HEIGHT_RAMP = ['#2b4a8b', '#2c9fb6', '#5cc472', '#e3d94f', '#e8783a', '#c1272d'] as const;

/** Per-tree metric ramp (low → high), viridis-like. */
export const METRIC_RAMP = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'] as const;

export const BACKGROUNDS = {
  sky: {top: '#7fa7cc', bottom: '#e4ecef'},
  dark: {top: '#1d2733', bottom: '#07090c'},
  light: {top: '#ffffff', bottom: '#e9eef2'},
} as const;

export function hexToRgb(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

/** sRGB [0..1] → linear, matching the shader. */
export function srgbToLinear([r, g, b]: [number, number, number]): [number, number, number] {
  const f = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return [f(r), f(g), f(b)];
}

/** GLSL vec3 literal (linear) for a hex colour. */
export function glslVec3(hex: string): string {
  const [r, g, b] = srgbToLinear(hexToRgb(hex));
  return `vec3(${r.toFixed(5)}, ${g.toFixed(5)}, ${b.toFixed(5)})`;
}

/** GLSL function sampling a piecewise-linear ramp at t ∈ [0,1]. */
export function glslRamp(name: string, stops: readonly string[]): string {
  const n = stops.length - 1;
  const lines = stops.map((s, i) => `  vec3 c${i} = ${glslVec3(s)};`).join('\n');
  const steps = stops
    .slice(1)
    .map((_, i) => `  if (x <= ${i + 1}.0) return mix(c${i}, c${i + 1}, x - ${i}.0);`)
    .join('\n');
  return `vec3 ${name}(float t) {\n${lines}\n  float x = clamp(t, 0.0, 1.0) * ${n}.0;\n${steps}\n  return c${n};\n}`;
}

/** CSS linear-gradient for legends. */
export function cssGradient(stops: readonly string[], direction = 'to right'): string {
  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}
