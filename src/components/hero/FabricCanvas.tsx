"use client";

import { useEffect, useRef } from "react";
import {
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from "three";

/* Simplex noise — Ashima/Gustavson. Folds need organic noise; layered sines
   read as a mechanical ripple, which was the problem with the first pass. */
const NOISE = /* glsl */ `
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p, float t){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * snoise(p + vec2(t * 0.07 * float(i + 1), -t * 0.045));
      p *= 2.03; a *= 0.5;
    }
    return v;
  }
`;

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uScroll;
  uniform vec2  uPointer;

  varying vec2  vUv;
  varying vec3  vNrm;
  varying vec3  vView;
  varying float vLift;

  ${NOISE}

  // Macro folds plus a second, finer band of creases.
  float height(vec2 p, float t){
    float h  = fbm(p * 2.1, t) * 0.72;
    h += snoise(p * 5.4 + vec2(0.0, t * 0.05)) * 0.20;
    return h;
  }

  void main() {
    vUv = uv;
    vec3 p = position;
    float e = 0.012;

    float h  = height(p.xy, uTime);
    float hx = height(p.xy + vec2(e, 0.0), uTime);
    float hy = height(p.xy + vec2(0.0, e), uTime);

    // The pointer lifts the cloth, as if a hand were under it.
    float d    = distance(uv, uPointer);
    float lift = exp(-d * d * 11.0);
    vLift = lift;

    float k = uAmp * (0.085 + uScroll * 0.045);
    h  = h  * k + lift * 0.055 * uAmp;
    hx = hx * k + lift * 0.055 * uAmp;
    hy = hy * k + lift * 0.055 * uAmp;

    p.z += h;

    vec3 tx = normalize(vec3(e, 0.0, hx - h));
    vec3 ty = normalize(vec3(0.0, e, hy - h));
    vNrm = normalize(cross(tx, ty));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2  uUvScale;
  uniform vec2  uUvOffset;
  uniform float uTime;
  uniform float uTexel;
  uniform vec2  uPointer;

  varying vec2  vUv;
  varying vec3  vNrm;
  varying vec3  vView;
  varying float vLift;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  float lum(sampler2D t, vec2 uv){
    vec3 c = texture2D(t, uv).rgb;
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  void main() {
    vec2 uv = uUvOffset + vUv * uUvScale;
    uv += vNrm.xy * 0.010;
    vec2 lo = uUvOffset + 0.002;
    vec2 hi = uUvOffset + uUvScale - 0.002;
    uv = clamp(uv, lo, hi);

    vec3 col = texture2D(uTex, uv).rgb;

    // The photograph's own creases become the surface relief: sampling its
    // luminance gradient gives a normal map for free, band-limited by the
    // texture's mip chain, so there is no aliasing to moire against.
    float relief = 0.85 + vLift * 1.5;      // the pointer uncovers finer detail
    // Sample the gradient wide enough to step over the source JPEG's 8x8 DCT
    // blocks; a narrow offset turns compression artefacts into visible relief.
    float e = uTexel * 7.0;
    float l0 = lum(uTex, uv);
    float lx = lum(uTex, clamp(uv + vec2(e, 0.0), lo, hi));
    float ly = lum(uTex, clamp(uv + vec2(0.0, e), lo, hi));

    vec3 Nphoto = normalize(vec3((l0 - lx) * relief, (l0 - ly) * relief, 0.22));
    vec3 N = normalize(normalize(vNrm) * 0.70 + Nphoto * 0.55);

    // Morning light, drifting slowly and leaning toward the pointer.
    float a = uTime * 0.06;
    vec3 L = normalize(vec3(
      -0.42 + sin(a) * 0.22 + (uPointer.x - 0.5) * 0.35,
       0.58 + cos(a * 0.8) * 0.14 + (uPointer.y - 0.5) * 0.30,
       0.68));
    vec3 V = normalize(vView);
    vec3 H = normalize(L + V);

    float diff = dot(N, L) * 0.5 + 0.5;          // half-lambert keeps folds open
    float spec = pow(max(dot(N, H), 0.0), 11.0) * 0.085;
    float fres = pow(1.0 - max(dot(normalize(vNrm), V), 0.0), 4.0);

    // Grade toward the brand's neutral paper rather than the stock warm cast.
    float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, vec3(luma), 0.58);
    col = mix(col, vec3(0.949, 0.949, 0.941), 0.30);

    col *= 0.88 + diff * 0.40;
    col += spec * vec3(1.0, 0.995, 0.97);
    col += fres * vec3(0.494, 0.878, 0.639) * 0.05;

    // Vignette and a floor gradient, so the type always has ground to sit on.
    vec2 q = vUv - 0.5;
    col *= 1.0 - dot(q, q) * 0.46;
    col *= smoothstep(-0.55, 0.30, vUv.y);

    col += (hash(vUv * 620.0 + fract(uTime)) - 0.5) * 0.013;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const FOV = 45;

export default function FabricCanvas({ src }: { src: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
    } catch {
      return; // No context — the still photograph underneath stays visible.
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0b0b0a, 1);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);

    const geometry = new PlaneGeometry(1, 1, 200, 200);
    const material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0 },
        uTexel: { value: 1 / 1024 },
        uScroll: { value: 0 },
        uPointer: { value: new Vector2(0.5, 0.5) },
        uTex: { value: null },
        uUvScale: { value: new Vector2(1, 1) },
        uUvOffset: { value: new Vector2(0, 0) },
      },
    });

    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    let imageAspect = 1.5;
    const texture = new TextureLoader().load(src, (t) => {
      t.colorSpace = SRGBColorSpace;
      imageAspect = t.image.width / t.image.height;
      material.uniforms.uTexel.value = 1 / t.image.width;
      material.uniforms.uTex.value = t;
      resize();
    });

    // --- sizing -------------------------------------------------------------
    const camDist = 2.35;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;

      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      // Oversize the plane so the tilt and displacement never reveal an edge.
      const visibleH = 2 * Math.tan((FOV * Math.PI) / 360) * camDist * 1.12;
      const visibleW = visibleH * camera.aspect;
      mesh.scale.set(visibleW, visibleH, 1);

      const planeAspect = visibleW / visibleH;
      if (imageAspect > planeAspect) {
        const s = planeAspect / imageAspect;
        material.uniforms.uUvScale.value.set(s, 1);
        material.uniforms.uUvOffset.value.set((1 - s) / 2, 0);
      } else {
        const s = imageAspect / planeAspect;
        material.uniforms.uUvScale.value.set(1, s);
        material.uniforms.uUvOffset.value.set(0, (1 - s) / 2);
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // --- input --------------------------------------------------------------
    const pointerTarget = new Vector2(0.5, 0.55);
    const onPointer = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointerTarget.set(
        (e.clientX - r.left) / r.width,
        1 - (e.clientY - r.top) / r.height,
      );
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let scrollTarget = 0;
    let scrollNow = 0;
    const readScroll = () => {
      const r = host.getBoundingClientRect();
      scrollTarget = Math.min(1, Math.max(0, -r.top / Math.max(r.height, 1)));
    };
    window.addEventListener("scroll", readScroll, { passive: true });
    readScroll();

    // --- loop ---------------------------------------------------------------
    let frame = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    let time = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;

      material.uniforms.uTime.value = time;
      material.uniforms.uAmp.value = Math.min(1, material.uniforms.uAmp.value + dt * 0.55);

      // Weight and inertia: everything eases toward its target rather than snapping.
      const p = material.uniforms.uPointer.value as Vector2;
      p.lerp(pointerTarget, 0.045);

      scrollNow += (scrollTarget - scrollNow) * 0.08;
      material.uniforms.uScroll.value = scrollNow;

      // Scroll drives the camera through real Z depth, and leans the cloth away.
      camera.position.set(0, scrollNow * 0.18, camDist - scrollNow * 0.62);
      camera.lookAt(0, 0, 0);
      mesh.rotation.x = -0.05 - scrollNow * 0.16;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(host);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);

    start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", readScroll);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);

      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  return <div ref={hostRef} className="absolute inset-0" aria-hidden />;
}
