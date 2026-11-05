export const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/** Very soft radial glow (horizon hint). */
export const softGlowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = exp(-d * d * 4.0) * (1.0 - smoothstep(0.8, 1.0, d)) * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`

/** Four-point star with a halo (the "found it" marker). */
export const starFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float spikes = exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 3.0) + exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 3.0);
    float core = exp(-r * r * 60.0);
    float halo = exp(-r * r * 8.0) * 0.3;
    float tw = 0.85 + 0.15 * sin(uTime * 2.3);
    float a = clamp((spikes * 0.8 + core + halo) * tw, 0.0, 1.0) * (1.0 - smoothstep(0.85, 1.0, r));
    gl_FragColor = vec4(mix(uColor, vec3(1.0), core) * a, a);
  }
`

/** Wormhole: log-spiral arms around a bright throat. uActive 0 = dormant, 1 = open. */
export const wormholeFragment = /* glsl */ `
  uniform float uTime;
  uniform float uActive;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float swirl = sin(ang * 3.0 + log(r + 0.04) * 7.0 + uTime * (0.6 + 3.4 * uActive));
    float arms = smoothstep(0.1, 1.0, swirl) * smoothstep(0.08, 0.3, r) * (1.0 - smoothstep(0.55, 0.95, r));
    float core = exp(-r * r * 18.0);
    float rim = exp(-pow((r - 0.62) / 0.05, 2.0));
    vec3 violet = vec3(0.75, 0.55, 1.0);
    vec3 cyan = vec3(0.48, 0.88, 1.0);
    float on = 0.3 + 0.7 * uActive;
    vec3 col = mix(cyan, violet, smoothstep(0.1, 0.7, r)) * arms * on + vec3(1.0, 0.95, 1.0) * core * on + violet * rim * on;
    float a = clamp(arms * 0.9 + core + rim * 0.8, 0.0, 1.0) * (1.0 - smoothstep(0.85, 1.0, r)) * on;
    gl_FragColor = vec4(col * a, a);
  }
`

export const dotsVertex = /* glsl */ `
  uniform float uPixelRatio;
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = mix(3.2, 1.6, aT) * uPixelRatio;
  }
`

export const dotsFragment = /* glsl */ `
  varying float vT;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float a = (1.0 - smoothstep(0.5, 1.0, length(c))) * (1.0 - vT) * 0.85;
    gl_FragColor = vec4(vec3(1.0, 0.8, 0.55) * a, a);
  }
`
