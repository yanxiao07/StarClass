import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface FloatingObjectsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const FloatingObjects = ({ canvasRef }: FloatingObjectsProps) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectsRef = useRef<THREE.Object3D[]>([]);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 8;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    const objects: THREE.Object3D[] = [];

    const createBook = () => {
      const group = new THREE.Group();

      const coverGeometry = new THREE.BoxGeometry(1, 0.8, 0.1);
      const coverMaterial = new THREE.MeshStandardMaterial({
        color: '#8B5CF6',
        roughness: 0.5,
        metalness: 0.2,
      });
      const cover = new THREE.Mesh(coverGeometry, coverMaterial);
      group.add(cover);

      const pagesGeometry = new THREE.BoxGeometry(0.98, 0.78, 0.05);
      const pagesMaterial = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
      });
      const pages = new THREE.Mesh(pagesGeometry, pagesMaterial);
      pages.position.z = 0.08;
      group.add(pages);

      return group;
    };

    const createPencil = () => {
      const group = new THREE.Group();

      const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 32);
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#FBBF24' });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.rotation.z = Math.PI / 2;
      group.add(body);

      const tipGeometry = new THREE.ConeGeometry(0.03, 0.3, 32);
      const tipMaterial = new THREE.MeshStandardMaterial({ color: '#333333' });
      const tip = new THREE.Mesh(tipGeometry, tipMaterial);
      tip.position.x = 0.9;
      tip.rotation.z = Math.PI / 2;
      group.add(tip);

      return group;
    };

    const createStar = () => {
      const geometry = new THREE.OctahedronGeometry(0.3);
      const material = new THREE.MeshStandardMaterial({
        color: '#FFD700',
        emissive: '#FFD700',
        emissiveIntensity: 0.5,
      });
      return new THREE.Mesh(geometry, material);
    };

    const positions = [
      { x: -3, y: 2, type: 'book' },
      { x: 2, y: 1.5, type: 'pencil' },
      { x: -2, y: -1, type: 'star' },
      { x: 3, y: -2, type: 'book' },
      { x: 0, y: 2.5, type: 'star' },
      { x: -4, y: 0, type: 'pencil' },
      { x: 4, y: 0.5, type: 'star' },
    ];

    positions.forEach((pos, i) => {
      let obj: THREE.Mesh | THREE.Group;
      switch (pos.type) {
        case 'book':
          obj = createBook();
          break;
        case 'pencil':
          obj = createPencil();
          break;
        case 'star':
          obj = createStar();
          break;
        default:
          obj = createStar();
      }

      obj.position.set(pos.x, pos.y, Math.random() * 2 - 1);
      obj.userData = {
        baseY: pos.y,
        speed: 0.002 + Math.random() * 0.003,
        rotationSpeed: 0.001 + Math.random() * 0.002,
        offset: i * 0.5,
      };
      objects.push(obj);
      scene.add(obj);
    });

    objectsRef.current = objects;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      objects.forEach((obj) => {
        obj.position.y = obj.userData.baseY + Math.sin(time * obj.userData.speed + obj.userData.offset) * 0.5;
        obj.rotation.y += obj.userData.rotationSpeed;
        obj.rotation.x += obj.userData.rotationSpeed * 0.5;
      });

      renderer.render(scene, camera);
    };
    animate();

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
      renderer.dispose();
    };
  }, [canvasRef]);

  return null;
};