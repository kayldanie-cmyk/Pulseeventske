"use client";

import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────────────────────
 * Cinematic 3D Event Backgrounds — Three.js WebGL
 *
 * Three ultra-realistic scroll-reactive scenes that replace the 2D canvas BG:
 *   • FESTIVAL (Music / Sports / Comedy)  — volumetric laser beams, instanced crowd, stage haze
 *   • CONFERENCE (Conference / Other)      — holographic data nodes, orbital rings, grid floor
 *   • BEACH (Nightlife / Food & Culture)   — 3D ocean waves, setting sun, palm trees, lanterns
 *
 * All respond to scroll position (0→1) with camera dollies, atmosphere shifts, and depth.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface Cinematic3DAPI {
  on(e: { cat: string }): void;
  off(): void;
  isOpen(): boolean;
  lite(): boolean;
  isLite(): boolean;
}

const NOOP: Cinematic3DAPI = {
  on() {},
  off() {},
  isOpen: () => false,
  lite: () => false,
  isLite: () => false,
};

const SCN_MAP: Record<string, string> = {
  Music: "fest",
  Sports: "fest",
  Comedy: "fest",
  Conference: "conf",
  Other: "conf",
  Nightlife: "beach",
  "Food and culture": "beach",
};

export function createCinematic3D(
  bgw: HTMLElement,
  canvas: HTMLCanvasElement,
  glEl: HTMLElement | null,
  dvEl: HTMLElement | null
): Cinematic3DAPI {
  if (!canvas || !bgw) return NOOP;

  let R: THREE.WebGLRenderer | null = null;
  try {
    R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 0.85;
  } catch {
    return NOOP;
  }

  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  let open = false;
  let running = false;
  let liteMode = false;
  let scn = "conf";
  let T = 0;
  let sp = 0;
  let frameId = 0;
  const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ═══════ Resize ═══════ */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (R) R.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  /* ═══════ Scroll tracking on #dv ═══════ */
  dvEl?.addEventListener(
    "scroll",
    function (this: HTMLElement) {
      sp = this.scrollTop / Math.max(1, this.scrollHeight - this.clientHeight);
    },
    { passive: true }
  );

  const rn = (n: number) => Math.random() * n;

  /* ══════════════════════════════════════════════════════════════════════════
   * SCENE 1 — FESTIVAL  (Music / Sports / Comedy)
   * Volumetric light beams, instanced crowd, stage haze, pulsing ring
   * ══════════════════════════════════════════════════════════════════════════ */
  const festScene = new THREE.Scene();
  festScene.fog = new THREE.FogExp2(0x030108, 0.013);
  festScene.background = new THREE.Color(0x030108);
  festScene.add(new THREE.AmbientLight(0x1a0820, 0.3));

  // Stage platform
  const stage = new THREE.Mesh(
    new THREE.BoxGeometry(44, 0.8, 14),
    new THREE.MeshStandardMaterial({ color: 0x0a0510, metalness: 0.9, roughness: 0.3 })
  );
  stage.position.set(0, -5, -28);
  festScene.add(stage);

  // Stage edge glow
  const edgeGlow = new THREE.Mesh(
    new THREE.BoxGeometry(45, 0.15, 14.2),
    new THREE.MeshBasicMaterial({ color: 0xff2080, transparent: true, opacity: 0.7 })
  );
  edgeGlow.position.set(0, -4.55, -28);
  festScene.add(edgeGlow);

  // Pulsing stage ring
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff2080,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });
  const stageRing = new THREE.Mesh(new THREE.TorusGeometry(9, 0.06, 8, 64), ringMat);
  stageRing.position.set(0, -4.1, -28);
  stageRing.rotation.x = -Math.PI / 2;
  festScene.add(stageRing);

  // Volumetric light beam cones
  const BEAM_N = 14;
  const beams: THREE.Mesh[] = [];
  for (let i = 0; i < BEAM_N; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / BEAM_N, 1, 0.5),
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(14, 75, 6, 1, true), mat);
    beam.position.set(-18 + (i / (BEAM_N - 1)) * 36, -4, -28);
    beam.rotation.z = Math.PI; // point up
    festScene.add(beam);
    beams.push(beam);
  }

  // Atmospheric haze particles
  const HAZE_N = 1800;
  const hazeGeo = new THREE.BufferGeometry();
  const hazePos = new Float32Array(HAZE_N * 3);
  for (let i = 0; i < HAZE_N; i++) {
    hazePos[i * 3] = (rn(1) - 0.5) * 90;
    hazePos[i * 3 + 1] = rn(65) - 5;
    hazePos[i * 3 + 2] = -rn(55) - 5;
  }
  hazeGeo.setAttribute("position", new THREE.BufferAttribute(hazePos, 3));
  const hazeMat = new THREE.PointsMaterial({
    color: 0xffcc88,
    size: 0.7,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  festScene.add(new THREE.Points(hazeGeo, hazeMat));

  // Instanced crowd silhouettes
  const CROWD_N = 130;
  const crowdGeo = new THREE.CapsuleGeometry(0.35, 1.2, 2, 6);
  const crowdInst = new THREE.InstancedMesh(
    crowdGeo,
    new THREE.MeshStandardMaterial({ color: 0x050208, roughness: 1 }),
    CROWD_N
  );
  const crowdDummy = new THREE.Object3D();
  const crowdMeta: { x: number; h: number; ph: number; row: number }[] = [];
  for (let i = 0; i < CROWD_N; i++) {
    const cx = (rn(1) - 0.5) * 48;
    const row = i % 5;
    const h = 1.0 + rn(0.6);
    crowdDummy.position.set(cx, -4.5 + h * 0.5, -15 + row * 1.2);
    crowdDummy.scale.set(1, h, 1);
    crowdDummy.updateMatrix();
    crowdInst.setMatrixAt(i, crowdDummy.matrix);
    crowdMeta.push({ x: cx, h, ph: rn(Math.PI * 2), row });
  }
  crowdInst.instanceMatrix.needsUpdate = true;
  festScene.add(crowdInst);

  function updateFest(t: number, scroll: number) {
    cam.position.set(Math.sin(t * 0.05) * 2.5, 2 + scroll * 24, 20 + scroll * 28);
    cam.lookAt(0, -2 + scroll * 6, -28);

    // Sweep beams
    for (let i = 0; i < BEAM_N; i++) {
      const b = beams[i];
      b.rotation.x = Math.sin(t * 0.7 + i * 0.9) * 0.45;
      b.rotation.z = Math.PI + Math.sin(t * 0.4 + i * 1.3) * 0.15;
      const m = b.material as THREE.MeshBasicMaterial;
      m.color.setHSL(((i / BEAM_N + t * 0.03) % 1 + 1) % 1, 1, 0.55);
      m.opacity = 0.04 + scroll * 0.05 + Math.sin(t * 2 + i) * 0.015;
    }

    // Haze drift
    const hp = hazeGeo.attributes.position.array as Float32Array;
    for (let i = 1; i < HAZE_N * 3; i += 3) {
      hp[i] += 0.016;
      if (hp[i] > 62) hp[i] = -5;
    }
    hazeGeo.attributes.position.needsUpdate = true;
    hazeMat.opacity = 0.13 + scroll * 0.22;

    // Crowd bobbing
    for (let i = 0; i < CROWD_N; i++) {
      const c = crowdMeta[i];
      crowdDummy.position.set(
        c.x,
        -4.5 + c.h * 0.5 + Math.sin(t * 3 + c.ph) * 0.18,
        -15 + c.row * 1.2
      );
      crowdDummy.scale.set(1, c.h, 1);
      crowdDummy.updateMatrix();
      crowdInst.setMatrixAt(i, crowdDummy.matrix);
    }
    crowdInst.instanceMatrix.needsUpdate = true;

    // Pulse ring
    const pulse = 0.88 + Math.sin(t * 4) * 0.15;
    stageRing.scale.set(pulse, pulse, 1);
    ringMat.opacity = 0.5 + Math.sin(t * 4) * 0.3;
    (edgeGlow.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 3) * 0.3;
    (festScene.fog as THREE.FogExp2).density = 0.011 + scroll * 0.009;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * SCENE 2 — CONFERENCE  (Conference / Other)
   * Holographic data nodes, dynamic connection lines, orbital rings, grid
   * ══════════════════════════════════════════════════════════════════════════ */
  const confScene = new THREE.Scene();
  confScene.fog = new THREE.FogExp2(0x020610, 0.007);
  confScene.background = new THREE.Color(0x020610);
  confScene.add(new THREE.AmbientLight(0x0a1830, 0.4));

  const spotlight = new THREE.SpotLight(0x00ccff, 3, 100, Math.PI / 4, 0.5, 1);
  spotlight.position.set(0, 30, 0);
  confScene.add(spotlight);

  // Floating data nodes
  const NODE_N = 48;
  interface DNode {
    mesh: THREE.Mesh;
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    phase: number;
  }
  const nodes: DNode[] = [];
  for (let i = 0; i < NODE_N; i++) {
    const r = 0.2 + rn(0.5);
    const hue = 0.5 + rn(0.15);
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 0.9, 0.6),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      })
    );
    const pos = new THREE.Vector3((rn(1) - 0.5) * 42, (rn(1) - 0.5) * 26, (rn(1) - 0.5) * 42);
    mesh.position.copy(pos);
    confScene.add(mesh);

    // Halo glow
    mesh.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(r * 2.8, 8, 8),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(hue, 0.8, 0.5),
          transparent: true,
          opacity: 0.07,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
        })
      )
    );

    nodes.push({
      mesh,
      pos,
      vel: new THREE.Vector3((rn(1) - 0.5) * 0.012, (rn(1) - 0.5) * 0.009, (rn(1) - 0.5) * 0.012),
      phase: rn(Math.PI * 2),
    });
  }

  // Connection line segments
  const MAX_CONN = 220;
  const linePos = new Float32Array(MAX_CONN * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x00ddff,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
  });
  confScene.add(new THREE.LineSegments(lineGeo, lineMat));

  // Grid floor
  const grid = new THREE.GridHelper(80, 60, 0x0a2040, 0x061530);
  grid.position.y = -15;
  confScene.add(grid);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({
      color: 0x020610,
      metalness: 0.95,
      roughness: 0.15,
      transparent: true,
      opacity: 0.7,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -15.05;
  confScene.add(floor);

  // Orbital rings
  const orbital1 = new THREE.Mesh(
    new THREE.TorusGeometry(18, 0.05, 8, 128),
    new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    })
  );
  orbital1.rotation.x = Math.PI / 3;
  confScene.add(orbital1);

  const orbital2 = new THREE.Mesh(
    new THREE.TorusGeometry(22, 0.03, 8, 128),
    new THREE.MeshBasicMaterial({
      color: 0x2266ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    })
  );
  orbital2.rotation.set(Math.PI / 5, Math.PI / 4, 0);
  confScene.add(orbital2);

  // Ambient particles
  const CPART_N = 900;
  const cPartGeo = new THREE.BufferGeometry();
  const cPartPos = new Float32Array(CPART_N * 3);
  for (let i = 0; i < CPART_N; i++) {
    cPartPos[i * 3] = (rn(1) - 0.5) * 80;
    cPartPos[i * 3 + 1] = (rn(1) - 0.5) * 60;
    cPartPos[i * 3 + 2] = (rn(1) - 0.5) * 80;
  }
  cPartGeo.setAttribute("position", new THREE.BufferAttribute(cPartPos, 3));
  confScene.add(
    new THREE.Points(
      cPartGeo,
      new THREE.PointsMaterial({
        color: 0x4488ff,
        size: 0.15,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    )
  );

  function updateConf(t: number, scroll: number) {
    const angle = t * 0.1 + scroll * Math.PI * 0.5;
    const radius = 28 + scroll * 14;
    cam.position.set(Math.sin(angle) * radius, 5 + scroll * 10, Math.cos(angle) * radius);
    cam.lookAt(0, -2, 0);

    // Animate & bounce nodes
    const spread = 1 + scroll * 0.6;
    nodes.forEach((n) => {
      n.pos.add(n.vel);
      ["x", "y", "z"].forEach((ax) => {
        const lim = ax === "y" ? 16 : 26;
        if (Math.abs((n.pos as unknown as Record<string, number>)[ax]) > lim)
          (n.vel as unknown as Record<string, number>)[ax] *= -1;
      });
      n.mesh.position.set(n.pos.x * spread, n.pos.y * spread, n.pos.z * spread);
      const s = 1 + Math.sin(t * 2 + n.phase) * 0.15;
      n.mesh.scale.setScalar(s);
      n.mesh.rotation.y = t * 0.5 + n.phase;
    });

    // Connection lines
    let idx = 0;
    const thresh = 13 - scroll * 4;
    for (let i = 0; i < NODE_N && idx < MAX_CONN; i++) {
      for (let j = i + 1; j < NODE_N && idx < MAX_CONN; j++) {
        const d = nodes[i].mesh.position.distanceTo(nodes[j].mesh.position);
        if (d < thresh) {
          const a = nodes[i].mesh.position;
          const b = nodes[j].mesh.position;
          linePos.set([a.x, a.y, a.z, b.x, b.y, b.z], idx * 6);
          idx++;
        }
      }
    }
    for (let i = idx; i < MAX_CONN; i++) linePos.fill(0, i * 6, i * 6 + 6);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.setDrawRange(0, idx * 2);
    lineMat.opacity = 0.15 - scroll * 0.06;

    orbital1.rotation.z = t * 0.15;
    orbital2.rotation.z = -t * 0.1;
    spotlight.position.x = Math.sin(t * 0.3) * 15;
    spotlight.position.z = Math.cos(t * 0.3) * 15;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * SCENE 3 — BEACH  (Nightlife / Food & Culture)
   * 3D ocean, sun/moon transit, palm trees, floating lanterns, stars
   * ══════════════════════════════════════════════════════════════════════════ */
  const beachScene = new THREE.Scene();
  beachScene.fog = new THREE.FogExp2(0x1a0a20, 0.005);

  const sunLight = new THREE.DirectionalLight(0xff8844, 1.5);
  sunLight.position.set(0, 5, -50);
  beachScene.add(sunLight);
  beachScene.add(new THREE.AmbientLight(0x1a1025, 0.3));

  // Moon
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xdde8ff });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 24), moonMat);
  moon.position.set(15, -10, -70);
  beachScene.add(moon);
  const moonHalo = new THREE.Mesh(
    new THREE.SphereGeometry(6, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0x8899cc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    })
  );
  moon.add(moonHalo);

  // Sun
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xff6622 });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), sunMat);
  sun.position.set(0, 8, -80);
  beachScene.add(sun);
  const sunHalo1 = new THREE.Mesh(
    new THREE.SphereGeometry(13, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff6622,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    })
  );
  sun.add(sunHalo1);
  const sunHalo2 = new THREE.Mesh(
    new THREE.SphereGeometry(24, 12, 12),
    new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    })
  );
  sun.add(sunHalo2);

  // 3D Ocean with wave animation
  const SEG = 80;
  const oceanGeo = new THREE.PlaneGeometry(220, 140, SEG, SEG);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0a2838,
    metalness: 0.85,
    roughness: 0.12,
    transparent: true,
    opacity: 0.92,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -3, -30);
  beachScene.add(ocean);
  const baseOceanPos = new Float32Array(oceanGeo.attributes.position.array);

  // Stars (upper hemisphere)
  const STAR_N = 550;
  const starGeo = new THREE.BufferGeometry();
  const starArr = new Float32Array(STAR_N * 3);
  for (let i = 0; i < STAR_N; i++) {
    const th = rn(Math.PI * 0.45);
    const ph = rn(Math.PI * 2);
    const r = 85 + rn(35);
    starArr[i * 3] = r * Math.sin(th) * Math.cos(ph);
    starArr[i * 3 + 1] = Math.abs(r * Math.cos(th)) + 8;
    starArr[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph) - 40;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starArr, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.45,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  beachScene.add(new THREE.Points(starGeo, starMat));

  // Palm trees
  function makePalm(px: number, pz: number, lean: number) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.35, 13, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a1a08, roughness: 0.9 })
    );
    trunk.position.y = 3.5;
    trunk.rotation.z = lean;
    g.add(trunk);
    for (let f = 0; f < 8; f++) {
      const a = (f / 8) * Math.PI * 2;
      const frond = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 5.5, 1, 4),
        new THREE.MeshStandardMaterial({
          color: 0x0a2510,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.88,
        })
      );
      frond.position.set(Math.cos(a) * 1.6, 10, Math.sin(a) * 1.6);
      frond.rotation.set(-0.55, a, 0.35);
      g.add(frond);
    }
    g.position.set(px, -3, pz);
    return g;
  }
  const palms = [makePalm(-28, -10, 0.08), makePalm(30, -7, -0.06), makePalm(-20, -16, 0.12)];
  palms.forEach((p) => beachScene.add(p));

  // Floating lanterns
  const LANT_N = 20;
  interface Lantern {
    mesh: THREE.Mesh;
    light: THREE.PointLight;
    baseY: number;
    phase: number;
    speed: number;
  }
  const lanterns: Lantern[] = [];
  for (let i = 0; i < LANT_N; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      })
    );
    const lx = (rn(1) - 0.5) * 55;
    const ly = 2 + rn(22);
    const lz = -12 - rn(45);
    mesh.position.set(lx, ly, lz);
    beachScene.add(mesh);

    // Warm halo
    mesh.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 6, 6),
        new THREE.MeshBasicMaterial({
          color: 0xff8833,
          transparent: true,
          opacity: 0.05,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
        })
      )
    );

    const light = new THREE.PointLight(0xffaa44, 0.25, 8);
    mesh.add(light);
    lanterns.push({ mesh, light, baseY: ly, phase: rn(Math.PI * 2), speed: 0.005 + rn(0.01) });
  }

  const sunsetBg = new THREE.Color(0x1a0520);
  const nightBg = new THREE.Color(0x020210);
  const tmpCol = new THREE.Color();

  function updateBeach(t: number, scroll: number) {
    cam.position.set(Math.sin(t * 0.03) * 6, 4.5 + scroll * 12, 28 - scroll * 12);
    cam.lookAt(0, 2 - scroll * 4, -45);

    // Sun descends with scroll, moon rises
    sun.position.y = 8 - scroll * 14;
    tmpCol.lerpColors(new THREE.Color(0xff6622), new THREE.Color(0x880022), scroll);
    sunMat.color.copy(tmpCol);
    (sunHalo1.material as THREE.MeshBasicMaterial).color.copy(tmpCol);
    (sunHalo1.material as THREE.MeshBasicMaterial).opacity = 0.14 * (1 - scroll * 0.75);
    (sunHalo2.material as THREE.MeshBasicMaterial).opacity = 0.05 * (1 - scroll * 0.7);
    sunLight.intensity = 1.5 * (1 - scroll * 0.85);
    sunLight.color.copy(tmpCol);

    // Moon rises
    moon.position.y = -10 + scroll * 28;
    (moonHalo.material as THREE.MeshBasicMaterial).opacity = Math.max(0, scroll - 0.4) * 0.15;

    // Sky color
    tmpCol.lerpColors(sunsetBg, nightBg, scroll);
    beachScene.background = tmpCol.clone();
    (beachScene.fog as THREE.FogExp2).color.copy(tmpCol);
    (beachScene.fog as THREE.FogExp2).density = 0.004 + scroll * 0.005;

    // Stars
    starMat.opacity = Math.max(0, scroll * 1.6 - 0.35);

    // Ocean waves (compound sine displacement)
    const oPos = oceanGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < oPos.length; i += 3) {
      const bx = baseOceanPos[i];
      const bz = baseOceanPos[i + 2];
      oPos[i + 1] =
        baseOceanPos[i + 1] +
        Math.sin(bx * 0.14 + t * 1.3) * 0.45 +
        Math.sin(bz * 0.18 + t * 0.9) * 0.35 +
        Math.sin((bx + bz) * 0.09 + t * 0.55) * 0.65;
    }
    oceanGeo.attributes.position.needsUpdate = true;
    oceanGeo.computeVertexNormals();
    oceanMat.color.lerpColors(new THREE.Color(0x0a3040), new THREE.Color(0x040818), scroll);

    // Palm sway
    palms.forEach((p, i) => {
      p.rotation.z = Math.sin(t * 0.5 + i) * 0.035;
      p.rotation.x = Math.sin(t * 0.3 + i * 2) * 0.025;
    });

    // Lanterns float upward
    lanterns.forEach((l) => {
      l.mesh.position.y = l.baseY + Math.sin(t + l.phase) * 0.6;
      l.mesh.position.x += Math.sin(t * 0.5 + l.phase) * 0.003;
      l.baseY += l.speed;
      if (l.baseY > 32) {
        l.baseY = -2;
        l.mesh.position.y = -2;
      }
      const glow = 0.25 + scroll * 0.55 + Math.sin(t * 3 + l.phase) * 0.08;
      l.light.intensity = glow;
      (l.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 + scroll * 0.35;
    });
  }

  /* ═══════ Scene dispatch & render loop ═══════ */
  const scenes: Record<string, { scene: THREE.Scene; update: (t: number, s: number) => void }> = {
    fest: { scene: festScene, update: updateFest },
    conf: { scene: confScene, update: updateConf },
    beach: { scene: beachScene, update: updateBeach },
  };

  function loop() {
    if (!open) {
      running = false;
      return;
    }
    T += 0.016;
    if (!(liteMode || rm) || T < 0.2) {
      const entry = scenes[scn];
      if (entry && R) {
        entry.update(T, sp);
        R.render(entry.scene, cam);
      }
    }
    frameId = requestAnimationFrame(loop);
  }

  return {
    on(e: { cat: string }) {
      scn = SCN_MAP[e.cat] || "conf";
      T = 0;
      sp = 0;
      open = true;
      bgw.hidden = false;
      if (glEl) glEl.style.display = "none";
      if (!running) {
        running = true;
        loop();
      }
    },
    off() {
      open = false;
      running = false;
      cancelAnimationFrame(frameId);
      bgw.hidden = true;
      if (glEl) glEl.style.display = "";
    },
    isOpen() {
      return open;
    },
    lite() {
      liteMode = !liteMode;
      T = 0;
      return liteMode;
    },
    isLite() {
      return liteMode;
    },
  };
}
