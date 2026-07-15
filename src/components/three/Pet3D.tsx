import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * 三维宠物展示组件
 * 四种宠物使用开源 GLB 模型，加载后重新着色为星空主题色 + 发光效果：
 * - 星灵狐 (fox): KhronosGroup Fox (CC0/CC-BY 4.0), 橙金色发光
 * - 星辰鸟 (bird): Three.js Flamingo (MIT), 展翅飞行，黄粉色发光
 * - 星云猫 (cat): Quaternius Cat (CC0), 紫粉色发光
 * - 星辉龙 (dragon): Quaternius Dragon Evolved (CC0), 蓝青色发光
 * GLB 加载失败时回退到程序化卡通渲染（MeshToonMaterial + 描边）
 */

export type PetModelType = 'fox' | 'cat' | 'dragon' | 'bird';

export interface Pet3DProps {
  modelType: PetModelType;
  level?: number;
  mood?: number;
  hunger?: number;
  size?: number;
  interactive?: boolean;
  onInteract?: () => void;
}

// GLB 模型配置：全部使用开源 3D 模型，加载后重新着色为星空主题色
// Fox: KhronosGroup glTF-Sample-Assets (CC0/CC-BY 4.0), 163KB, 含 Survey/Walk/Run 动画
// Flamingo(鸟): Three.js examples (MIT), 75KB, 展翅飞行动画，粉色契合星空主题
// Cat: Quaternius Ultimate Monsters (CC0), 112KB, 含 Idle/Walk/Run 等动画
// Dragon: Quaternius Ultimate Monsters - Dragon Evolved (CC0), 436KB, 含 Idle/Walk/Run 等动画
const GLB_MODEL_MAP: Partial<Record<PetModelType, { url: string; idleClip?: string; rotationY?: number; targetHeight?: number }>> = {
  fox: { url: '/models/Fox.glb', idleClip: 'Survey', rotationY: 0, targetHeight: 1.3 },
  bird: { url: '/models/Flamingo.glb', rotationY: 0, targetHeight: 7.0 },
  cat: { url: '/models/Cat.glb', idleClip: 'Idle', targetHeight: 1.4 },
  dragon: { url: '/models/Dragon.glb', idleClip: 'Idle', targetHeight: 1.8 },
};

// 星空主题配色（与数据库 pet_types 的 color_primary/color_secondary 一致）
// 加载 GLB 后将材质替换为主题色 + emissive 发光，让宠物呈现"星灵"质感
const THEME_COLORS: Record<PetModelType, { primary: number; secondary: number; emissive: number }> = {
  fox: { primary: 0xFF9F1C, secondary: 0xFFBF69, emissive: 0xFF6B00 }, // 橙金灵动
  cat: { primary: 0x9B5DE5, secondary: 0xF15BB5, emissive: 0x7B2CBF }, // 紫粉神秘
  dragon: { primary: 0x00BBF9, secondary: 0x00F5D4, emissive: 0x0077B6 }, // 蓝青威严
  bird: { primary: 0xFEE440, secondary: 0xF15BB5, emissive: 0xF9C80E }, // 黄粉自由
};

// GLB 模型重新着色：遍历所有 mesh，替换为星空主题色 MeshStandardMaterial + 发光
// 提高发光强度与金属感，让模型呈现"星灵"光泽质感，契合星空背景
const recolorGLBModel = (model: THREE.Object3D, modelType: PetModelType) => {
  const theme = THEME_COLORS[modelType];
  let meshIndex = 0;
  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      // 交替使用主色/副色，让模型有层次感（每3个mesh用一次副色）
      const color = meshIndex % 3 === 0 ? theme.secondary : theme.primary;
      const newMat = new THREE.MeshStandardMaterial({
        color,
        emissive: theme.emissive,
        emissiveIntensity: 0.55,   // 提高发光强度，呈现星灵光泽
        roughness: 0.3,            // 降低粗糙度，更光滑通透
        metalness: 0.35,           // 提高金属感，反射星空环境
      });
      // 释放旧材质防止 GPU 内存泄漏
      const oldMat = child.material;
      if (Array.isArray(oldMat)) oldMat.forEach(m => m.dispose());
      else oldMat.dispose();
      child.material = newMat;
      meshIndex++;
    }
  });
};

// ============ 卡通渲染基础设施 ============

