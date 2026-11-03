export const clusterVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uHover;
  uniform float uReveal;
  uniform float uPulse;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aRadius;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float px = aSize * uScale * (1.0 + uHover * 0.2) / max(-mv.z, 0.1);
    gl_PointSize = clamp(px, 1.0, 9.0) * uPixelRatio;
    // beacon: brightness waves travelling outward
    float wave = uPulse * pow(0.5 + 0.5 * sin(uTime * 1.7 - aRadius * 11.0), 10.0);
    vColor = aColor * (0.8 + uHover * 0.6 + wave * 1.6);
    vAlpha = uReveal * clamp(px, 0.25, 1.0);
  }
`

export const clusterFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float a = exp(-dot(c, c) * 4.5) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`

export const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float halo = exp(-d * d * 7.0);
    float core = exp(-d * 18.0) * 0.8;
    float a = (halo * 0.55 + core) * uOpacity * (1.0 - smoothstep(0.85, 1.0, d));
    gl_FragColor = vec4(uColor, a);
  }
`
