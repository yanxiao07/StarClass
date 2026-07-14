import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * 三维宠物展示组件 - 精细卡通建模
 * 四种宠物：星灵狐/星云猫/星辉龙/星辰鸟
 * 外表与名称吻合，带呼吸/眨眼/尾巴摇摆动画，可点击互动
 */

export type PetModelType = 'fox' | 'cat' | 'dragon' | 'bird';

export interface Pet3DProps {
  modelType: PetModelType;
  level?: number;        // 1-8 等级影响体型
  mood?: number;         // 0-100 心情影响表情
  hunger?: number;       // 0-100 饱腹度影响动作
  size?: number;         // 整体缩放
  interactive?: boolean; // 是否可点击互动
  onInteract?: () => void;
}

// 辅助：创建球体部位
const makeSphere = (
  radius: number,
  color: number,
  pos: [number, number, number],
  scale?: [number, number, number],
  roughness = 0.6,
  metalness = 0.1
): THREE.Mesh => {
  const geo = new THREE.SphereGeometry(radius, 32, 24);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  return mesh;
};

// 辅助：创建锥体部位（耳朵/角/喙）
const makeCone = (
  radius: number,
  height: number,
  color: number,
  pos: [number, number, number],
  rotation?: [number, number, number],
  radialSegments = 16,
  roughness = 0.6
): THREE.Mesh => {
  const geo = new THREE.ConeGeometry(radius, height, radialSegments);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, flatShading: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  return mesh;
};

// 辅助：创建胶囊部位（四肢）
const makeCapsule = (
  radius: number,
  length: number,
  color: number,
  pos: [number, number, number],
  roughness = 0.7
): THREE.Mesh => {
  const geo = new THREE.CapsuleGeometry(radius, length, 8, 16);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, flatShading: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  return mesh;
};

// 辅助：创建眼睛（带瞳孔和高光）
const makeEye = (pos: [number, number, number], size = 0.12): THREE.Group => {
  const group = new THREE.Group();
  // 眼白
  const white = makeSphere(size, 0xffffff, [0, 0, 0], undefined, 0.3);
  // 瞳孔
  const pupil = makeSphere(size * 0.6, 0x1a1a2e, [0, 0, size * 0.5], undefined, 0.2);
  // 高光
  const highlight = makeSphere(size * 0.25, 0xffffff, [size * 0.2, size * 0.2, size * 0.8], undefined, 0.1);
  group.add(white, pupil, highlight);
  group.position.set(pos[0], pos[1], pos[2]);
  return group;
};