// 3 级渐变贴图：暗部 / 中间调 / 高光，实现 Cel-Shading
const createGradientMap = (): THREE.DataTexture => {
  const colors = new Uint8Array([80, 80, 80, 160, 160, 160, 230, 230, 230]);
  const tex = new THREE.DataTexture(colors, 3, 1, THREE.RGBFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
};

const gradientMap = createGradientMap();

/**
 * 创建带描边的卡通 Mesh
 * @param geometry 几何体
 * @param color 主色
 * @param opts 配置项
 */
const createToonMesh = (
  geometry: THREE.BufferGeometry,
  color: number,
  opts: { outline?: boolean; outlineWidth?: number; emissive?: number; emissiveIntensity?: number } = {}
): THREE.Group => {
  const group = new THREE.Group();
  const { outline = true, outlineWidth = 0.04, emissive = 0x000000, emissiveIntensity = 0 } = opts;

  // 主体：MeshToonMaterial
  const toonMat = new THREE.MeshToonMaterial({
    color,
    gradientMap,
    emissive,
    emissiveIntensity,
  });
  const mainMesh = new THREE.Mesh(geometry, toonMat);
  group.add(mainMesh);

  // 描边：BackSide 放大的黑色 mesh
  if (outline) {
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e, side: THREE.BackSide });
    const outlineMesh = new THREE.Mesh(geometry.clone(), outlineMat);
    outlineMesh.scale.multiplyScalar(1 + outlineWidth);
    group.add(outlineMesh);
  }

  return group;
};

// 辅助：创建球体卡通部件
const makeToonSphere = (
  radius: number,
  color: number,
  pos: [number, number, number],
  scale?: [number, number, number],
  opts?: { outline?: boolean; outlineWidth?: number }
): THREE.Group => {
  const geo = new THREE.SphereGeometry(radius, 32, 24);
  const g = createToonMesh(geo, color, opts);
  g.position.set(pos[0], pos[1], pos[2]);
  if (scale) g.scale.set(scale[0], scale[1], scale[2]);
  return g;
};

// 辅助：创建锥体卡通部件
const makeToonCone = (
  radius: number,
  height: number,
  color: number,
  pos: [number, number, number],
  rotation?: [number, number, number],
  radialSegments = 12,
  opts?: { outline?: boolean; outlineWidth?: number }
): THREE.Group => {
  const geo = new THREE.ConeGeometry(radius, height, radialSegments);
  const g = createToonMesh(geo, color, opts);
  g.position.set(pos[0], pos[1], pos[2]);
  if (rotation) g.rotation.set(rotation[0], rotation[1], rotation[2]);
  return g;
};

// 辅助：创建胶囊卡通部件
const makeToonCapsule = (
  radius: number,
  length: number,
  color: number,
  pos: [number, number, number],
  opts?: { outline?: boolean; outlineWidth?: number }
): THREE.Group => {
  const geo = new THREE.CapsuleGeometry(radius, length, 8, 16);
  const g = createToonMesh(geo, color, opts);
  g.position.set(pos[0], pos[1], pos[2]);
  return g;
};

// 辅助：创建眼睛（带瞳孔、高光，无描边）
const makeToonEye = (pos: [number, number, number], size = 0.13): THREE.Group => {
  const group = new THREE.Group();
  // 眼白（无描边）
  const whiteGeo = new THREE.SphereGeometry(size, 20, 16);
  const whiteMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap });
  const white = new THREE.Mesh(whiteGeo, whiteMat);
  group.add(white);
  // 瞳孔
  const pupilGeo = new THREE.SphereGeometry(size * 0.6, 16, 12);
  const pupilMat = new THREE.MeshToonMaterial({ color: 0x1a1a2e, gradientMap });
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.z = size * 0.5;
  group.add(pupil);
  // 高光（白色小点，BasicMaterial 发光感）
  const highlightGeo = new THREE.SphereGeometry(size * 0.22, 8, 6);
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  highlight.position.set(size * 0.2, size * 0.2, size * 0.8);
  group.add(highlight);
  group.position.set(pos[0], pos[1], pos[2]);
  return group;
};

