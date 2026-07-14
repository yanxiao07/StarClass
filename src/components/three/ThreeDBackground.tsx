import { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * 三维星空背景 - 星学园主题
 * 浅色背景下的精致金色立体星星点缀
 * 设计：金色立体八面体星 + 微弱粒子尘 + 暖色灯光
 */
export const ThreeDBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const crystalsRef = useRef<THREE.Object3D[]>([]);
  const animationIdRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    // 浅色雾化，让远处星星柔和淡出
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.018);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 12;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // ============================================
    // 金色粒子尘埃 - 营造星学园氛围
    // ============================================
    const createDustParticles = () => {
      const dustGeometry = new THREE.BufferGeometry();
      const dustCount = 600;
      const positions = new Float32Array(dustCount * 3);
      const colors = new Float32Array(dustCount * 3);

      const goldColor = new THREE.Color(0xfbbf24);
      const amberColor = new THREE.Color(0xf59e0b);
      const lightGoldColor = new THREE.Color(0xfde68a);

      for (let i = 0; i < dustCount; i++) {
        const i3 = i * 3;
        const radius = 25 + Math.random() * 65;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        // 金色系为主：金黄、琥珀、浅金
        const colorRoll = Math.random();
        let color: THREE.Color;
        if (colorRoll < 0.5) {
          color = goldColor;
        } else if (colorRoll < 0.85) {
          color = amberColor;
        } else {
          color = lightGoldColor;
        }
        const variation = 0.6 + Math.random() * 0.4;
        colors[i3] = color.r * variation;
        colors[i3 + 1] = color.g * variation;
        colors[i3 + 2] = color.b * variation;
      }

      dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const dustMaterial = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });

      const dust = new THREE.Points(dustGeometry, dustMaterial);
      scene.add(dust);
      starsRef.current = dust;

      geometries.push(dustGeometry);
      materials.push(dustMaterial);
    };

    createDustParticles();

    // ============================================
    // 立体金色星星 - 八面体菱形（金属质感）
    // ============================================
    const starConfigs: Array<{
      radius: number;
      pos: [number, number, number];
      color: number;
      emissive: number;
    }> = [
        { radius: 0.55, pos: [-5, 1.5, -1], color: 0xfbbf24, emissive: 0xf59e0b },
        { radius: 0.4, pos: [4.5, -1.2, -2], color: 0xf59e0b, emissive: 0xd97706 },
        { radius: 0.65, pos: [3, 2.2, 1], color: 0xfde68a, emissive: 0xfbbf24 },
        { radius: 0.45, pos: [-3.5, -1.8, -1], color: 0xfbbf24, emissive: 0xf59e0b },
        { radius: 0.35, pos: [0, 3, -3], color: 0xf59e0b, emissive: 0xb45309 },
        { radius: 0.5, pos: [-5.5, -2.5, 0], color: 0xfde68a, emissive: 0xfbbf24 },
        { radius: 0.4, pos: [5.5, 2.8, -2], color: 0xfbbf24, emissive: 0xf59e0b },
        { radius: 0.3, pos: [1.5, -3, 1], color: 0xf59e0b, emissive: 0xd97706 },
        { radius: 0.45, pos: [-2, 2.5, -2], color: 0xfde68a, emissive: 0xfbbf24 },
        { radius: 0.35, pos: [2, -2.8, 0], color: 0xfbbf24, emissive: 0xf59e0b },
      ];

    const crystals: THREE.Object3D[] = [];

    starConfigs.forEach((cfg) => {
      // 八面体 = 双锥菱形，模拟立体星星造型
      const geometry = new THREE.OctahedronGeometry(cfg.radius, 0);

      const material = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.emissive,
        emissiveIntensity: 0.25,
        roughness: 0.25,
        metalness: 0.85,
        flatShading: true,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      mesh.userData = {
        rotationSpeed: {
          x: 0.002 + Math.random() * 0.003,
          y: 0.003 + Math.random() * 0.004,
          z: 0.001 + Math.random() * 0.002,
        },
        floatSpeed: 0.4 + Math.random() * 0.4,
        floatRange: 0.25 + Math.random() * 0.25,
        baseY: cfg.pos[1],
        offset: Math.random() * Math.PI * 2,
      };
      crystals.push(mesh);
      scene.add(mesh);

      geometries.push(geometry);
      materials.push(material);
    });

    crystalsRef.current = crystals;

    // ============================================
    // 灯光 - 暖色调，凸显金色质感
    // ============================================
    const ambientLight = new THREE.AmbientLight(0xfffbeb, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const goldLight = new THREE.PointLight(0xfbbf24, 0.8, 30);
    goldLight.position.set(-3, 2, 4);
    scene.add(goldLight);

    const amberLight = new THREE.PointLight(0xf59e0b, 0.5, 25);
    amberLight.position.set(4, -2, 3);
    scene.add(amberLight);

    // ============================================
    // 鼠标交互 - 微妙视差
    // ============================================
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // ============================================
    // 动画循环
    // ============================================
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      // 平滑插值鼠标位置
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      // 场景随鼠标轻微旋转（视差感）
      if (sceneRef.current) {
        sceneRef.current.rotation.y = mouseRef.current.x * 0.2;
        sceneRef.current.rotation.x = mouseRef.current.y * 0.1;
      }

      // 粒子尘埃缓慢自转
      if (starsRef.current) {
        starsRef.current.rotation.y += 0.0004;
        starsRef.current.rotation.x += 0.00015;
      }

      // 立体星星旋转 + 漂浮
      crystals.forEach((obj) => {
        const data = obj.userData;
        obj.rotation.x += data.rotationSpeed.x;
        obj.rotation.y += data.rotationSpeed.y;
        obj.rotation.z += data.rotationSpeed.z;
        obj.position.y = data.baseY + Math.sin(time * data.floatSpeed + data.offset) * data.floatRange;
      });

      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小变化
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.7,
      }}
    />
  );
};
