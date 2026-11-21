import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type LookMode = 'sculptural' | 'tailored' | 'streetwear';

interface HeroThreeSceneProps {
  fallbackImage?: string;
}

const _targetVec = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createWovenFabricTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b1b1c';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 256; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function HeroThreeScene({ fallbackImage }: HeroThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<LookMode>('sculptural');
  const pausedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const resetTriggerRef = useRef(0);

  const [mode, setMode] = useState<LookMode>('sculptural');
  const [paused, setPaused] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const canvasEl = renderer.domElement;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    const onContextRestored = () => {
      setWebglFailed(false);
    };
    canvasEl.addEventListener('webglcontextlost', onContextLost);
    canvasEl.addEventListener('webglcontextrestored', onContextRestored);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 640;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(canvasEl);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 1.55, 5.2);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-point luxury studio lighting rig
    const hemiLight = new THREE.HemisphereLight(0xf5f3ef, 0x1a1816, 0.7);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.1);
    keyLight.position.set(3.5, 5.2, 4.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc8a477, 1.45);
    rimLight.position.set(-4.0, 3.0, -3.5);
    scene.add(rimLight);

    // Materials
    const fabricTex = createWovenFabricTexture();
    const travertineMat = new THREE.MeshStandardMaterial({
      color: 0xd9d2c5,
      roughness: 0.78,
      metalness: 0.04,
    });
    const bronzeMat = new THREE.MeshPhysicalMaterial({
      color: 0xa4845e,
      roughness: 0.22,
      metalness: 0.92,
      anisotropy: 0.7,
    });
    const garmentMat = new THREE.MeshPhysicalMaterial({
      color: 0x151517,
      map: fabricTex,
      roughness: 0.68,
      metalness: 0.06,
      sheen: 0.85,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(0x9a7b56),
    });
    const innerLiningMat = new THREE.MeshPhysicalMaterial({
      color: 0xeae4d9,
      roughness: 0.55,
      metalness: 0.05,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xffffff),
    });

    // Composite 9-part Couture Atelier Mannequin Group (grounded at y=0)
    const sculptureRoot = new THREE.Group();
    scene.add(sculptureRoot);

    // 1. Weighted stone plinth base
    const plinthGeo = new THREE.CylinderGeometry(1.05, 1.15, 0.16, 48);
    const plinthMesh = new THREE.Mesh(plinthGeo, travertineMat);
    plinthMesh.position.y = 0.08;
    plinthMesh.receiveShadow = true;
    sculptureRoot.add(plinthMesh);

    // 2. Bronze collar ring on plinth
    const ringGeo = new THREE.TorusGeometry(0.95, 0.015, 16, 64);
    const ringMesh = new THREE.Mesh(ringGeo, bronzeMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.165;
    sculptureRoot.add(ringMesh);

    // 3. Articulated bronze stand pole
    const poleGeo = new THREE.CylinderGeometry(0.032, 0.045, 1.35, 24);
    const poleMesh = new THREE.Mesh(poleGeo, bronzeMat);
    poleMesh.position.y = 0.84;
    poleMesh.castShadow = true;
    sculptureRoot.add(poleMesh);

    // Rotating mannequin assembly
    const mannequinGroup = new THREE.Group();
    mannequinGroup.position.y = 1.15;
    sculptureRoot.add(mannequinGroup);

    // 4. Sculpted Atelier Torso (LatheGeometry silhouette)
    const torsoPoints = [
      new THREE.Vector2(0.01, -0.32),
      new THREE.Vector2(0.32, -0.28),
      new THREE.Vector2(0.36, -0.05),
      new THREE.Vector2(0.28, 0.25),
      new THREE.Vector2(0.38, 0.58),
      new THREE.Vector2(0.45, 0.86),
      new THREE.Vector2(0.24, 1.04),
      new THREE.Vector2(0.11, 1.15),
      new THREE.Vector2(0.11, 1.26),
      new THREE.Vector2(0.01, 1.28),
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 48);
    torsoGeo.scale(1.16, 1.0, 0.72);
    const torsoMesh = new THREE.Mesh(torsoGeo, garmentMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    mannequinGroup.add(torsoMesh);

    // 5. Brushed bronze finial neck cap
    const finialGeo = new THREE.CylinderGeometry(0.115, 0.12, 0.09, 32);
    const finialMesh = new THREE.Mesh(finialGeo, bronzeMat);
    finialMesh.position.y = 1.3;
    mannequinGroup.add(finialMesh);

    // 6. Tailored lapel / asymmetric architectural drape (TubeGeometry)
    const lapelCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.34, 0.96, 0.18),
      new THREE.Vector3(-0.14, 0.65, 0.31),
      new THREE.Vector3(0.06, 0.25, 0.28),
      new THREE.Vector3(0.26, -0.18, 0.22),
    ]);
    const lapelGeo = new THREE.TubeGeometry(lapelCurve, 40, 0.055, 16, false);
    const lapelMesh = new THREE.Mesh(lapelGeo, innerLiningMat);
    lapelMesh.castShadow = true;
    mannequinGroup.add(lapelMesh);

    // 7. Opposite draped sash fold
    const sashCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.34, 0.94, 0.14),
      new THREE.Vector3(0.18, 0.58, 0.30),
      new THREE.Vector3(-0.16, 0.12, 0.26),
      new THREE.Vector3(-0.32, -0.25, 0.15),
    ]);
    const sashGeo = new THREE.TubeGeometry(sashCurve, 40, 0.045, 16, false);
    const sashMesh = new THREE.Mesh(sashGeo, bronzeMat);
    mannequinGroup.add(sashMesh);

    // 8. Structured shoulder blades / cape collar
    const collarGeo = new THREE.TorusGeometry(0.37, 0.065, 18, 48, Math.PI * 1.35);
    const collarMesh = new THREE.Mesh(collarGeo, garmentMat);
    collarMesh.rotation.set(Math.PI / 2.2, 0.15, -Math.PI * 0.18);
    collarMesh.position.set(0, 0.93, 0.02);
    mannequinGroup.add(collarMesh);

    // 9. Floating orbital measurement rings (signature atelier motif)
    const orbitRingA = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.008, 12, 72),
      bronzeMat
    );
    orbitRingA.position.y = 0.45;
    orbitRingA.rotation.set(Math.PI / 2.4, 0.3, 0);
    mannequinGroup.add(orbitRingA);

    const orbitRingB = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.006, 12, 72),
      innerLiningMat
    );
    orbitRingB.position.y = 0.62;
    orbitRingB.rotation.set(Math.PI / 1.8, -0.45, 0.2);
    mannequinGroup.add(orbitRingB);

    // Soft contact shadow disk directly under plinth
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.48)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.01;
    sculptureRoot.add(contactShadow);

    sculptureRoot.position.y = -0.35;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      pointerRef.current.x = THREE.MathUtils.clamp(nx, -1, 1);
      pointerRef.current.y = THREE.MathUtils.clamp(ny, -1, 1);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 640;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let spinAngle = 0;
    let currentReset = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      if (resetTriggerRef.current !== currentReset) {
        currentReset = resetTriggerRef.current;
        spinAngle = 0;
        pointerRef.current.x = 0;
        pointerRef.current.y = 0;
      }

      if (!pausedRef.current) {
        spinAngle += delta * 0.35;
      }

      const activeMode = modeRef.current;
      // Smoothly transition garment styling parameters per selected mode
      const targetScaleX = activeMode === 'streetwear' ? 1.16 : activeMode === 'tailored' ? 0.98 : 1.04;
      const targetScaleY = activeMode === 'tailored' ? 1.05 : 1.0;
      mannequinGroup.scale.x = THREE.MathUtils.damp(mannequinGroup.scale.x, targetScaleX, 5, delta);
      mannequinGroup.scale.y = THREE.MathUtils.damp(mannequinGroup.scale.y, targetScaleY, 5, delta);

      const targetHue = activeMode === 'streetwear' ? 0x1e2024 : activeMode === 'tailored' ? 0x26211e : 0x151517;
      garmentMat.color.lerp(
        _targetVec.set(((targetHue >> 16) & 255) / 255, ((targetHue >> 8) & 255) / 255, (targetHue & 255) / 255) as unknown as THREE.Color,
        Math.min(1, delta * 4)
      );

      // Interactive pointer parallax + smooth rotation
      const targetRotY = spinAngle + pointerRef.current.x * 0.45;
      const targetRotX = pointerRef.current.y * 0.1;
      mannequinGroup.rotation.y = THREE.MathUtils.damp(mannequinGroup.rotation.y, targetRotY, 4.5, delta);
      mannequinGroup.rotation.x = THREE.MathUtils.damp(mannequinGroup.rotation.x, targetRotX, 4.5, delta);

      orbitRingA.rotation.z = elapsed * 0.25;
      orbitRingB.rotation.z = -elapsed * 0.18;
      collarMesh.visible = activeMode !== 'streetwear';
      sashMesh.visible = activeMode === 'sculptural';
      lapelMesh.visible = activeMode !== 'streetwear';

      camera.position.x = THREE.MathUtils.damp(camera.position.x, pointerRef.current.x * 0.35, 3, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.55 - pointerRef.current.y * 0.2, 3, delta);
      camera.lookAt(0, 1.35, 0);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      canvasEl.removeEventListener('webglcontextlost', onContextLost);
      canvasEl.removeEventListener('webglcontextrestored', onContextRestored);

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      fabricTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
    };
  }, []);

  if (webglFailed) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#121212] overflow-hidden">
        {fallbackImage ? (
          <img
            src={fallbackImage}
            alt="SOVRAN Atelier Silhouette"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="text-center text-[#F5F3EF]/70 px-6">
            <p className="font-editorial text-2xl">Atelier Form 01</p>
            <p className="text-xs mt-1">Interactive 3D showcase paused on this device.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full select-none">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Sleek Bottom Control Bar (no backdrop-blur over WebGL) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#0A0A0A]/90 border border-white/15 px-3 py-2 text-[11px] text-[#F5F3EF]">
        <div className="flex items-center gap-1 pr-2 border-r border-white/15">
          {(['sculptural', 'tailored', 'streetwear'] as LookMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 capitalize transition-colors whitespace-nowrap shrink-0 ${
                mode === m
                  ? 'bg-[#9A7B56] text-[#0A0A0A] font-semibold'
                  : 'text-[#F5F3EF]/75 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Resume 3D rotation' : 'Pause 3D rotation'}
          className="p-1.5 text-[#F5F3EF]/80 hover:text-white transition-colors"
          title={paused ? 'Resume rotation' : 'Pause rotation'}
        >
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            resetTriggerRef.current += 1;
          }}
          aria-label="Reset 3D view"
          className="p-1.5 text-[#F5F3EF]/80 hover:text-white transition-colors"
          title="Reset camera & form"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