// 辅助：创建扁平板状部件（翅膀等，无描边减少锯齿）
const makeToonWing = (
  shape: THREE.Shape,
  color: number,
  pos: [number, number, number],
  rotation?: [number, number, number]
): THREE.Mesh => {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 2 });
  const mat = new THREE.MeshToonMaterial({ color, gradientMap, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  return mesh;
};

// 动画部件引用
interface PetAnimParts {
  tail: THREE.Object3D;
  head: THREE.Object3D;
  leftEar: THREE.Object3D;
  rightEar: THREE.Object3D;
  eyes: THREE.Object3D[];
  wings?: THREE.Object3D[];
  body?: THREE.Object3D;
}

// ============ 星灵狐建模 ============
const buildFox = (level: number): { group: THREE.Group; animParts: PetAnimParts } => {
  const group = new THREE.Group();
  const s = 0.85 + level * 0.04;
  group.scale.setScalar(s);

  const C = { orange: 0xea7a3c, cream: 0xfdf2e9, dark: 0xc45a1e, black: 0x1a1a2e };
  const o = { outline: true, outlineWidth: 0.035 };

  // 身体（圆润椭球）
  const body = makeToonSphere(0.9, C.orange, [0, -0.3, 0], [1.3, 1, 1.1], o);
  group.add(body);

  // 白色腹部
  const belly = makeToonSphere(0.65, C.cream, [0, -0.5, 0.15], [0.9, 0.7, 0.8], { outline: false });
  group.add(belly);

  // 头部
  const head = makeToonSphere(0.62, C.orange, [0, 0.55, 0.35], [1, 0.95, 1], o);
  group.add(head);

  // 吻部
  const snout = makeToonSphere(0.32, C.cream, [0, 0.4, 0.85], [0.8, 0.6, 0.9], { outline: false });
  group.add(snout);

  // 鼻子（黑色小球，无描边）
  const noseGeo = new THREE.SphereGeometry(0.1, 12, 8);
  const noseMat = new THREE.MeshToonMaterial({ color: C.black, gradientMap });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, 0.45, 1.05);
  group.add(nose);

  // 眼睛
  const leftEye = makeToonEye([-0.25, 0.62, 0.78], 0.11);
  const rightEye = makeToonEye([0.25, 0.62, 0.78], 0.11);
  group.add(leftEye, rightEye);

  // 三角尖耳
  const leftEar = makeToonCone(0.22, 0.5, C.orange, [-0.35, 1.0, 0.2], [0, 0, -0.2], 4, o);
  const rightEar = makeToonCone(0.22, 0.5, C.orange, [0.35, 1.0, 0.2], [0, 0, 0.2], 4, o);
  const leftEarIn = makeToonCone(0.12, 0.35, C.cream, [-0.35, 0.95, 0.25], [0, 0, -0.2], 4, { outline: false });
  const rightEarIn = makeToonCone(0.12, 0.35, C.cream, [0.35, 0.95, 0.25], [0, 0, 0.2], 4, { outline: false });
  group.add(leftEar, rightEar, leftEarIn, rightEarIn);

  // 四肢
  const legPositions: [number, number, number][] = [
    [-0.5, -0.95, 0.3], [0.5, -0.95, 0.3], [-0.5, -0.9, -0.3], [0.5, -0.9, -0.3],
  ];
  legPositions.forEach(p => group.add(makeToonCapsule(0.16, 0.35, C.dark, p, o)));

  // 蓬松大尾巴
  const tailGroup = new THREE.Group();
  const tailBase = makeToonSphere(0.3, C.orange, [0, 0, 0], undefined, o);
  const tailMid = makeToonSphere(0.26, C.orange, [0.3, 0.15, 0], undefined, o);
  const tailTip = makeToonSphere(0.22, C.cream, [0.55, 0.3, 0], undefined, { outline: false });
  tailGroup.add(tailBase, tailMid, tailTip);
  tailGroup.position.set(0, -0.2, -0.9);
  tailGroup.rotation.z = 0.5;
  group.add(tailGroup);

  return { group, animParts: { tail: tailGroup, head, leftEar, rightEar, eyes: [leftEye, rightEye], body } };
};

