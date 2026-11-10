/**
 * WS-B. Point-cloud shader (contract §5.8 uniforms).
 * Outputs LINEAR colour into the scene render target; EdlPass converts to sRGB for display.
 */
import {CLASS_COLORS, glslRamp, glslVec3, HEIGHT_RAMP, HIGHLIGHT_COLOR, METRIC_RAMP} from '../core/colors';

/** uColorMode values */
export const COLOR_MODE_INDEX = {rgb: 0, instance: 1, semantic: 2, height: 3, metric: 4} as const;

export const pointsVertexShader = /* glsl */ `
precision highp float;

attribute vec3 aColor;      // sRGB, normalised uint8
attribute float aSemantic;  // 0 ground, 1 wood, 2 leaves
attribute float aInstance;  // tree id, 0 = none
attribute float aHag;       // cm
attribute float aTSeen;     // 0.1 s units, 65535 = never

uniform int uColorMode;
uniform sampler2D uMetricTex;
uniform vec2 uMetricTexSize;
uniform float uHoveredId;
uniform float uSelectedId;
uniform float uDimOthers;
uniform float uRevealT;
uniform float uPointSize;
uniform int uSizeMode;      // 0 fixed (px), 1 adaptive (world-scaled)
uniform float uProjScale;   // drawing-buffer px per world unit at distance 1
uniform float uPixelRatio;
uniform float uHagMax;      // m

varying vec3 vColor;

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

${glslRamp('heightRamp', HEIGHT_RAMP)}
${glslRamp('metricRamp', METRIC_RAMP)}

vec3 classColor(float s) {
  if (s < 0.5) return ${glslVec3(CLASS_COLORS.ground)};
  if (s < 1.5) return ${glslVec3(CLASS_COLORS.wood)};
  return ${glslVec3(CLASS_COLORS.leaves)};
}

vec3 treeColor(float id) {
  float h = fract(id * 0.61803398875 + 0.13);
  return srgbToLinear(hsl2rgb(h, 0.68, 0.56));
}

void main() {
  bool isTree = aInstance > 0.5;

  // Live-capture reveal: hide points the sensor hasn't reached yet.
  float seenT = aTSeen * 0.1;
  if (uRevealT >= 0.0 && seenT > uRevealT) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }

  vec3 natural = srgbToLinear(aColor);
  vec3 col = natural;

  if (uColorMode == 1) {
    col = isTree ? treeColor(aInstance) : vec3(luma(natural)) * 0.55;
  } else if (uColorMode == 2) {
    col = classColor(aSemantic);
  } else if (uColorMode == 3) {
    col = heightRamp(aHag * 0.01 / uHagMax);
  } else if (uColorMode == 4) {
    col = vec3(luma(natural)) * 0.4;
    if (isTree) {
      vec2 uv = vec2((mod(aInstance, uMetricTexSize.x) + 0.5) / uMetricTexSize.x,
                     (floor(aInstance / uMetricTexSize.x) + 0.5) / uMetricTexSize.y);
      vec4 m = texture2D(uMetricTex, uv);
      if (m.a > 0.5) col = metricRamp(m.r);
    }
  }

  float sizeBoost = 0.0;
  bool selected = uSelectedId > 0.5 && abs(aInstance - uSelectedId) < 0.5;
  bool hovered = uHoveredId > 0.5 && abs(aInstance - uHoveredId) < 0.5;
  vec3 accent = ${glslVec3(HIGHLIGHT_COLOR)};

  if (uSelectedId > 0.5 && uDimOthers > 0.5 && !selected) {
    col = mix(vec3(luma(col)), col, 0.25) * 0.32;
  }
  if (selected) {
    col = mix(col, accent, 0.22) * 1.2;
    sizeBoost += 0.6;
  }
  if (hovered && !selected) {
    col = mix(col, accent, 0.45) * 1.35;
    sizeBoost += 1.0;
  }

  // Freshly revealed points glow briefly, like a live scan.
  if (uRevealT >= 0.0) {
    float age = uRevealT - seenT;
    col = mix(vec3(0.25, 0.85, 1.0) * 1.6, col, smoothstep(0.0, 1.2, age));
  }

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float size = uSizeMode == 1
    ? clamp(uPointSize * 0.016 * uProjScale / max(-mv.z, 0.05), 1.5 * uPixelRatio, 9.0 * uPixelRatio)
    : uPointSize * uPixelRatio;
  gl_PointSize = size + sizeBoost * uPixelRatio;
  gl_Position = projectionMatrix * mv;
  vColor = col;
}
`;

export const pointsFragmentShader = /* glsl */ `
precision highp float;
varying vec3 vColor;

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  if (dot(c, c) > 1.0) discard;
  gl_FragColor = vec4(vColor, 1.0);
}
`;