// ============ 星灵狐建模 ============
const buildFox = (level: number): { group: THREE.Group; animParts: PetAnimParts } => {
  const group = new THREE.Group();
  const scale = 0.85 + level * 0.04;
  group.scale.setScalar(scale);

  const orange = 0xea7a3c;
  const cream = 0xfdf2e9;
  const darkOrange = 0xc45a1e;

  // 身体（横向椭球）
  const body = makeSphere(0.9, orange, [0, -0.3, 0], [1.3, 1, 1.1], 0.7);
  group.add(body);

  // 白色腹部
  const belly = makeSphere(0.65, cream, [0, -0.5, 0.15], [0.9, 0.7, 0.8], 0.8);
  group.add(belly);

  // 头部
  const head = makeSphere(0.62, orange, [0, 0.55, 0.35], [1, 0.95, 1], 0.6);
  group.add(head);

  // 吻部（前突的小球）
  const snout = makeSphere(0.32, cream, [0, 0.4, 0.85], [0.8, 0.6, 0.9], 0.7);
  group.add(snout);

  // 鼻子
  const nose = makeSphere(0.1, 0x1a1a2e, [0, 0.45, 1.05], undefined, 0.3);
  group.add(nose);

  // 眼睛
  const leftEye = makeEye([-0.25, 0.62, 0.78], 0.11);
  const rightEye = makeEye([0.25, 0.62, 0.78], 0.11);
  group.add(leftEye, rightEye);

  // 耳朵（三角尖耳）
  const leftEar = makeCone(0.22, 0.5, orange, [-0.35, 1.0, 0.2], [0, 0, -0.2], 4, 0.5);
  const rightEar = makeCone(0.22, 0.5, orange, [0.35, 1.0, 0.2], [0, 0, 0.2], 4, 0.5);
  // 耳朵内侧
  const leftEarInner = makeCone(0.12, 0.35, cream, [-0.35, 0.95, 0.25], [0, 0, -0.2], 4, 0.6);
  const rightEarInner = makeCone(0.12, 0.35, cream, [0.35, 0.95, 0.25], [0, 0, 0.2], 4, 0.6);
  group.add(leftEar, rightEar, leftEarInner, rightEarInner);

  // 四肢
  const legColor = darkOrange;
  const flLeg = makeCapsule(0.16, 0.35, legColor, [-0.5, -0.95, 0.3]);
  const frLeg = makeCapsule(0.16, 0.35, legColor, [0.5, -0.95, 0.3]);
  const blLeg = makeCapsule(0.16, 0.35, legColor, [-0.5, -0.9, -0.3]);
  const brLeg = makeCapsule(0.16, 0.35, legColor, [0.5, -0.9, -0.3]);
  group.add(flLeg, frLeg, blLeg, brLeg);

  // 蓬松大尾巴（多个递减球体组成，白色尖端）
  const tailGroup = new THREE.Group();
  const tailBase = makeSphere(0.3, orange, [0, 0, 0]);
  const tailMid = makeSphere(0.26, orange, [0.3, 0.15, 0]);
  const tailTip = makeSphere(0.22, cream, [0.55, 0.3, 0]);
  tailGroup.add(tailBase, tailMid, tailTip);
  tailGroup.position.set(0, -0.2, -0.9);
  tailGroup.rotation.z = 0.5;
  group.add(tailGroup);

  return {
    group,
    animParts: { tail: tailGroup, head, leftEar, rightEar, eyes: [leftEye, rightEye] },
  };
};

// ============ 星云猫建模 ============
const buildCat = (level: number): { group: THREE.Group; animParts: PetAnimParts } => {
  const group = new THREE.Group();
  const scale = 0.85 + level * 0.04;
  group.scale.setScalar(scale);

  const blueGray = 0x8b9dc3;
  const lightGray = 0xc8d4e8;
  const pink = 0xf4a4b4;

  // 身体
  const body = makeSphere(0.85, blueGray, [0, -0.3, 0], [1.2, 1, 1.1], 0.7);
  group.add(body);

  // 腹部
  const belly = makeSphere(0.6, lightGray, [0, -0.45, 0.15], [0.85, 0.7, 0.8], 0.8);
  group.add(belly);

  // 头部（稍扁圆）
  const head = makeSphere(0.6, blueGray, [0, 0.5, 0.3], [1, 0.9, 0.95], 0.6);
  group.add(head);

  // 吻部
  const snout = makeSphere(0.28, lightGray, [0, 0.35, 0.75], [0.9, 0.7, 0.8], 0.7);
  group.add(snout);

  // 鼻子（粉色三角）
  const nose = makeSphere(0.09, pink, [0, 0.42, 0.95], [1.2, 0.8, 0.8], 0.4);
  group.add(nose);

  // 大眼睛（猫眼，绿色）
  const leftEyeGroup = new THREE.Group();
  const leWhite = makeSphere(0.14, 0xf0f4f8, [0, 0, 0], [1, 1.3, 0.6], 0.3);
  const lePupil = makeSphere(0.09, 0x2d8659, [0, 0, 0.08], [0.4, 1.2, 0.5], 0.2);
  const leHighlight = makeSphere(0.03, 0xffffff, [0.03, 0.04, 0.12], undefined, 0.1);
  leftEyeGroup.add(leWhite, lePupil, leHighlight);
  leftEyeGroup.position.set(-0.24, 0.6, 0.72);
  const rightEyeGroup = leftEyeGroup.clone();
  rightEyeGroup.position.set(0.24, 0.6, 0.72);
  group.add(leftEyeGroup, rightEyeGroup);

  // 尖耳朵
  const leftEar = makeCone(0.2, 0.45, blueGray, [-0.33, 0.95, 0.15], [0, 0, -0.15], 4, 0.5);
  const rightEar = makeCone(0.2, 0.45, blueGray, [0.33, 0.95, 0.15], [0, 0, 0.15], 4, 0.5);
  const leftEarInner = makeCone(0.1, 0.3, pink, [-0.33, 0.92, 0.2], [0, 0, -0.15], 4, 0.6);
  const rightEarInner = makeCone(0.1, 0.3, pink, [0.33, 0.92, 0.2], [0, 0, 0.15], 4, 0.6);
  group.add(leftEar, rightEar, leftEarInner, rightEarInner);

  // 四肢
  const flLeg = makeCapsule(0.15, 0.3, blueGray, [-0.45, -0.9, 0.3]);
  const frLeg = makeCapsule(0.15, 0.3, blueGray, [0.45, -0.9, 0.3]);
  const blLeg = makeCapsule(0.15, 0.3, blueGray, [-0.45, -0.85, -0.3]);
  const brLeg = makeCapsule(0.15, 0.3, blueGray, [0.45, -0.85, -0.3]);
  group.add(flLeg, frLeg, blLeg, brLeg);

  // 长尾巴（圆柱）
  const tailGroup = new THREE.Group();
  const tailGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 12);
  const tailMat = new THREE.MeshStandardMaterial({ color: blueGray, roughness: 0.7 });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(0, 0.3, 0);
  tailGroup.add(tail);
  tailGroup.position.set(0, -0.2, -0.7);
  tailGroup.rotation.x = 0.6;
  tailGroup.rotation.z = 0.3;
  group.add(tailGroup);

  return {
    group,
    animParts: { tail: tailGroup, head, leftEar, rightEar, eyes: [leftEyeGroup, rightEyeGroup] },
  };
};