// ============ 星云猫建模 ============
const buildCat = (level: number): { group: THREE.Group; animParts: PetAnimParts } => {
  const group = new THREE.Group();
  const s = 0.85 + level * 0.04;
  group.scale.setScalar(s);

  const C = { blue: 0x8b9dc3, light: 0xc8d4e8, pink: 0xf4a4b4, green: 0x2d8659, black: 0x1a1a2e };
  const o = { outline: true, outlineWidth: 0.035 };

  const body = makeToonSphere(0.85, C.blue, [0, -0.3, 0], [1.2, 1, 1.1], o);
  group.add(body);
  const belly = makeToonSphere(0.6, C.light, [0, -0.45, 0.15], [0.85, 0.7, 0.8], { outline: false });
  group.add(belly);
  const head = makeToonSphere(0.6, C.blue, [0, 0.5, 0.3], [1, 0.9, 0.95], o);
  group.add(head);
  const snout = makeToonSphere(0.28, C.light, [0, 0.35, 0.75], [0.9, 0.7, 0.8], { outline: false });
  group.add(snout);

  // 粉色鼻子
  const noseGeo = new THREE.SphereGeometry(0.09, 12, 8);
  const noseMat = new THREE.MeshToonMaterial({ color: C.pink, gradientMap });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, 0.42, 0.95);
  nose.scale.set(1.2, 0.8, 0.8);
  group.add(nose);

  // 猫眼（绿色，杏仁形）
  const mkCatEye = (pos: [number, number, number]): THREE.Group => {
    const g = new THREE.Group();
    const wGeo = new THREE.SphereGeometry(0.14, 20, 16);
    const wMat = new THREE.MeshToonMaterial({ color: 0xf0f4f8, gradientMap });
    const w = new THREE.Mesh(wGeo, wMat);
    w.scale.set(1, 1.3, 0.6);
    g.add(w);
    const pGeo = new THREE.SphereGeometry(0.09, 16, 12);
    const pMat = new THREE.MeshToonMaterial({ color: C.green, gradientMap });
    const p = new THREE.Mesh(pGeo, pMat);
    p.scale.set(0.4, 1.2, 0.5);
    p.position.z = 0.08;
    g.add(p);
    const hGeo = new THREE.SphereGeometry(0.03, 8, 6);
    const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const h = new THREE.Mesh(hGeo, hMat);
    h.position.set(0.03, 0.04, 0.12);
    g.add(h);
    g.position.set(pos[0], pos[1], pos[2]);
    return g;
  };
  const leftEye = mkCatEye([-0.24, 0.6, 0.72]);
  const rightEye = mkCatEye([0.24, 0.6, 0.72]);
  group.add(leftEye, rightEye);

  // 尖耳
  const leftEar = makeToonCone(0.2, 0.45, C.blue, [-0.33, 0.95, 0.15], [0, 0, -0.15], 4, o);
  const rightEar = makeToonCone(0.2, 0.45, C.blue, [0.33, 0.95, 0.15], [0, 0, 0.15], 4, o);
  const leftEarIn = makeToonCone(0.1, 0.3, C.pink, [-0.33, 0.92, 0.2], [0, 0, -0.15], 4, { outline: false });
  const rightEarIn = makeToonCone(0.1, 0.3, C.pink, [0.33, 0.92, 0.2], [0, 0, 0.15], 4, { outline: false });
  group.add(leftEar, rightEar, leftEarIn, rightEarIn);

  // 四肢
  [[-0.45, -0.9, 0.3], [0.45, -0.9, 0.3], [-0.45, -0.85, -0.3], [0.45, -0.85, -0.3]].forEach(p =>
    group.add(makeToonCapsule(0.15, 0.3, C.blue, p as [number, number, number], o))
  );

  // 长尾巴
  const tailGroup = new THREE.Group();
  const tailGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 16);
  const g = createToonMesh(tailGeo, C.blue, o);
  g.position.y = 0.3;
  tailGroup.add(g);
  tailGroup.position.set(0, -0.2, -0.7);
  tailGroup.rotation.x = 0.6;
  tailGroup.rotation.z = 0.3;
  group.add(tailGroup);

  return { group, animParts: { tail: tailGroup, head, leftEar, rightEar, eyes: [leftEye, rightEye], body } };
};

