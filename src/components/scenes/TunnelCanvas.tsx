"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function TunnelCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check prefers-reduced-motion or saveData
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const connection = (navigator as unknown as { connection?: { saveData?: boolean } })
      .connection;
    const isSaveData = connection?.saveData === true;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      container.appendChild(renderer.domElement);
    } catch {
      // Fallback if WebGL is disabled or unavailable on this device/browser
      setWebglSupported(false);
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07100b, 0.012);

    const aspect =
      (container.clientWidth || window.innerWidth) /
      (container.clientHeight || window.innerHeight);
    const camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 600);

    const LEN = 420;
    const N = prefersReducedMotion || isSaveData ? 24 : 56;
    const rings: THREE.Mesh[] = [];
    const col = new THREE.Color();

    for (let i = 0; i < N; i++) {
      const geo = new THREE.TorusGeometry(
        9 + Math.sin(i * 0.7) * 1.5,
        0.07,
        6,
        48
      );
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.85,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.z = -i * (LEN / N);
      ring.userData.i = i;
      scene.add(ring);
      rings.push(ring);
    }

    // Particle dust (reduced on low-data or reduced-motion devices)
    const pc = prefersReducedMotion || isSaveData ? 400 : 1400;
    const pp = new Float32Array(pc * 3);
    for (let j = 0; j < pc; j++) {
      const a = Math.random() * Math.PI * 2;
      const rd = 3 + Math.random() * 16;
      pp[j * 3] = Math.cos(a) * rd;
      pp[j * 3 + 1] = Math.sin(a) * rd;
      pp[j * 3 + 2] = -Math.random() * LEN;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    const pm = new THREE.PointsMaterial({
      size: 0.14,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(pg, pm));

    let prog = 0;
    let cur = 0;
    let mx = 0;
    let my = 0;
    let th = 0;
    const t0 = performance.now();
    let animId: number;
    let isVisible = !document.hidden;

    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      prog = h > 0 ? Math.min(1, window.scrollY / h) : 0;
    };

    const onPointer = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      mx = (clientX / window.innerWidth - 0.5) * 2;
      my = (clientY / window.innerHeight - 0.5) * 2;
    };

    const onResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onPointer, { passive: true });
    window.addEventListener("touchmove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    onScroll();

    function animate() {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return; // Pause GPU processing when tab is in background

      const t = (performance.now() - t0) / 1000;
      cur += (prog - cur) * (prefersReducedMotion ? 0.02 : 0.06);

      const z = -cur * (LEN - 30);
      camera.position.set(
        mx * 1.2 + Math.sin(t * 0.4) * 0.3,
        -my * 0.8 + Math.cos(t * 0.3) * 0.2,
        z
      );
      camera.rotation.z = Math.sin(cur * 8) * 0.05 - mx * 0.03;
      camera.lookAt(
        camera.position.x * 0.3,
        camera.position.y * 0.3,
        z - 20
      );

      const h = th + cur * 0.2;
      rings.forEach((r) => {
        col.setHSL(((h + r.userData.i * 0.006) % 1 + 1) % 1, 0.9, 0.58);
        (r.material as THREE.MeshBasicMaterial).color.copy(col);
        r.rotation.z =
          t * 0.12 * (r.userData.i % 2 ? 1 : -1) + r.userData.i * 0.1;
        const s = 1 + Math.sin(t * 2 + r.userData.i * 0.5) * 0.03;
        r.scale.set(s, s, 1);
      });

      col.setHSL(((h + 0.1) % 1 + 1) % 1, 0.9, 0.65);
      pm.color.copy(col);

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onPointer);
      window.removeEventListener("touchmove", onPointer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  if (!webglSupported) {
    // Beautiful CSS animated gradient fallback for devices without WebGL
    return (
      <div
        className="w-full h-full opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(62,207,110,0.25) 0%, rgba(7,16,11,0.95) 75%)",
        }}
      />
    );
  }

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