// 龙角骨色
const bone = 0xf5e6d3;

// ============ 星辉龙建模 ============
const buildDragon = (level: number): { group: THREE.Group; animParts: PetAnimParts } => {
  const group = new THREE.Group();
  const scale = 0.85 + level * 0.04;
  group.scale.setScalar(scale);

  const green = 0x4ade80;
  const darkGreen = 0x16a34a;
  const bellyYellow = 0xfde68a;
  const spikeOrange = 0xf97316;

  // 身体
  const body = makeSphere(0.9, green, [0, -0.25, 0], [1.2, 1, 1.1], 0.65);
  group.add(body);

  // 浅黄腹部
  const belly = makeSphere(0.65, bellyYellow, [0, -0.45, 0.15], [0.85, 0.75, 0.8], 0.75);
  group.add(belly);

  // 头部
  const head = makeSphere(0.55, green, [0, 0.55, 0.4], [1, 0.9, 1.1], 0.6);
  group.add(head);

  // 长吻部（锥体前突）
  const snout = makeCone(0.22, 0.4, darkGreen, [0, 0.5, 0.95], [Math.PI / 2, 0, 0], 12, 0.6);
  group.add(snout);

  // 鼻孔
  const nose = makeSphere(0.07, 0x1a1a2e, [0, 0.55, 1.1], undefined, 0.3);
  group.add(nose);

  // 眼睛（黄色龙眼）
  const leftEyeGroup = new THREE.Group();
  const leWhite = makeSphere(0.13, 0xfef3c7, [0, 0, 0], [1, 1, 0.7], 0.3);
  const lePupil = makeSphere(0.08, 0xf59e0b, [0, 0, 0.07], [0.5, 1, 0.5], 0.2);
  const leCore = makeSphere(0.04, 0x1a1a2e, [0, 0, 0.1], undefined, 0.1);
  leftEyeGroup.add(leWhite, lePupil, leCore);
  leftEyeGroup.position.set(-0.24, 0.7, 0.65);
  const rightEyeGroup = leftEyeGroup.clone();
  rightEyeGroup.position.set(0.24, 0.7, 0.65);
  group.add(leftEyeGroup, rightEyeGroup);

  // 龙角（向后弯曲的锥体）
  const leftHorn = makeCone(0.1, 0.45, bone, [-0.28, 1.05, 0.1], [-0.4, 0, -0.2], 8, 0.4);
  const rightHorn = makeCone(0.1, 0.45, bone, [0.28, 1.05, 0.1], [-0.4, 0, 0.2], 8, 0.4);
  group.add(leftHorn, rightHorn);

  // 翅膀（扁平形状）
  const wingMat = new THREE.MeshStandardMaterial({
    color: darkGreen, roughness: 0.5, side: THREE.DoubleSide, flatShading: false,
  });
  const leftWing = new THREE.Group();
  const lwGeo = new THREE.ConeGeometry(0.5, 0.8, 4);
  const lwMesh = new THREE.Mesh(lwGeo, wingMat);
  lwMesh.scale.set(1, 1, 0.1);
  lwMesh.position.set(-0.5, 0.2, 0);
  lwMesh.rotation.set(0.2, 0, -0.8);
  leftWing.add(lwMesh);
  leftWing.position.set(-0.7, 0.15, -0.1);
  const rightWing = leftWing.clone();
  rightWing.position.set(0.7, 0.15, -0.1);
  rightWing.scale.x = -1;
  group.add(leftWing, rightWing);

  // 背刺（沿背部的橙色三角锥）
  const spikePositions: [number, number, number][] = [
    [-0.3, 0.45, -0.2], [-0.1, 0.5, -0.3], [0.1, 0.5, -0.3], [0.3, 0.45, -0.2],
  ];
  spikePositions.forEach((p) => {
    const spike = makeCone(0.08, 0.25, spikeOrange, p, [Math.PI, 0, 0], 4, 0.4);
    group.add(spike);
  });

  // 四肢
  const flLeg = makeCapsule(0.15, 0.35, darkGreen, [-0.5, -0.9, 0.3]);
  const frLeg = makeCapsule(0.15, 0.35, darkGreen, [0.5, -0.9, 0.3]);
  const blLeg = makeCapsule(0.15, 0.35, darkGreen, [-0.5, -0.85, -0.3]);
  const brLeg = makeCapsule(0.15, 0.35, darkGreen, [0.5, -0.85, -0.3]);
  group.add(flLeg, frLeg, blLeg, brLeg);

  // 长尾巴 + 箭头尾尖
  const tailGroup = new THREE.Group();
  const tailGeo = new THREE.CylinderGeometry(0.1, 0.2, 1.1, 10);
  const tailMat = new THREE.MeshStandardMaterial({ color: green, roughness: 0.65 });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(0, 0.2, 0);
  const tailTip = makeCone(0.18, 0.3, spikeOrange, [0, -0.35, 0], [Math.PI, 0, 0], 4, 0.4);
  tailGroup.add(tail, tailTip);
  tailGroup.position.set(0, -0.2, -0.7);
  tailGroup.rotation.x = 0.7;
  group.add(tailGroup);

  return {
    group,
    animParts: { tail: tailGroup, head, leftEar: leftWing, rightEar: rightWing, eyes: [leftEyeGroup, rightEyeGroup], wings: [leftWing, rightWing] },
  };
};