// ============ 星辉龙建模 ============
const buildDragon = (level: number): { group: THREE.Group; animParts: PetAnimParts } => {
  const group = new THREE.Group();
  const s = 0.85 + level * 0.04;
  group.scale.setScalar(s);

  const C = { green: 0x4ade80, darkGreen: 0x16a34a, belly: 0xfde68a, spike: 0xf97316, bone: 0xf5e6d3, yellow: 0xf59e0b, black: 0x1a1a2e };
  const o = { outline: true, outlineWidth: 0.035 };

  const body = makeToonSphere(0.9, C.green, [0, -0.25, 0], [1.2, 1, 1.1], o);
  group.add(body);
  const bellyM = makeToonSphere(0.65, C.belly, [0, -0.45, 0.15], [0.85, 0.75, 0.8], { outline: false });
  group.add(bellyM);
  const head = makeToonSphere(0.55, C.green, [0, 0.55, 0.4], [1, 0.9, 1.1], o);
  group.add(head);

  // 长吻
  const snout = makeToonCone(0.22, 0.4, C.darkGreen, [0, 0.5, 0.95], [Math.PI / 2, 0, 0], 12, o);
  group.add(snout);

  // 鼻孔
  const noseGeo = new THREE.SphereGeometry(0.07, 10, 8);
  const noseMat = new THREE.MeshToonMaterial({ color: C.black, gradientMap });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, 0.55, 1.1);
  group.add(nose);

  // 龙眼（黄色）
  const mkDragonEye = (pos: [number, number, number]): THREE.Group => {
    const g = new THREE.Group();
    const wGeo = new THREE.SphereGeometry(0.13, 16, 12);
    const wMat = new THREE.MeshToonMaterial({ color: 0xfef3c7, gradientMap });
    const w = new THREE.Mesh(wGeo, wMat);
    w.scale.set(1, 1, 0.7);
    g.add(w);
    const pGeo = new THREE.SphereGeometry(0.08, 12, 10);
    const pMat = new THREE.MeshToonMaterial({ color: C.yellow, gradientMap });
    const p = new THREE.Mesh(pGeo, pMat);
    p.scale.set(0.5, 1, 0.5);
    p.position.z = 0.07;
    g.add(p);
    const cGeo = new THREE.SphereGeometry(0.04, 8, 6);
    const cMat = new THREE.MeshToonMaterial({ color: C.black, gradientMap });
    const c = new THREE.Mesh(cGeo, cMat);
    c.position.z = 0.1;
    g.add(c);
    g.position.set(pos[0], pos[1], pos[2]);
    return g;
  };
  const leftEye = mkDragonEye([-0.24, 0.7, 0.65]);
  const rightEye = mkDragonEye([0.24, 0.7, 0.65]);
  group.add(leftEye, rightEye);

  // 龙角
  const leftHorn = makeToonCone(0.1, 0.45, C.bone, [-0.28, 1.05, 0.1], [-0.4, 0, -0.2], 8, o);
  const rightHorn = makeToonCone(0.1, 0.45, C.bone, [0.28, 1.05, 0.1], [-0.4, 0, 0.2], 8, o);
  group.add(leftHorn, rightHorn);

  // 翅膀（ExtrudeGeometry 自定义形状）
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.4, 0.3, 0.8, 0.1);
  wingShape.quadraticCurveTo(0.6, -0.2, 0.3, -0.4);
  wingShape.quadraticCurveTo(0.1, -0.2, 0, 0);
  const leftWing = new THREE.Group();
  const lwMesh = makeToonWing(wingShape, C.darkGreen, [-0.5, 0.2, 0], [0.2, 0, -0.8]);
  leftWing.add(lwMesh);
  leftWing.position.set(-0.7, 0.15, -0.1);
  const rightWing = new THREE.Group();
  const rwMesh = makeToonWing(wingShape, C.darkGreen, [0.5, 0.2, 0], [0.2, 0, 0.8]);
  rwMesh.scale.x = -1;
  rightWing.add(rwMesh);
  rightWing.position.set(0.7, 0.15, -0.1);
  group.add(leftWing, rightWing);

  // 背刺
  [[-0.3, 0.45, -0.2], [-0.1, 0.5, -0.3], [0.1, 0.5, -0.3], [0.3, 0.45, -0.2]].forEach(p =>
    group.add(makeToonCone(0.08, 0.25, C.spike, p as [number, number, number], [Math.PI, 0, 0], 4, o))
  );

  // 四肢
  [[-0.5, -0.9, 0.3], [0.5, -0.9, 0.3], [-0.5, -0.85, -0.3], [0.5, -0.85, -0.3]].forEach(p =>
    group.add(makeToonCapsule(0.15, 0.35, C.darkGreen, p as [number, number, number], o))
  );

  // 尾巴 + 箭头尖
  const tailGroup = new THREE.Group();
  const tailGeo = new THREE.CylinderGeometry(0.1, 0.2, 1.1, 14);
  const tailM = createToonMesh(tailGeo, C.green, o);
  tailM.position.y = 0.2;
  tailGroup.add(tailM);
  const tipG = makeToonCone(0.18, 0.3, C.spike, [0, -0.35, 0], [Math.PI, 0, 0], 4, o);
  tailGroup.add(tipG);
  tailGroup.position.set(0, -0.2, -0.7);
  tailGroup.rotation.x = 0.7;
  group.add(tailGroup);

  return { group, animParts: { tail: tailGroup, head, leftEar: leftWing, rightEar: rightWing, eyes: [leftEye, rightEye], wings: [leftWing, rightWing], body } };
};

