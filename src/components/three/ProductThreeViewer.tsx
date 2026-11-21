import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SilhouetteType } from '../../types/store.ts';

interface ProductThreeViewerProps {
  silhouetteType: SilhouetteType;
  colorHex: string;
  colorName: string;
  productName: string;
}

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

export function ProductThreeViewer({
  silhouetteType,
  colorHex,
  colorName,
  productName,
}: ProductThreeViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const fabricMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const resetCamRef = useRef<(() => void) | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    if (fabricMatRef.current) {
      fabricMatRef.current.color.set(colorHex || '#1A1A1A');
      requestRenderRef.current?.();
    }
  }, [colorHex]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const canvasEl = renderer.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    canvasEl.addEventListener('webglcontextlost', onLost);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;

    const w = container.clientWidth || 520;
    const h = container.clientHeight || 580;
    renderer.setSize(w, h);
    container.innerHTML = '';
    container.appendChild(canvasEl);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeebe4);

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 50);
    camera.position.set(0, 1.1, 4.1);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xffffff, 0x9b9286, 0.85);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff4e6, 1.8);
    key.position.set(3, 5, 4);
    key.castShadow = !isSoftwareGl;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xdbe3ef, 0.8);
    fill.position.set(-4, 2, 2);
    scene.add(fill);

    const controls = new OrbitControls(camera, canvasEl);
    controls.enablePan = false;
    controls.minDistance = 2.6;
    controls.maxDistance = 6.2;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.maxPolarAngle = Math.PI * 0.65;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.85, 0);

    // Materials
    const fabricMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colorHex || '#1A1A1A'),
      roughness: 0.72,
      metalness: 0.04,
      sheen: 0.85,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(0xffffff),
    });
    fabricMatRef.current = fabricMat;

    const hardwareMat = new THREE.MeshPhysicalMaterial({
      color: 0xa4845e,
      roughness: 0.2,
      metalness: 0.92,
    });
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xd9d2c5,
      roughness: 0.85,
      metalness: 0.02,
    });

    const group = new THREE.Group();
    scene.add(group);

    // Studio Pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.1, 48), baseMat);
    pedestal.position.y = 0.05;
    pedestal.receiveShadow = true;
    group.add(pedestal);

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 20), hardwareMat);
    stand.position.y = 0.35;
    group.add(stand);

    const garmentGroup = new THREE.Group();
    garmentGroup.position.y = 0.72;
    group.add(garmentGroup);

    // Build tailored procedural silhouette depending on garment type
    if (silhouetteType === 'trousers' || silhouetteType === 'jeans') {
      const waistband = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.37, 0.12, 32),
        fabricMat
      );
      waistband.scale.set(1.15, 1, 0.68);
      waistband.position.y = 0.85;
      garmentGroup.add(waistband);

      const leftLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, silhouetteType === 'trousers' ? 0.21 : 0.16, 1.05, 28),
        fabricMat
      );
      leftLeg.position.set(-0.2, 0.28, 0);
      leftLeg.rotation.z = -0.04;
      garmentGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, silhouetteType === 'trousers' ? 0.21 : 0.16, 1.05, 28),
        fabricMat
      );
      rightLeg.position.set(0.2, 0.28, 0);
      rightLeg.rotation.z = 0.04;
      garmentGroup.add(rightLeg);

      const button = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), hardwareMat);
      button.rotation.x = Math.PI / 2;
      button.position.set(0, 0.85, 0.25);
      garmentGroup.add(button);
    } else if (silhouetteType === 'dress') {
      const dressPts = [
        new THREE.Vector2(0.42, -0.45),
        new THREE.Vector2(0.34, -0.05),
        new THREE.Vector2(0.24, 0.35),
        new THREE.Vector2(0.32, 0.68),
        new THREE.Vector2(0.26, 0.88),
        new THREE.Vector2(0.14, 0.96),
      ];
      const dressGeo = new THREE.LatheGeometry(dressPts, 48);
      dressGeo.scale(1.1, 1.0, 0.72);
      const dressMesh = new THREE.Mesh(dressGeo, fabricMat);
      dressMesh.position.y = 0.25;
      garmentGroup.add(dressMesh);
    } else {
      // Tops / Shirts / Hoodies / Jackets / Co-ord
      const torsoPts = [
        new THREE.Vector2(0.01, -0.1),
        new THREE.Vector2(0.36, -0.06),
        new THREE.Vector2(0.35, 0.25),
        new THREE.Vector2(0.40, 0.56),
        new THREE.Vector2(0.43, 0.78),
        new THREE.Vector2(0.20, 0.90),
        new THREE.Vector2(0.15, 0.94),
      ];
      const bodyGeo = new THREE.LatheGeometry(torsoPts, 42);
      bodyGeo.scale(1.12, 1.0, 0.66);
      const bodyMesh = new THREE.Mesh(bodyGeo, fabricMat);
      bodyMesh.castShadow = true;
      garmentGroup.add(bodyMesh);

      const isShortSleeve = silhouetteType === 'tee';
      const sleeveLen = isShortSleeve ? 0.34 : 0.76;
      const sleeveRadiusTop = silhouetteType === 'hoodie' || silhouetteType === 'jacket' ? 0.145 : 0.125;
      const sleeveRadiusBot = isShortSleeve ? 0.115 : 0.095;

      const leftSleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveRadiusTop, sleeveRadiusBot, sleeveLen, 24),
        fabricMat
      );
      leftSleeve.position.set(-0.53, isShortSleeve ? 0.63 : 0.44, 0);
      leftSleeve.rotation.z = isShortSleeve ? 0.55 : 0.32;
      garmentGroup.add(leftSleeve);

      const rightSleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveRadiusTop, sleeveRadiusBot, sleeveLen, 24),
        fabricMat
      );
      rightSleeve.position.set(0.53, isShortSleeve ? 0.63 : 0.44, 0);
      rightSleeve.rotation.z = isShortSleeve ? -0.55 : -0.32;
      garmentGroup.add(rightSleeve);

      if (silhouetteType === 'hoodie') {
        const hood = new THREE.Mesh(
          new THREE.SphereGeometry(0.23, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.65),
          fabricMat
        );
        hood.position.set(0, 0.92, -0.08);
        hood.rotation.x = -0.35;
        garmentGroup.add(hood);
      }

      if (silhouetteType === 'jacket' || silhouetteType === 'shirt') {
        // Button placket hardware
        for (let i = 0; i < 4; i++) {
          const btn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.015, 16),
            hardwareMat
          );
          btn.rotation.x = Math.PI / 2;
          btn.position.set(0, 0.74 - i * 0.2, 0.28);
          garmentGroup.add(btn);
        }
      }
    }

    // On-demand coalesced rendering loop
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;

    function afterDraw(done: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(done, 80);
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
          frameId = window.setTimeout(done, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        const finish = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(finish);
        else finish();
      });
    };

    requestRenderRef.current = requestRender;
    resetCamRef.current = () => {
      camera.position.set(0, 1.1, 4.1);
      controls.target.set(0, 0.85, 0);
      controls.update();
      requestRender();
    };

    controls.addEventListener('change', requestRender);
    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 520;
      const nh = container.clientHeight || 580;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.removeEventListener('change', requestRender);
      window.removeEventListener('resize', onResize);
      canvasEl.removeEventListener('webglcontextlost', onLost);
      controls.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [silhouetteType]);

  if (webglFailed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#EEEBE4] text-center p-8">
        <div>
          <p className="font-editorial text-2xl text-[#0A0A0A]">{productName}</p>
          <p className="text-xs text-[#0A0A0A]/60 mt-1">
            3D garment viewer unavailable on this browser; switch back to editorial gallery.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#EEEBE4]">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-[#0A0A0A]/85 text-[#F5F3EF] px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full border border-white/40 inline-block"
            style={{ backgroundColor: colorHex }}
          />
          <span>
            3D Silhouette · {colorName} · Drag to rotate
          </span>
        </div>
        <button
          type="button"
          onClick={() => resetCamRef.current?.()}
          className="flex items-center gap-1 hover:text-[#9A7B56] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
