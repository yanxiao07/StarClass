import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface ClassroomSceneProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  studentCount?: number;
}

export const ClassroomScene = ({ canvasRef, studentCount = 10 }: ClassroomSceneProps) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d2d44,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallGeometry = new THREE.PlaneGeometry(20, 8);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.8,
    });
    
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 4, -10);
    scene.add(backWall);

    const deskGeometry = new THREE.BoxGeometry(1.2, 0.75, 0.6);
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8B5CF6 });
    
    const chairGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.4);
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x6366F1 });

    const rows = Math.min(studentCount, 15);
    const cols = Math.min(Math.ceil(studentCount / rows), 5);

    for (let i = 0; i < studentCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      const desk = new THREE.Mesh(deskGeometry, deskMaterial);
      desk.position.set(
        (col - (cols - 1) / 2) * 1.5,
        0.375,
        -row * 1.8
      );
      desk.castShadow = true;
      desk.receiveShadow = true;
      scene.add(desk);

      const chair = new THREE.Mesh(chairGeometry, chairMaterial);
      chair.position.set(
        (col - (cols - 1) / 2) * 1.5,
        0.25,
        -row * 1.8 + 0.5
      );
      chair.castShadow = true;
      scene.add(chair);

      const studentColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.6);
      const studentGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const studentMaterial = new THREE.MeshStandardMaterial({ color: studentColor });
      const studentHead = new THREE.Mesh(studentGeometry, studentMaterial);
      studentHead.position.set(
        (col - (cols - 1) / 2) * 1.5,
        1.2,
        -row * 1.8
      );
      scene.add(studentHead);
    }

    const teacherDesk = new THREE.Mesh(deskGeometry, deskMaterial);
    teacherDesk.position.set(0, 0.375, 4);
    teacherDesk.scale.set(1.5, 1, 1);
    scene.add(teacherDesk);

    const blackboardGeometry = new THREE.PlaneGeometry(8, 4);
    const blackboardMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
    });
    const blackboard = new THREE.Mesh(blackboardGeometry, blackboardMaterial);
    blackboard.position.set(0, 5, -9.9);
    scene.add(blackboard);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const ceilingLight = new THREE.PointLight(0xffffff, 1, 20);
    ceilingLight.position.set(0, 7, 0);
    ceilingLight.castShadow = true;
    scene.add(ceilingLight);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (cameraRef.current) {
        const time = Date.now() * 0.0003;
        cameraRef.current.position.x = Math.sin(time) * 2;
        cameraRef.current.lookAt(0, 0, 0);
      }

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
  }, [canvasRef, studentCount]);

  return null;
};