// ============ 星辰鸟建模 ============
const buildBird = (level: number): { group: THREE.Group; animParts: PetAnimParts } => {
  const group = new THREE.Group();
  const s = 0.85 + level * 0.04;
  group.scale.setScalar(s);

  const C = { yellow: 0xfbbf24, orange: 0xf59e0b, teal: 0x14b8a6, darkTeal: 0x0d9488, black: 0x1a1a2e };
  const o = { outline: true, outlineWidth: 0.035 };

  // 圆润身体
  const body = makeToonSphere(0.85, C.yellow, [0, -0.1, 0], [1.1, 1.2, 1], o);
  group.add(body);
  const belly = makeToonSphere(0.6, 0xfef3c7, [0, -0.25, 0.2], [0.85, 0.9, 0.8], { outline: false });
  group.add(belly);
  const head = makeToonSphere(0.55, C.yellow, [0, 0.65, 0.25], [1, 1, 1], o);
  group.add(head);

  // 鸟喙
  const beak = makeToonCone(0.15, 0.35, C.orange, [0, 0.55, 0.85], [Math.PI / 2, 0, 0], 8, o);
  group.add(beak);

  // 眼睛
  const leftEye = makeToonEye([-0.22, 0.78, 0.5], 0.1);
  const rightEye = makeToonEye([0.22, 0.78, 0.5], 0.1);
  group.add(leftEye, rightEye);

  // 羽冠
  const crest1 = makeToonCone(0.06, 0.3, C.orange, [0, 1.15, 0.15], [-0.3, 0, 0], 5, o);
  const crest2 = makeToonCone(0.06, 0.28, C.orange, [-0.1, 1.12, 0.1], [-0.3, 0, -0.2], 5, o);
  const crest3 = makeToonCone(0.06, 0.28, C.orange, [0.1, 1.12, 0.1], [-0.3, 0, 0.2], 5, o);
  group.add(crest1, crest2, crest3);

  // 翅膀
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.3, 0.5, 0.6, 0.3);
  wingShape.quadraticCurveTo(0.5, -0.1, 0.2, -0.3);
  wingShape.quadraticCurveTo(0.05, -0.15, 0, 0);
  const leftWing = new THREE.Group();
  const lwMesh = makeToonWing(wingShape, C.teal, [-0.2, 0, 0], [0, 0, 0]);
  lwMesh.scale.set(0.3, 0.7, 1.1);
  leftWing.add(lwMesh);
  leftWing.position.set(-0.7, -0.05, 0);
  const rightWing = new THREE.Group();
  const rwMesh = makeToonWing(wingShape, C.teal, [0.2, 0, 0], [0, 0, 0]);
  rwMesh.scale.set(-0.3, 0.7, 1.1);
  rightWing.add(rwMesh);
  rightWing.position.set(0.7, -0.05, 0);
  group.add(leftWing, rightWing);

  // 尾羽
  const tailGroup = new THREE.Group();
  const tail1 = makeToonCone(0.15, 0.5, C.teal, [0, -0.1, -0.2], [Math.PI / 2 + 0.3, 0, 0], 4, o);
  tail1.scale.set(1.5, 1, 0.2);
  const tail2 = makeToonCone(0.13, 0.45, C.darkTeal, [-0.12, -0.05, -0.15], [Math.PI / 2 + 0.3, 0, -0.2], 4, o);
  tail2.scale.set(1.4, 1, 0.2);
  const tail3 = makeToonCone(0.13, 0.45, C.darkTeal, [0.12, -0.05, -0.15], [Math.PI / 2 + 0.3, 0, 0.2], 4, o);
  tail3.scale.set(1.4, 1, 0.2);
  tailGroup.add(tail1, tail2, tail3);
  tailGroup.position.set(0, -0.3, -0.7);
  group.add(tailGroup);

  // 细腿
  const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.4, 10);
  const legMat = new THREE.MeshToonMaterial({ color: C.orange, gradientMap });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.2, -0.95, 0.1);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.2, -0.95, 0.1);
  const leftFoot = makeToonSphere(0.08, C.orange, [-0.2, -1.15, 0.15], [1.5, 0.5, 1], { outline: false });
  const rightFoot = makeToonSphere(0.08, C.orange, [0.2, -1.15, 0.15], [1.5, 0.5, 1], { outline: false });
  group.add(leftLeg, rightLeg, leftFoot, rightFoot);

  return { group, animParts: { tail: tailGroup, head, leftEar: leftWing, rightEar: rightWing, eyes: [leftEye, rightEye], wings: [leftWing, rightWing], body } };
};