// ============ 星辰鸟建模 ============
const buildBird = (level: number): { group: THREE.Group; animParts: PetAnimParts } => {
  const group = new THREE.Group();
  const scale = 0.85 + level * 0.04;
  group.scale.setScalar(scale);

  const yellow = 0xfbbf24;
  const orange = 0xf59e0b;
  const teal = 0x14b8a6;
  const darkTeal = 0x0d9488;

  // 圆润身体
  const body = makeSphere(0.85, yellow, [0, -0.1, 0], [1.1, 1.2, 1], 0.6);
  group.add(body);

  // 腹部浅色
  const belly = makeSphere(0.6, 0xfef3c7, [0, -0.25, 0.2], [0.85, 0.9, 0.8], 0.7);
  group.add(belly);

  // 头部
  const head = makeSphere(0.55, yellow, [0, 0.65, 0.25], [1, 1, 1], 0.55);
  group.add(head);

  // 鸟喙（橙色锥体前突）
  const beak = makeCone(0.15, 0.35, orange, [0, 0.55, 0.85], [Math.PI / 2, 0, 0], 8, 0.4);
  group.add(beak);

  // 眼睛
  const leftEye = makeEye([-0.22, 0.78, 0.5], 0.1);
  const rightEye = makeEye([0.22, 0.78, 0.5], 0.1);
  group.add(leftEye, rightEye);

  // 头顶羽冠（三根小锥体）
  const crest1 = makeCone(0.06, 0.3, orange, [0, 1.15, 0.15], [-0.3, 0, 0], 5, 0.4);
  const crest2 = makeCone(0.06, 0.28, orange, [-0.1, 1.12, 0.1], [-0.3, 0, -0.2], 5, 0.4);
  const crest3 = makeCone(0.06, 0.28, orange, [0.1, 1.12, 0.1], [-0.3, 0, 0.2], 5, 0.4);
  group.add(crest1, crest2, crest3);

  // 翅膀（蓝绿色扁椭球）
  const wingMat = new THREE.MeshStandardMaterial({ color: teal, roughness: 0.55, side: THREE.DoubleSide });
  const leftWing = new THREE.Group();
  const lwGeo = new THREE.SphereGeometry(0.4, 16, 12);
  const lwMesh = new THREE.Mesh(lwGeo, wingMat);
  lwMesh.scale.set(0.3, 0.7, 1.1);
  lwMesh.position.set(-0.2, 0, 0);
  leftWing.add(lwMesh);
  leftWing.position.set(-0.7, -0.05, 0);
  const rightWing = leftWing.clone();
  rightWing.position.set(0.7, -0.05, 0);
  rightWing.scale.x = -1;
  group.add(leftWing, rightWing);

  // 尾羽（几片扁锥体）
  const tailGroup = new THREE.Group();
  const tail1 = makeCone(0.15, 0.5, teal, [0, -0.1, -0.2], [Math.PI / 2 + 0.3, 0, 0], 4, 0.5);
  tail1.scale.set(1.5, 1, 0.2);
  const tail2 = makeCone(0.13, 0.45, darkTeal, [-0.12, -0.05, -0.15], [Math.PI / 2 + 0.3, 0, -0.2], 4, 0.5);
  tail2.scale.set(1.4, 1, 0.2);
  const tail3 = makeCone(0.13, 0.45, darkTeal, [0.12, -0.05, -0.15], [Math.PI / 2 + 0.3, 0, 0.2], 4, 0.5);
  tail3.scale.set(1.4, 1, 0.2);
  tailGroup.add(tail1, tail2, tail3);
  tailGroup.position.set(0, -0.3, -0.7);
  group.add(tailGroup);

  // 细腿
  const legMat = new THREE.MeshStandardMaterial({ color: orange, roughness: 0.6 });
  const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.4, 8);
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.2, -0.95, 0.1);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.2, -0.95, 0.1);
  // 脚趾
  const leftFoot = makeSphere(0.08, orange, [-0.2, -1.15, 0.15], [1.5, 0.5, 1], 0.6);
  const rightFoot = makeSphere(0.08, orange, [0.2, -1.15, 0.15], [1.5, 0.5, 1], 0.6);
  group.add(leftLeg, rightLeg, leftFoot, rightFoot);

  return {
    group,
    animParts: { tail: tailGroup, head, leftEar: leftWing, rightEar: rightWing, eyes: [leftEye, rightEye], wings: [leftWing, rightWing] },
  };
};

