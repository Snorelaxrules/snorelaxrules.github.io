/** Ashima/stegu 3D simplex noise (MIT) + fbm. */
const NOISE = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
  float fbm(vec3 p, int octaves) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      v += a * snoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v;
  }
`

/** shared vertex: object-space position for noise, world normal + view dir for lighting */
export const sphereVertex = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    vObj = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const surfaceFragment = /* glsl */ `
  uniform vec3 uLight;
  uniform float uSeed;
  uniform float uSea;
  uniform vec3 uDeep, uOcean, uShallows, uLand, uHigh, uIce, uAtmo, uCity;
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  ${NOISE}

  void main() {
    vec3 p = normalize(vObj);
    vec3 s = p * 1.5 + uSeed;
    // domain-warped fbm for continent shapes
    vec3 warp = vec3(fbm(s + 4.1, 3), fbm(s + 8.3, 3), fbm(s + 1.7, 3));
    float h = fbm(s + warp * 0.6, 5) * 0.5 + 0.5;
    // faint latitude bands
    h += 0.035 * sin(p.y * 16.0 + fbm(p * 3.0 + uSeed, 2) * 3.0);

    float land = smoothstep(uSea - 0.006, uSea + 0.006, h);
    vec3 water = mix(uDeep, uOcean, smoothstep(0.25, uSea, h));
    water = mix(water, uShallows, smoothstep(uSea - 0.05, uSea, h));
    float t = clamp((h - uSea) / (1.0 - uSea), 0.0, 1.0);
    vec3 ground = mix(uLand, uHigh, smoothstep(0.12, 0.55, t));
    vec3 col = mix(water, ground, land);
    float ice = smoothstep(0.78, 0.9, abs(p.y) + (h - 0.5) * 0.25);
    col = mix(col, uIce, ice);

    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewW);
    float ndl = dot(N, uLight);
    float day = smoothstep(-0.1, 0.25, ndl);
    vec3 lit = col * (0.025 + 1.05 * max(ndl, 0.0));

    // glint on water
    float spec = pow(max(dot(reflect(-uLight, N), V), 0.0), 90.0) * (1.0 - land) * (1.0 - ice);
    lit += vec3(0.9, 0.95, 1.0) * spec * 0.3 * day;

    // city lights: sparse dots on low coastal land, night side only
    float coast = smoothstep(0.0, 0.03, h - uSea) * (1.0 - smoothstep(0.08, 0.22, h - uSea));
    float dots = smoothstep(0.62, 0.78, snoise(p * 70.0 + uSeed * 3.0));
    lit += uCity * dots * coast * (1.0 - day) * (1.0 - ice) * 1.6;

    // atmospheric scattering toward the lit rim
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    lit += uAtmo * fres * 0.55 * smoothstep(-0.25, 0.6, ndl);

    gl_FragColor = vec4(lit, 1.0);
    #include <colorspace_fragment>
  }
`

export const cloudFragment = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uColor;
  uniform float uSeed;
  uniform float uTime;
  varying vec3 vObj;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  ${NOISE}

  void main() {
    vec3 p = normalize(vObj);
    float n = fbm(p * vec3(2.2, 4.0, 2.2) + vec3(uTime * 0.015, 0.0, uSeed * 1.3), 4);
    float a = smoothstep(0.08, 0.45, n) * 0.55;
    float ndl = dot(normalize(vNormalW), uLight);
    float light = 0.04 + 0.96 * smoothstep(-0.15, 0.6, ndl);
    gl_FragColor = vec4(uColor * light, a * (0.35 + 0.65 * light));
    #include <colorspace_fragment>
  }
`

export const atmosphereFragment = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uColor;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  varying vec3 vObj;
  void main() {
    vec3 N = normalize(vNormalW);
    // back faces of a slightly larger sphere: brightest just outside the limb
    float rim = pow(clamp(0.72 + dot(N, normalize(vViewW)), 0.0, 1.0), 3.0);
    float lit = 0.15 + 0.85 * smoothstep(-0.4, 0.5, dot(N, uLight));
    gl_FragColor = vec4(uColor * rim * lit * 1.4, rim * lit);
    #include <colorspace_fragment>
  }
`
