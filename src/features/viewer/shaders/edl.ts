/**
 * WS-B. Final composite: Eye-Dome Lighting (Potree-style) + soft sun shading from
 * screen-space normals + background gradient + linear → sRGB.
 */

export const edlVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const edlFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uResolution;   // drawing-buffer px
uniform float uNear;
uniform float uFar;
uniform float uProj00;      // projectionMatrix[0][0]
uniform float uProj11;      // projectionMatrix[1][1]
uniform float uEdl;         // 0 | 1
uniform float uEdlStrength;
uniform float uEdlRadius;   // px (already multiplied by pixel ratio)
uniform vec3 uSunDirView;   // towards the sun, view space
uniform float uSunStrength;
uniform vec3 uBgTop;        // linear
uniform vec3 uBgBottom;     // linear

varying vec2 vUv;

float viewZ(float d) {
  // perspective depth [0,1] → view-space z (negative in front of the camera)
  return (uNear * uFar) / ((uFar - uNear) * d - uFar);
}

vec3 viewPos(vec2 uv, float d) {
  float z = viewZ(d);
  vec2 ndc = uv * 2.0 - 1.0;
  return vec3(ndc.x * -z / uProj00, ndc.y * -z / uProj11, z);
}

vec3 linearToSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec3 bg = mix(uBgBottom, uBgTop, smoothstep(0.0, 1.0, vUv.y));
  float d = texture2D(tDepth, vUv).x;
  vec2 px = 1.0 / uResolution;

  if (d >= 1.0) {
    // Soft contact halo on the background next to geometry, so silhouettes read crisply.
    float halo = 0.0;
    if (uEdl > 0.5) {
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.78539816;
        float dn = texture2D(tDepth, vUv + vec2(cos(a), sin(a)) * px * uEdlRadius).x;
        halo += dn < 1.0 ? 1.0 : 0.0;
      }
    }
    gl_FragColor = vec4(linearToSrgb(bg * (1.0 - 0.06 * halo * uEdlStrength)), 1.0);
    return;
  }

  vec3 col = texture2D(tColor, vUv).rgb;
  float z = -viewZ(d);
  float logd = log2(z);

  if (uEdl > 0.5) {
    float response = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.78539816;
      float dn = texture2D(tDepth, vUv + vec2(cos(a), sin(a)) * px * uEdlRadius).x;
      // Background neighbours give a small fixed response (a thin outline) instead of Potree's
      // "infinitely far" treatment, which turns sparse clouds black.
      response += dn >= 1.0 ? 0.012 : max(0.0, logd - log2(-viewZ(dn)));
    }
    response /= 8.0;
    col *= exp(-response * 300.0 * uEdlStrength * 0.25);
  }

  if (uSunStrength > 0.0) {
    vec2 o = px * 2.0;
    float dx = texture2D(tDepth, vUv + vec2(o.x, 0.0)).x;
    float dy = texture2D(tDepth, vUv + vec2(0.0, o.y)).x;
    if (dx < 1.0 && dy < 1.0) {
      vec3 p = viewPos(vUv, d);
      vec3 n = normalize(cross(viewPos(vUv + vec2(o.x, 0.0), dx) - p, viewPos(vUv + vec2(0.0, o.y), dy) - p));
      // Reject unstable normals across depth discontinuities.
      float stable = 1.0 - smoothstep(0.02, 0.15, abs(dx - d) + abs(dy - d));
      float lambert = max(dot(n, uSunDirView), 0.0);
      col *= mix(1.0, 0.62 + 0.75 * lambert, uSunStrength * stable);
    }
  }

  // Gentle atmospheric depth: far points drift toward the sky colour.
  col = mix(col, bg, smoothstep(40.0, 160.0, z) * 0.6);

  gl_FragColor = vec4(linearToSrgb(col), 1.0);
}
`;