// GLB 加载失败时的程序化建模 fallback
const buildProceduralFallback = (modelType: PetModelType, level: number) => {
  switch (modelType) {
    case 'cat': return buildCat(level);
    case 'dragon': return buildDragon(level);
    case 'bird': return buildBird(level);
    default: return buildFox(level);
  }
};

// ============ 主组件 ============
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
  const happyRef = useRef(false);
  const onInteractRef = useRef(onInteract);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  onInteractRef.current = onInteract;

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 7.0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    const disposables: { geo: THREE.BufferGeometry[]; mat: THREE.Material[] } = { geo: [], mat: [] };

    // 灯光：温暖柔和的卡通照明
    const ambient = new THREE.AmbientLight(0xfff8e7, 0.9);
    scene.add(ambient);
    // 主光（上方暖白）
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    // 补光（侧方冷蓝）
    const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.4);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);
    // 轮廓光（后方金色）
    const rimLight = new THREE.DirectionalLight(0xfbbf24, 0.5);
    rimLight.position.set(0, 2, -4);
    scene.add(rimLight);

    // 容器组：统一处理 GLB 和程序化模型的变换（呼吸/漂浮/旋转）
    const petGroup = new THREE.Group();
    petGroup.scale.setScalar(size);
    petGroupRef.current = petGroup;
    scene.add(petGroup);

    const glbConfig = GLB_MODEL_MAP[modelType];
    let isActive = true; // 防止异步加载完成后场景已被清理

    if (glbConfig) {
      // ===== GLB 开源模型加载 + 星空主题重新着色 =====
      // 使用 fetch + parse 避免 GLTFLoader.load 在 Vite dev 模式下的请求中断问题
      const loader = new GLTFLoader();
      console.log('[Pet3D] 开始加载 GLB:', modelType, glbConfig.url);
      fetch(glbConfig.url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then(buf => {
          console.log('[Pet3D] GLB fetch 成功:', glbConfig.url, buf.byteLength, 'bytes, isActive:', isActive);
          if (!isActive || !petGroupRef.current) {
            console.warn('[Pet3D] 跳过 parse: isActive=', isActive, 'petGroup=', !!petGroupRef.current);
            return;
          }
          loader.parse(buf, '', (gltf) => {
            console.log('[Pet3D] GLB parse 成功:', glbConfig.url, '动画数:', gltf.animations.length, 'isActive:', isActive);
            if (!isActive || !petGroupRef.current) {
              console.warn('[Pet3D] 跳过 add: isActive=', isActive, 'petGroup=', !!petGroupRef.current);
              return;
            }
            const model = gltf.scene;
            if (glbConfig.rotationY) model.rotation.y = glbConfig.rotationY;

            // 自动缩放到目标高度，居中并放到地面
            const box = new THREE.Box3().setFromObject(model);
            const boxSize = new THREE.Vector3();
            box.getSize(boxSize);
            const targetHeight = glbConfig.targetHeight || 1.6;
            const autoScale = targetHeight / boxSize.y;
            model.scale.setScalar(autoScale);

            // 重新计算缩放后的包围盒并完全居中（中心在原点）
            const scaledBox = new THREE.Box3().setFromObject(model);
            const center = scaledBox.getCenter(new THREE.Vector3());
            model.position.sub(center);

            // 重新着色为星空主题色 + 发光效果
            recolorGLBModel(model, modelType);

            petGroupRef.current.add(model);

            // 收集资源用于清理
            model.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                if (child.geometry) disposables.geo.push(child.geometry);
                if (child.material) {
                  if (Array.isArray(child.material)) disposables.mat.push(...child.material);
                  else disposables.mat.push(child.material);
                }
              }
            });

            // 播放闲置动画
            if (gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              mixerRef.current = mixer;
              const clip = glbConfig.idleClip
                ? gltf.animations.find(a => a.name.includes(glbConfig.idleClip!)) || gltf.animations[0]
                : gltf.animations[0];
              const action = mixer.clipAction(clip);
              action.play();
            }
          }, (parseError) => {
            console.error('[Pet3D] GLB 解析失败:', parseError);
            if (!isActive || !petGroupRef.current) return;
            const fallback = buildProceduralFallback(modelType, level);
            petGroupRef.current.add(fallback.group);
            animPartsRef.current = fallback.animParts;
          });
        })
        .catch(fetchError => {
          console.error('[Pet3D] GLB fetch 失败，回退到程序化建模:', fetchError);
          if (!isActive || !petGroupRef.current) return;
          const fallback = buildProceduralFallback(modelType, level);
          petGroupRef.current.add(fallback.group);
          animPartsRef.current = fallback.animParts;
        });
    } else {
      // ===== 程序化卡通建模 fallback（所有 GLB 都有配置，此分支仅在配置缺失时触发）=====
      const result = buildProceduralFallback(modelType, level);
      petGroup.add(result.group);
      animPartsRef.current = result.animParts;

      // 收集资源用于清理
      result.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) disposables.geo.push(child.geometry);
          if (child.material) {
            if (Array.isArray(child.material)) disposables.mat.push(...child.material);
            else disposables.mat.push(child.material);
          }
        }
      });
    }

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
          happyRef.current = true;
          onInteractRef.current?.();
          setTimeout(() => { happyRef.current = false; }, 1500);
        }
      }
    };
    canvasRef.current.addEventListener('click', handleClick);

    // 动画循环
    const clock = new THREE.Clock();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const t = clock.elapsedTime;

      // 更新 GLB 模型的骨骼动画
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      if (petGroupRef.current) {
        const breatheAmp = hunger > 30 ? 0.025 : 0.01;
        const breathe = 1 + Math.sin(t * 1.8) * breatheAmp;
        petGroupRef.current.scale.set(size * breathe, size * breathe, size * breathe);

        const floatAmp = mood > 50 ? 0.1 : 0.04;
        petGroupRef.current.position.y = Math.sin(t * 1.2) * floatAmp;

        petGroupRef.current.rotation.y = Math.sin(t * 0.3) * 0.3;

        if (hunger < 20) {
          petGroupRef.current.rotation.x = 0.15;
        } else {
          petGroupRef.current.rotation.x = 0;
        }
      }

      if (animPartsRef.current) {
        const parts = animPartsRef.current;
        if (parts.tail) {
          parts.tail.rotation.z = Math.sin(t * 2.5) * 0.25 + (modelType === 'fox' ? 0.5 : 0);
        }
        if (parts.head) {
          parts.head.rotation.y = Math.sin(t * 0.8) * 0.1;
          parts.head.rotation.x = Math.sin(t * 1.5) * 0.04;
        }
        if (parts.wings) {
          const wingSpeed = happyRef.current ? 8 : 2;
          const wingAmp = happyRef.current ? 0.6 : 0.2;
          parts.wings.forEach((w, i) => {
            w.rotation.z = (i === 0 ? 1 : -1) * (Math.sin(t * wingSpeed) * wingAmp + (i === 0 ? -0.5 : 0.5));
          });
        }
        if (parts.leftEar) parts.leftEar.rotation.z = Math.sin(t * 1.5) * 0.05 - 0.2;
        if (parts.rightEar) parts.rightEar.rotation.z = -Math.sin(t * 1.5) * 0.05 + 0.2;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 自适应
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
      isActive = false;
      cancelAnimationFrame(animationIdRef.current);
      canvasRef.current?.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      // 清空 petGroup 的 children，防止异步加载完成后旧模型残留到新场景
      if (petGroupRef.current) {
        while (petGroupRef.current.children.length > 0) {
          petGroupRef.current.remove(petGroupRef.current.children[0]);
        }
      }
      disposables.geo.forEach((g) => g.dispose());
      disposables.mat.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, [modelType, level, size, interactive]);

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