// 动画部件引用
interface PetAnimParts {
  tail: THREE.Object3D;
  head: THREE.Mesh;
  leftEar: THREE.Object3D;
  rightEar: THREE.Object3D;
  eyes: THREE.Object3D[];
  wings?: THREE.Object3D[];
}

export const Pet3D: React.FC<Pet3DProps> = ({
  modelType,
  level = 1,
  mood = 80,
  hunger = 80,
  size = 1,
  interactive = true,
  onInteract,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const petGroupRef = useRef<THREE.Group | null>(null);
  const animPartsRef = useRef<PetAnimParts | null>(null);
  const animationIdRef = useRef<number>(0);
  const [happy, setHappy] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.5, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    // 灯光：温暖柔和
    const ambient = new THREE.AmbientLight(0xfff8e7, 0.75);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.35);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0xfbbf24, 0.4, 15);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // 构建宠物
    let result: { group: THREE.Group; animParts: PetAnimParts };
    switch (modelType) {
      case 'fox': result = buildFox(level); break;
      case 'cat': result = buildCat(level); break;
      case 'dragon': result = buildDragon(level); break;
      case 'bird': result = buildBird(level); break;
      default: result = buildFox(level);
    }

    const petGroup = result.group;
    petGroup.scale.multiplyScalar(size);
    petGroupRef.current = petGroup;
    animPartsRef.current = result.animParts;
    scene.add(petGroup);

    // 收集几何体和材质用于清理
    petGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) geometries.push(child.geometry);
        if (child.material) {
          if (Array.isArray(child.material)) materials.push(...child.material);
          else materials.push(child.material);
        }
      }
    });

    // 点击交互
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();
    const handleClick = (event: MouseEvent) => {
      if (!interactive || !canvasRef.current || !cameraRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseVec.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVec, cameraRef.current);
      if (petGroupRef.current) {
        const intersects = raycaster.intersectObject(petGroupRef.current, true);
        if (intersects.length > 0) {
          setHappy(true);
          onInteract?.();
          setTimeout(() => setHappy(false), 1500);
        }
      }
    };
    canvasRef.current.addEventListener('click', handleClick);

    // 动画循环
    const clock = new THREE.Clock();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (petGroupRef.current) {
        // 呼吸动画（整体缩放微变）— 饱腹度低时呼吸变弱
        const breatheAmp = hunger > 30 ? 0.02 : 0.008;
        const breathe = 1 + Math.sin(t * 1.8) * breatheAmp;
        petGroupRef.current.scale.set(size * breathe, size * breathe, size * breathe);

        // 整体轻微上下浮动 — 心情好时跳得更高
        const floatAmp = mood > 50 ? 0.08 : 0.04;
        petGroupRef.current.position.y = Math.sin(t * 1.2) * floatAmp;

        // 缓慢自转
        petGroupRef.current.rotation.y = Math.sin(t * 0.3) * 0.3;

        // 饱腹度极低时宠物低头（整体倾斜）
        if (hunger < 20) {
          petGroupRef.current.rotation.x = 0.15;
        } else {
          petGroupRef.current.rotation.x = 0;
        }
      }

      if (animPartsRef.current) {
        const parts = animPartsRef.current;
        // 尾巴摇摆
        if (parts.tail) {
          parts.tail.rotation.z = Math.sin(t * 2.5) * 0.25 + (modelType === 'fox' ? 0.5 : 0);
        }
        // 头部微动
        if (parts.head) {
          parts.head.rotation.y = Math.sin(t * 0.8) * 0.1;
          parts.head.rotation.x = Math.sin(t * 1.5) * 0.04;
        }
        // 翅膀扇动（龙/鸟）
        if (parts.wings) {
          const wingSpeed = happy ? 8 : 2;
          const wingAmp = happy ? 0.6 : 0.2;
          parts.wings.forEach((w, i) => {
            w.rotation.z = (i === 0 ? 1 : -1) * (Math.sin(t * wingSpeed) * wingAmp + (i === 0 ? -0.5 : 0.5));
          });
        }
        // 耳朵微动
        if (parts.leftEar) parts.leftEar.rotation.z = Math.sin(t * 1.5) * 0.05 - 0.2;
        if (parts.rightEar) parts.rightEar.rotation.z = -Math.sin(t * 1.5) * 0.05 + 0.2;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 自适应容器大小
    const resize = () => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;
      const parent = canvasRef.current.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (canvasRef.current.parentElement) {
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      canvasRef.current?.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, [modelType, level, size, interactive, onInteract, happy]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: interactive ? 'pointer' : 'default',
        display: 'block',
      }}
    />
  );
};

export default Pet3D;
