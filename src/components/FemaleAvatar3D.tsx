/**
 * NOVA - 3D Reactive Female AI Avatar
 *
 * Full Three.js procedural humanoid female AI character:
 * - Expressive natural facial animation with blinking eyes and mouse/gaze tracking
 * - Articulated mouth with real-time lip sync synchronized with speech & visemes
 * - Upper body & spine with continuous natural breathing and posture adjustments
 * - Articulated arms and hands executing dynamic gestures (Wave, Explain, Think, Listen, Holo-typing, Cheer)
 * - Articulated legs and cyber-boots with weight shifting, stance adjustments, and rhythmic feet gestures
 * - Reactive lighting and holographic sci-fi visual telemetry rings
 * - 100% procedural geometry and textures (zero external file / 404 dependencies)
 * - Complies with Three.js Skill (RoomEnvironment, isSoftwareGl guard, ACESFilmic tone mapping, zero GC in tick)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AgentStatus, AvatarGesture, AvatarTheme } from '../types';
import { VisemeMetrics } from '../lib/voiceEngine';
import {
  Sparkles,
  Hand,
  Lightbulb,
  Brain,
  Smile,
  Zap,
  Palette,
  Volume2,
  RefreshCw,
  Eye,
  Heart,
} from 'lucide-react';

export type AvatarEmotion = 'happy' | 'neutral' | 'concerned' | 'thinking' | 'curious';

interface FemaleAvatar3DProps {
  status: AgentStatus;
  isSpeaking: boolean;
  isListening: boolean;
  viseme?: VisemeMetrics;
  emotion?: AvatarEmotion;
  theme?: AvatarTheme;
  onTriggerVoiceGreeting?: (customText?: string) => void;
  onSwitchToOrb?: () => void;
}

// Reusable math objects at module scope for Zero-GC render loop
const _vec3 = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _mouseTarget = new THREE.Vector2();

// Theme color definitions
export const AVATAR_THEMES: Record<
  AvatarTheme,
  {
    name: string;
    primaryHex: number;
    primaryCss: string;
    secondaryHex: number;
    emissiveHex: number;
    suitHex: number;
    accentHex: number;
    glowRgba: string;
  }
> = {
  royal_blue: {
    name: 'Royal Blue & Onyx Black (Flagship Cyber)',
    primaryHex: 0x2563eb,
    primaryCss: '#2563eb',
    secondaryHex: 0x1d4ed8,
    emissiveHex: 0x3b82f6,
    suitHex: 0x020617,
    accentHex: 0x60a5fa,
    glowRgba: 'rgba(37, 99, 235, 0.55)',
  },
  neon_cyan: {
    name: 'Neon Cyan (NOVA Prime)',
    primaryHex: 0x00f0ff,
    primaryCss: '#00f0ff',
    secondaryHex: 0x0088ff,
    emissiveHex: 0x00e1ff,
    suitHex: 0x0d1527,
    accentHex: 0x22d3ee,
    glowRgba: 'rgba(0, 240, 255, 0.4)',
  },
  sakura_magenta: {
    name: 'Sakura Pink (Synth Queen)',
    primaryHex: 0xf43f5e,
    primaryCss: '#f43f5e',
    secondaryHex: 0xd946ef,
    emissiveHex: 0xfb7185,
    suitHex: 0x1f1124,
    accentHex: 0xf472b6,
    glowRgba: 'rgba(244, 63, 94, 0.45)',
  },
  matrix_emerald: {
    name: 'Matrix Emerald (Quantum AI)',
    primaryHex: 0x10b981,
    primaryCss: '#10b981',
    secondaryHex: 0x059669,
    emissiveHex: 0x34d399,
    suitHex: 0x071e16,
    accentHex: 0x6ee7b7,
    glowRgba: 'rgba(16, 185, 129, 0.4)',
  },
  solis_amber: {
    name: 'Solis Amber (Cyber Gold)',
    primaryHex: 0xf59e0b,
    primaryCss: '#f59e0b',
    secondaryHex: 0xd97706,
    emissiveHex: 0xfbbf24,
    suitHex: 0x1c1508,
    accentHex: 0xfcd34d,
    glowRgba: 'rgba(245, 158, 11, 0.4)',
  },
};

export const FemaleAvatar3D: React.FC<FemaleAvatar3DProps> = ({
  status,
  isSpeaking,
  isListening,
  viseme,
  emotion,
  theme = 'royal_blue',
  onTriggerVoiceGreeting,
  onSwitchToOrb,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentGesture, setCurrentGesture] = useState<AvatarGesture>('idle');
  const [manualEmotion, setManualEmotion] = useState<AvatarEmotion | null>(null);
  const [activeTheme, setActiveTheme] = useState<AvatarTheme>(theme);
  const [interactiveBubble, setInteractiveBubble] = useState<string | null>(null);
  const [isDanced, setIsDanced] = useState(false);

  // Sync prop theme update
  useEffect(() => {
    setActiveTheme(theme);
  }, [theme]);

  // Keep ref for dynamic values in render loop
  const stateRef = useRef({
    status,
    isSpeaking,
    isListening,
    viseme: viseme || { mouthOpen: 0, mouthWide: 0.3, jawDrop: 0, emotion: 'neutral' },
    emotionProp: emotion,
    manualEmotion: manualEmotion,
    gesture: currentGesture,
    themeData: AVATAR_THEMES[activeTheme],
    mouseNorm: { x: 0, y: 0 },
  });

  stateRef.current.status = status;
  stateRef.current.isSpeaking = isSpeaking;
  stateRef.current.isListening = isListening;
  if (viseme) stateRef.current.viseme = viseme;
  stateRef.current.emotionProp = emotion;
  stateRef.current.manualEmotion = manualEmotion;
  stateRef.current.gesture = currentGesture;
  stateRef.current.themeData = AVATAR_THEMES[activeTheme];

  // Helper to trigger temporary gesture with auto-reset to idle
  const triggerGesture = useCallback((gesture: AvatarGesture, durationMs: number = 3200) => {
    setCurrentGesture(gesture);
    setTimeout(() => {
      setCurrentGesture((prev) => (prev === gesture ? 'idle' : prev));
    }, durationMs);
  }, []);

  // Status-driven default gesture responses
  useEffect(() => {
    if (status === 'THINKING') {
      setCurrentGesture('think');
    } else if (status === 'EXECUTING') {
      setCurrentGesture('holo_typing');
    } else if (status === 'COMPLETED') {
      setCurrentGesture('cheer');
      setTimeout(() => setCurrentGesture('idle'), 3000);
    } else if (isListening) {
      // Natural listening attentive posture
      setCurrentGesture('idle');
    } else if (isSpeaking && currentGesture === 'idle') {
      setCurrentGesture('explain');
    } else if (!isSpeaking && currentGesture === 'explain') {
      setCurrentGesture('idle');
    }
  }, [status, isSpeaking, isListening]);

  // Three.js Mount & Animation Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Detect software WebGL guard
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / container.clientHeight,
      0.1,
      50
    );
    // Medium-height framing: centered on character chest/eyes, scaled gracefully for laptop screens
    camera.position.set(0, 1.20, 2.45);

    // 3. Renderer configuration
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 4. Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Graceful fallback
    }

    // 5. Lighting Rig (Key, Fill, Rim)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x38bdf8, 0x050811, 1.2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(stateRef.current.themeData.primaryHex, 3.5, 6);
    rimLight.position.set(0, 2.5, -1.8);
    scene.add(rimLight);

    // 6. Character Hierarchy (THREE.Group) - Scaled 1.15x for balanced laptop & desktop hero framing
    const avatarRoot = new THREE.Group();
    avatarRoot.position.set(0, -0.78, 0); // Elegantly grounded on stage
    avatarRoot.scale.set(1.15, 1.15, 1.15);
    scene.add(avatarRoot);

    // Procedural grounded contact shadow plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;

    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.005;
    avatarRoot.add(shadowMesh);

    // Procedural holographic pedestal inner ring
    const ringGeo = new THREE.RingGeometry(0.7, 0.82, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: stateRef.current.themeData.primaryHex,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.01;
    avatarRoot.add(ringMesh);

    // Procedural holographic pedestal outer ring
    const ringOuterGeo = new THREE.RingGeometry(0.88, 0.94, 48);
    const ringOuterMat = new THREE.MeshBasicMaterial({
      color: stateRef.current.themeData.secondaryHex,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const ringOuterMesh = new THREE.Mesh(ringOuterGeo, ringOuterMat);
    ringOuterMesh.rotation.x = -Math.PI / 2;
    ringOuterMesh.position.y = 0.008;
    avatarRoot.add(ringOuterMesh);

    // Materials Library for Procedural Avatar
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: 0xffdfd0,
      roughness: 0.55,
      metalness: 0.05,
      clearcoat: 0.25,
      clearcoatRoughness: 0.2,
    });

    const suitMat = new THREE.MeshPhysicalMaterial({
      color: stateRef.current.themeData.suitHex,
      roughness: 0.25,
      metalness: 0.75,
      clearcoat: 0.4,
    });

    const cyberArmorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });

    const emissiveMat = new THREE.MeshStandardMaterial({
      color: stateRef.current.themeData.primaryHex,
      emissive: stateRef.current.themeData.emissiveHex,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.8,
    });

    const hairMat = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      roughness: 0.35,
      metalness: 0.6,
      clearcoat: 0.8,
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.12,
      metalness: 0.05,
    });

    const irisMat = new THREE.MeshStandardMaterial({
      color: stateRef.current.themeData.primaryHex,
      emissive: stateRef.current.themeData.emissiveHex,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.3,
    });

    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x050508,
      roughness: 0.1,
    });

    const glintMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const eyelashMat = new THREE.MeshStandardMaterial({
      color: 0x07070a,
      roughness: 0.4,
      metalness: 0.3,
    });

    const eyebrowMat = new THREE.MeshStandardMaterial({
      color: 0x141419,
      roughness: 0.6,
      metalness: 0.1,
    });

    const lipMat = new THREE.MeshPhysicalMaterial({
      color: 0xf43f5e,
      emissive: 0x9f1239,
      emissiveIntensity: 0.35,
      roughness: 0.15,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    // --- SKELETAL HIERARCHY GROUPS ---
    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(0, 0.95, 0);
    avatarRoot.add(pelvisGroup);

    // Pelvis geometry
    const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.16, 16), suitMat);
    pelvisGroup.add(pelvisMesh);

    // --- LEGS & FEET (Articulated for stance shifting and gestures) ---
    // Left Leg
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.13, -0.05, 0);
    pelvisGroup.add(leftLegGroup);

    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.36, 16), suitMat);
    leftThigh.position.y = -0.18;
    leftLegGroup.add(leftThigh);

    const leftKneeGroup = new THREE.Group();
    leftKneeGroup.position.set(0, -0.36, 0);
    leftLegGroup.add(leftKneeGroup);

    const leftCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.36, 16), suitMat);
    leftCalf.position.y = -0.18;
    leftKneeGroup.add(leftCalf);

    const leftFootGroup = new THREE.Group();
    leftFootGroup.position.set(0, -0.36, 0);
    leftKneeGroup.add(leftFootGroup);

    // Cyber boot
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.22), cyberArmorMat);
    leftBoot.position.set(0, -0.04, 0.05);
    leftFootGroup.add(leftBoot);

    const leftSoleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.015, 0.222), emissiveMat);
    leftSoleTrim.position.set(0, -0.075, 0.05);
    leftFootGroup.add(leftSoleTrim);

    // Right Leg
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.13, -0.05, 0);
    pelvisGroup.add(rightLegGroup);

    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.36, 16), suitMat);
    rightThigh.position.y = -0.18;
    rightLegGroup.add(rightThigh);

    const rightKneeGroup = new THREE.Group();
    rightKneeGroup.position.set(0, -0.36, 0);
    rightLegGroup.add(rightKneeGroup);

    const rightCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.36, 16), suitMat);
    rightCalf.position.y = -0.18;
    rightKneeGroup.add(rightCalf);

    const rightFootGroup = new THREE.Group();
    rightFootGroup.position.set(0, -0.36, 0);
    rightKneeGroup.add(rightFootGroup);

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.22), cyberArmorMat);
    rightBoot.position.set(0, -0.04, 0.05);
    rightFootGroup.add(rightBoot);

    const rightSoleTrim = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.015, 0.222), emissiveMat);
    rightSoleTrim.position.set(0, -0.075, 0.05);
    rightFootGroup.add(rightSoleTrim);

    // --- SPINE & CHEST (Breathing, posture tilt) ---
    const spineGroup = new THREE.Group();
    spineGroup.position.set(0, 0.1, 0);
    pelvisGroup.add(spineGroup);

    const waistMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.16, 16), suitMat);
    waistMesh.position.y = 0.08;
    spineGroup.add(waistMesh);

    const chestGroup = new THREE.Group();
    chestGroup.position.set(0, 0.18, 0);
    spineGroup.add(chestGroup);

    // Feminine cyber armor chest plate
    const chestMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.14, 0.26, 18), cyberArmorMat);
    chestMesh.position.y = 0.13;
    chestGroup.add(chestMesh);

    // Glowing Arc Core on chest
    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), emissiveMat);
    coreMesh.position.set(0, 0.16, 0.14);
    chestGroup.add(coreMesh);

    // --- ARMS & HANDS (Articulated hand gestures) ---
    // Left Arm
    const leftShoulderGroup = new THREE.Group();
    leftShoulderGroup.position.set(-0.25, 0.22, 0);
    chestGroup.add(leftShoulderGroup);

    const leftPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), cyberArmorMat);
    leftShoulderGroup.add(leftPauldron);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.26, 12), suitMat);
    leftUpperArm.position.y = -0.13;
    leftShoulderGroup.add(leftUpperArm);

    const leftElbowGroup = new THREE.Group();
    leftElbowGroup.position.set(0, -0.26, 0);
    leftShoulderGroup.add(leftElbowGroup);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.24, 12), suitMat);
    leftForearm.position.y = -0.12;
    leftElbowGroup.add(leftForearm);

    const leftWristBand = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.04, 12), emissiveMat);
    leftWristBand.position.y = -0.21;
    leftElbowGroup.add(leftWristBand);

    const leftHandGroup = new THREE.Group();
    leftHandGroup.position.set(0, -0.24, 0);
    leftElbowGroup.add(leftHandGroup);

    // Palm & fingers
    const leftPalm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.065, 0.02), skinMat);
    leftPalm.position.y = -0.03;
    leftHandGroup.add(leftPalm);

    // Right Arm
    const rightShoulderGroup = new THREE.Group();
    rightShoulderGroup.position.set(0.25, 0.22, 0);
    chestGroup.add(rightShoulderGroup);

    const rightPauldron = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), cyberArmorMat);
    rightShoulderGroup.add(rightPauldron);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.26, 12), suitMat);
    rightUpperArm.position.y = -0.13;
    rightShoulderGroup.add(rightUpperArm);

    const rightElbowGroup = new THREE.Group();
    rightElbowGroup.position.set(0, -0.26, 0);
    rightShoulderGroup.add(rightElbowGroup);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.24, 12), suitMat);
    rightForearm.position.y = -0.12;
    rightElbowGroup.add(rightForearm);

    const rightWristBand = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.04, 12), emissiveMat);
    rightWristBand.position.y = -0.21;
    rightElbowGroup.add(rightWristBand);

    const rightHandGroup = new THREE.Group();
    rightHandGroup.position.set(0, -0.24, 0);
    rightElbowGroup.add(rightHandGroup);

    const rightPalm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.065, 0.02), skinMat);
    rightPalm.position.y = -0.03;
    rightHandGroup.add(rightPalm);

    // --- NECK & HEAD ---
    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 0.27, 0);
    chestGroup.add(neckGroup);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.1, 16), skinMat);
    neckMesh.position.y = 0.05;
    neckGroup.add(neckMesh);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.12, 0);
    neckGroup.add(headGroup);

    // Smooth, flawless feminine face base (no lumpy chin or cheek bulbs)
    const faceMesh = new THREE.Mesh(new THREE.SphereGeometry(0.155, 36, 32), skinMat);
    faceMesh.scale.set(0.86, 1.10, 0.90);
    faceMesh.position.set(0, 0.11, 0);
    headGroup.add(faceMesh);

    // Sleek cybernetic hair / ponytail
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.166, 24, 24), hairMat);
    hairCap.scale.set(0.93, 1.06, 0.98);
    hairCap.position.set(0, 0.162, -0.02);
    headGroup.add(hairCap);

    // Side face-framing hair bangs
    const leftHairStrand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.005, 0.22, 12), hairMat);
    leftHairStrand.position.set(-0.118, 0.08, 0.09);
    leftHairStrand.rotation.z = -0.15;
    leftHairStrand.rotation.x = 0.1;
    headGroup.add(leftHairStrand);

    const rightHairStrand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.005, 0.22, 12), hairMat);
    rightHairStrand.position.set(0.118, 0.08, 0.09);
    rightHairStrand.rotation.z = 0.15;
    rightHairStrand.rotation.x = 0.1;
    headGroup.add(rightHairStrand);

    const ponytailGroup = new THREE.Group();
    ponytailGroup.position.set(0, 0.2, -0.14);
    headGroup.add(ponytailGroup);

    const ponytailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.42, 14), hairMat);
    ponytailMesh.rotation.x = -Math.PI / 3;
    ponytailMesh.position.set(0, -0.15, -0.09);
    ponytailGroup.add(ponytailMesh);

    // Hair fiber-optic emissive accent
    const hairAccent = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.014, 8, 28), emissiveMat);
    hairAccent.position.set(0, 0.18, 0.02);
    hairAccent.rotation.x = Math.PI / 4;
    headGroup.add(hairAccent);

    // --- ANATOMICAL EARS (Contoured helix, concha cavity, lobule & cyber communicator) ---
    const earCavityMat = new THREE.MeshStandardMaterial({
      color: 0xd9b3a6,
      roughness: 0.75,
      metalness: 0.05,
    });

    // Left Ear
    const leftEarGroup = new THREE.Group();
    leftEarGroup.position.set(-0.162, 0.122, -0.015);
    leftEarGroup.rotation.y = -0.16;
    headGroup.add(leftEarGroup);

    const leftEarCartilage = new THREE.Mesh(
      new THREE.TorusGeometry(0.034, 0.01, 10, 18, Math.PI * 1.35),
      skinMat
    );
    leftEarCartilage.rotation.z = Math.PI / 2.2;
    leftEarGroup.add(leftEarCartilage);

    // Anatomical ear concha (interior sound cavity providing realistic 3D depth)
    const leftEarConcha = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 10), earCavityMat);
    leftEarConcha.scale.set(0.65, 1.1, 0.45);
    leftEarConcha.position.set(0.007, 0.002, 0.006);
    leftEarGroup.add(leftEarConcha);

    const leftEarLobe = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 12), skinMat);
    leftEarLobe.scale.set(0.7, 1.2, 0.8);
    leftEarLobe.position.set(0.005, -0.032, 0);
    leftEarGroup.add(leftEarLobe);

    const leftCyberCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.018, 16), cyberArmorMat);
    leftCyberCuff.rotation.z = Math.PI / 2;
    leftCyberCuff.position.set(-0.012, 0.005, 0);
    leftEarGroup.add(leftCyberCuff);

    const leftCyberRing = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.004, 8, 16), emissiveMat);
    leftCyberRing.rotation.y = Math.PI / 2;
    leftCyberRing.position.set(-0.018, 0.005, 0);
    leftEarGroup.add(leftCyberRing);

    const leftAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.045, 8), emissiveMat);
    leftAntenna.position.set(-0.012, 0.035, -0.015);
    leftAntenna.rotation.x = -0.35;
    leftEarGroup.add(leftAntenna);

    // Right Ear
    const rightEarGroup = new THREE.Group();
    rightEarGroup.position.set(0.162, 0.122, -0.015);
    rightEarGroup.rotation.y = 0.16;
    headGroup.add(rightEarGroup);

    const rightEarCartilage = new THREE.Mesh(
      new THREE.TorusGeometry(0.034, 0.01, 10, 18, Math.PI * 1.35),
      skinMat
    );
    rightEarCartilage.rotation.z = -Math.PI / 2.2;
    rightEarGroup.add(rightEarCartilage);

    // Anatomical ear concha (interior cavity)
    const rightEarConcha = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 10), earCavityMat);
    rightEarConcha.scale.set(0.65, 1.1, 0.45);
    rightEarConcha.position.set(-0.007, 0.002, 0.006);
    rightEarGroup.add(rightEarConcha);

    const rightEarLobe = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 12), skinMat);
    rightEarLobe.scale.set(0.7, 1.2, 0.8);
    rightEarLobe.position.set(-0.005, -0.032, 0);
    rightEarGroup.add(rightEarLobe);

    const rightCyberCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.018, 16), cyberArmorMat);
    rightCyberCuff.rotation.z = Math.PI / 2;
    rightCyberCuff.position.set(0.012, 0.005, 0);
    rightEarGroup.add(rightCyberCuff);

    const rightCyberRing = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.004, 8, 16), emissiveMat);
    rightCyberRing.rotation.y = Math.PI / 2;
    rightCyberRing.position.set(0.018, 0.005, 0);
    rightEarGroup.add(rightCyberRing);

    const rightAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.045, 8), emissiveMat);
    rightAntenna.position.set(0.012, 0.035, -0.015);
    rightAntenna.rotation.x = -0.35;
    rightEarGroup.add(rightAntenna);

    // --- ANATOMICAL EYES (Sclera, glowing iris, dark pupil, glint & articulated lashes/eyelids) ---
    // Left Eye
    const leftEyeGroup = new THREE.Group();
    leftEyeGroup.position.set(-0.055, 0.138, 0.136);
    headGroup.add(leftEyeGroup);

    const leftEyeball = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 16), eyeMat);
    leftEyeball.scale.set(1.15, 0.95, 0.85);
    leftEyeGroup.add(leftEyeball);

    const leftIris = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 16), irisMat);
    leftIris.position.set(0, 0, 0.018);
    leftEyeGroup.add(leftIris);

    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 14, 14), pupilMat);
    leftPupil.position.set(0, 0, 0.023);
    leftEyeGroup.add(leftPupil);

    const leftGlint = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 8), glintMat);
    leftGlint.position.set(0.004, 0.004, 0.025);
    leftEyeGroup.add(leftGlint);

    // Left Upper Eyelash Fan Rig (Moves dynamically with blink & emotion tilt)
    const leftUpperLashGroup = new THREE.Group();
    leftUpperLashGroup.position.set(0, 0.006, 0.017);
    leftEyeGroup.add(leftUpperLashGroup);

    const leftUpperLashLine = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.0034, 8, 18, Math.PI * 0.92),
      eyelashMat
    );
    leftUpperLashLine.rotation.z = Math.PI * 0.04;
    leftUpperLashGroup.add(leftUpperLashLine);

    // 5 Curved Individual Eyelashes ("eye laces") fanning out prominently
    const lashAngles = [-0.08, -0.22, -0.38, -0.54, -0.72];
    lashAngles.forEach((angle, idx) => {
      const lash = new THREE.Mesh(new THREE.ConeGeometry(0.0019, 0.015 + idx * 0.002, 6), eyelashMat);
      lash.position.set(-0.006 - idx * 0.0045, 0.008 + idx * 0.001, 0.002);
      lash.rotation.z = angle;
      lash.rotation.x = -0.42;
      leftUpperLashGroup.add(lash);
    });

    // Right Eye
    const rightEyeGroup = new THREE.Group();
    rightEyeGroup.position.set(0.055, 0.138, 0.136);
    headGroup.add(rightEyeGroup);

    const rightEyeball = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 16), eyeMat);
    rightEyeball.scale.set(1.15, 0.95, 0.85);
    rightEyeGroup.add(rightEyeball);

    const rightIris = new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 16), irisMat);
    rightIris.position.set(0, 0, 0.018);
    rightEyeGroup.add(rightIris);

    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 14, 14), pupilMat);
    rightPupil.position.set(0, 0, 0.023);
    rightEyeGroup.add(rightPupil);

    const rightGlint = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 8), glintMat);
    rightGlint.position.set(-0.004, 0.004, 0.025);
    rightEyeGroup.add(rightGlint);

    // Right Upper Eyelash Fan Rig
    const rightUpperLashGroup = new THREE.Group();
    rightUpperLashGroup.position.set(0, 0.006, 0.017);
    rightEyeGroup.add(rightUpperLashGroup);

    const rightUpperLashLine = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.0034, 8, 18, Math.PI * 0.92),
      eyelashMat
    );
    rightUpperLashLine.rotation.z = -Math.PI * 0.04;
    rightUpperLashGroup.add(rightUpperLashLine);

    // 5 Curved Individual Eyelashes ("eye laces") fanning out
    lashAngles.forEach((angle, idx) => {
      const lash = new THREE.Mesh(new THREE.ConeGeometry(0.0019, 0.015 + idx * 0.002, 6), eyelashMat);
      lash.position.set(0.006 + idx * 0.0045, 0.008 + idx * 0.001, 0.002);
      lash.rotation.z = -angle;
      lash.rotation.x = -0.42;
      rightUpperLashGroup.add(lash);
    });

    // Upper Eyelids (Blinking + Emotional Aperture)
    const leftEyelid = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.035, 0.01), skinMat);
    leftEyelid.position.set(-0.055, 0.162, 0.147);
    headGroup.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.035, 0.01), skinMat);
    rightEyelid.position.set(0.055, 0.162, 0.147);
    headGroup.add(rightEyelid);

    // Expressive Sleek Eyebrows (Arched, furrowed, or raised based on emotion)
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.008, 0.012), eyebrowMat);
    leftBrow.position.set(-0.055, 0.176, 0.144);
    leftBrow.rotation.z = 0.05;
    headGroup.add(leftBrow);

    const leftBrowGlow = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.0025, 0.013), emissiveMat);
    leftBrowGlow.position.set(-0.055, 0.172, 0.145);
    headGroup.add(leftBrowGlow);

    const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.008, 0.012), eyebrowMat);
    rightBrow.position.set(0.055, 0.176, 0.144);
    rightBrow.rotation.z = -0.05;
    headGroup.add(rightBrow);

    const rightBrowGlow = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.0025, 0.013), emissiveMat);
    rightBrowGlow.position.set(0.055, 0.172, 0.145);
    headGroup.add(rightBrowGlow);

    // Soft frontal light illuminating the mouth and face area
    const faceSoftFillLight = new THREE.PointLight(0xfff3e8, 1.4, 2.0);
    faceSoftFillLight.position.set(0, 0.06, 0.45);
    headGroup.add(faceSoftFillLight);

    // --- ARTICULATED MOUTH & GLOSSY FEMININE LIPS RIG (Moving with Visemes & Emotions) ---
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, 0.062, 0.15);
    headGroup.add(mouthGroup);

    // Upper Lip (Graceful, smooth Cupid's bow with soft feminine curvature and high gloss — zero boxy shadow)
    const upperLipGroup = new THREE.Group();
    upperLipGroup.position.y = 0.005;
    mouthGroup.add(upperLipGroup);

    // Soft rounded Cupid's bow center (Smooth sphere rather than an angular box)
    const upperLipCenter = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 14), lipMat);
    upperLipCenter.scale.set(1.5, 0.58, 0.85);
    upperLipCenter.castShadow = false;
    upperLipGroup.add(upperLipCenter);

    const upperLipLeftWing = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 14, 12), lipMat);
    upperLipLeftWing.scale.set(1.35, 0.52, 0.8);
    upperLipLeftWing.position.set(-0.014, 0.001, 0);
    upperLipLeftWing.rotation.z = -0.15;
    upperLipLeftWing.castShadow = false;
    upperLipGroup.add(upperLipLeftWing);

    const upperLipRightWing = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 14, 12), lipMat);
    upperLipRightWing.scale.set(1.35, 0.52, 0.8);
    upperLipRightWing.position.set(0.014, 0.001, 0);
    upperLipRightWing.rotation.z = 0.15;
    upperLipRightWing.castShadow = false;
    upperLipGroup.add(upperLipRightWing);

    // Smile corner commissure nodes (lift up for smile, down for concerned)
    const leftSmileCorner = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 10), lipMat);
    leftSmileCorner.position.set(-0.023, 0.001, 0);
    mouthGroup.add(leftSmileCorner);

    const rightSmileCorner = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 10), lipMat);
    rightSmileCorner.position.set(0.023, 0.001, 0);
    mouthGroup.add(rightSmileCorner);

    // Lower Lip (Fuller, rounded feminine lip with high gloss)
    const lowerLipGroup = new THREE.Group();
    lowerLipGroup.position.y = -0.005;
    mouthGroup.add(lowerLipGroup);

    const lowerLipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 14), lipMat);
    lowerLipMesh.scale.set(1.9, 0.72, 0.95);
    lowerLipMesh.castShadow = false;
    lowerLipGroup.add(lowerLipMesh);

    const upperLip = upperLipGroup;
    const lowerLip = lowerLipGroup;

    // Inner oral cavity (warm natural mouth tone, hidden when resting to prevent dark moustache appearance)
    const oralCavity = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x5a1827 }) // Soft warm oral rose, NEVER dark black
    );
    oralCavity.position.set(0, 0, -0.012);
    oralCavity.scale.set(0.001, 0.001, 0.001);
    oralCavity.visible = false;
    mouthGroup.add(oralCavity);

    // Guaranteed Anti-Moustache & Facial Shadow Guard:
    // Strip all shadow casting and receiving from the head and facial meshes so no directional light
    // or hair bangs can ever cast harsh dark shadows or lines across the philtrum, nose or lips.
    headGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).castShadow = false;
        (obj as THREE.Mesh).receiveShadow = false;
      }
    });

    // Holographic Typing Interface HUD (visible during 'holo_typing')
    const holoHudGroup = new THREE.Group();
    holoHudGroup.position.set(0, 0.35, 0.45);
    holoHudGroup.rotation.x = -Math.PI / 6;
    chestGroup.add(holoHudGroup);

    const holoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.22),
      new THREE.MeshBasicMaterial({
        color: stateRef.current.themeData.primaryHex,
        transparent: true,
        opacity: 0.25,
        wireframe: true,
      })
    );
    holoHudGroup.add(holoPlane);
    holoHudGroup.visible = false;

    // Pointer movement tracking
    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      stateRef.current.mouseNorm.x = THREE.MathUtils.clamp(x, -1, 1);
      stateRef.current.mouseNorm.y = THREE.MathUtils.clamp(y, -1, 1);
    };
    window.addEventListener('pointermove', onPointerMove);

    // Window Resize Handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // --- ANIMATION TICK LOOP ---
    let frameId = 0;
    let clock = new THREE.Clock();

    // Procedural Natural Blinking Controller with random intervals and asymmetric human dynamics
    let blinkTimer = 0;
    let blinkDuration = 0;
    let isBlinking = false;
    let blinkProgress = 0;
    let currentBlinkMaxDuration = 0.18;
    let nextBlinkInterval = 2.2 + Math.random() * 2.6; // Initial interval 2.2s - 4.8s
    let isDoubleBlinkQueued = false;
    let saccadeOffsetX = 0;
    let saccadeOffsetY = 0;
    let weightShiftPhase = 0;

    // Continuous zero-GC emotion blend weights
    let currentHappy = 0;
    let currentConcerned = 0;
    let currentThinking = 0;
    let currentCurious = 0;
    let currentNeutral = 1;

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const state = stateRef.current;

      // Update theme materials if changed
      if (emissiveMat.color.getHex() !== state.themeData.primaryHex) {
        emissiveMat.color.setHex(state.themeData.primaryHex);
        emissiveMat.emissive.setHex(state.themeData.emissiveHex);
        pupilMat.color.setHex(state.themeData.primaryHex);
        pupilMat.emissive.setHex(state.themeData.primaryHex);
        ringMat.color.setHex(state.themeData.primaryHex);
        suitMat.color.setHex(state.themeData.suitHex);
        rimLight.color.setHex(state.themeData.primaryHex);
      }

      // --- DYNAMIC EMOTION BLENDING ---
      let targetEmotion: AvatarEmotion = 'neutral';
      if (state.manualEmotion) {
        targetEmotion = state.manualEmotion;
      } else if (state.emotionProp) {
        targetEmotion = state.emotionProp;
      } else if (state.status === 'ERROR') {
        targetEmotion = 'concerned';
      } else if (state.status === 'THINKING') {
        targetEmotion = 'thinking';
      } else if (state.status === 'COMPLETED') {
        targetEmotion = 'happy';
      } else if (state.isListening) {
        targetEmotion = 'curious';
      } else if (state.viseme?.emotion) {
        const ve = state.viseme.emotion.toLowerCase();
        if (ve === 'happy' || ve === 'excited') targetEmotion = 'happy';
        else if (ve === 'concerned' || ve === 'sad' || ve === 'alert' || ve === 'error') targetEmotion = 'concerned';
        else if (ve === 'curious' || ve === 'surprised') targetEmotion = 'curious';
        else if (ve === 'thinking') targetEmotion = 'thinking';
        else targetEmotion = 'neutral';
      }

      // Smooth dampening towards target emotion weights
      const tHappy = targetEmotion === 'happy' ? 1.0 : 0.0;
      const tConcerned = targetEmotion === 'concerned' ? 1.0 : 0.0;
      const tThinking = targetEmotion === 'thinking' ? 1.0 : 0.0;
      const tCurious = targetEmotion === 'curious' ? 1.0 : 0.0;
      const tNeutral = (tHappy === 0 && tConcerned === 0 && tThinking === 0 && tCurious === 0) ? 1.0 : 0.0;

      const eLerp = Math.min(1.0, 5.0 * delta);
      currentHappy = THREE.MathUtils.lerp(currentHappy, tHappy, eLerp);
      currentConcerned = THREE.MathUtils.lerp(currentConcerned, tConcerned, eLerp);
      currentThinking = THREE.MathUtils.lerp(currentThinking, tThinking, eLerp);
      currentCurious = THREE.MathUtils.lerp(currentCurious, tCurious, eLerp);
      currentNeutral = THREE.MathUtils.lerp(currentNeutral, tNeutral, eLerp);

      // --- 1. NATURAL CONTINUOUS BREATHING & POSTURE ---
      const breatheSpeed = state.isSpeaking ? 3.5 : state.isListening ? 2.8 : 2.0;
      const breathe = Math.sin(elapsed * breatheSpeed);
      chestGroup.scale.y = 1 + breathe * 0.025;
      chestGroup.scale.x = 1 + breathe * 0.015;
      chestGroup.scale.z = 1 + breathe * 0.02;

      // Gentle ponytail physics sway
      ponytailGroup.rotation.x = -Math.PI / 3 + Math.sin(elapsed * 2.5) * 0.06;
      ponytailGroup.rotation.z = Math.cos(elapsed * 1.8) * 0.04;

      // --- 2. FEET GESTURES & STANCE WEIGHT SHIFTING ---
      // Shift weight rhythmically between left and right foot (natural human idle dynamic)
      weightShiftPhase += delta * 0.6;
      const weightBias = Math.sin(weightShiftPhase); // -1 (left heavy) to +1 (right heavy)

      // Pelvis sways slightly with weight transfer
      pelvisGroup.position.x = THREE.MathUtils.damp(pelvisGroup.position.x, weightBias * 0.035, 3, delta);
      pelvisGroup.rotation.z = THREE.MathUtils.damp(pelvisGroup.rotation.z, -weightBias * 0.04, 3, delta);

      // Stance feet positions:
      // In listening mode, avatar steps slightly forward attentively
      const isListeningPose = state.isListening;
      const targetLeftZ = isListeningPose ? 0.06 : 0;
      const targetRightZ = isListeningPose ? -0.04 : 0;
      leftLegGroup.position.z = THREE.MathUtils.damp(leftLegGroup.position.z, targetLeftZ, 4, delta);
      rightLegGroup.position.z = THREE.MathUtils.damp(rightLegGroup.position.z, targetRightZ, 4, delta);

      // Idle feet gesture: rhythmic subtle toe/heel tap when waiting or listening
      const tapCycle = Math.sin(elapsed * 4.0);
      if (tapCycle > 0.6 && Math.abs(weightBias) > 0.3) {
        if (weightBias > 0) {
          leftFootGroup.rotation.x = (tapCycle - 0.6) * 0.15;
        } else {
          rightFootGroup.rotation.x = (tapCycle - 0.6) * 0.15;
        }
      } else {
        leftFootGroup.rotation.x = THREE.MathUtils.damp(leftFootGroup.rotation.x, 0, 8, delta);
        rightFootGroup.rotation.x = THREE.MathUtils.damp(rightFootGroup.rotation.x, 0, 8, delta);
      }

      // Rotate ground ring slowly
      ringMesh.rotation.z = elapsed * 0.25;

      // --- 3. PERIODIC RANDOM EYE BLINKING & NATURAL HUMAN MICRO-DYNAMICS ---
      blinkTimer += delta;

      // Start new blink when timer reaches randomized interval
      if (!isBlinking && blinkTimer >= nextBlinkInterval) {
        isBlinking = true;
        blinkDuration = 0;
        // Asymmetric blink duration: double blink follow-up is a fast flutter (130-160ms), standard blink is 160-220ms
        currentBlinkMaxDuration = isDoubleBlinkQueued
          ? 0.13 + Math.random() * 0.03
          : 0.17 + Math.random() * 0.05;
      }

      if (isBlinking) {
        blinkDuration += delta;
        const u = THREE.MathUtils.clamp(blinkDuration / currentBlinkMaxDuration, 0, 1);

        // Biomechanically realistic asymmetric blink curve:
        // Rapid snap close (0 to 0.35), full apex seal (0.35 to 0.44), smooth ease-out reopening (0.44 to 1.0)
        if (u < 0.35) {
          const t = u / 0.35;
          blinkProgress = Math.pow(Math.sin((t * Math.PI) / 2), 1.6);
        } else if (u <= 0.44) {
          blinkProgress = 1.0;
        } else {
          const t = (u - 0.44) / 0.56;
          blinkProgress = 1.0 - Math.pow(Math.sin((t * Math.PI) / 2), 1.25);
        }

        if (u >= 1) {
          isBlinking = false;
          blinkTimer = 0;
          blinkProgress = 0;

          // Living eye micro-saccade offset upon blink reopening
          saccadeOffsetX = (Math.random() - 0.5) * 0.0035;
          saccadeOffsetY = (Math.random() - 0.5) * 0.0025;

          // Occasional double-blink check (~18% chance, higher when thinking/curious)
          const doubleBlinkChance = currentThinking > 0.4 || currentCurious > 0.4 ? 0.24 : 0.18;
          if (!isDoubleBlinkQueued && Math.random() < doubleBlinkChance) {
            isDoubleBlinkQueued = true;
            nextBlinkInterval = 0.12 + Math.random() * 0.10; // Rapid secondary flutter in 120-220ms
          } else {
            isDoubleBlinkQueued = false;
            // Base interval randomized between 2.2s and 5.2s, modulated by state
            const baseInterval = state.isSpeaking ? 2.0 : (currentThinking > 0.4 ? 3.0 : 2.5);
            nextBlinkInterval = baseInterval + Math.random() * 2.8;
          }
        }
      }

      // Emotional squinch/tension on eyelids
      const happySquinch = currentHappy * 0.26;
      const concernedTension = currentConcerned * 0.12;
      const curiousWide = currentCurious * -0.06;

      const upperLidAperture = THREE.MathUtils.clamp(
        0.08 + happySquinch + concernedTension + curiousWide,
        0.02,
        0.45
      );
      const upperLidScale = THREE.MathUtils.lerp(upperLidAperture, 1.35, blinkProgress);
      leftEyelid.scale.y = upperLidScale;
      rightEyelid.scale.y = upperLidScale;

      // Realistic vertical translation of upper eyelid during closure to fully seal over eyeball
      const eyelidBaseY = 0.162;
      const eyelidClosedY = 0.146;
      const currentEyelidY = THREE.MathUtils.lerp(eyelidBaseY, eyelidClosedY, blinkProgress * 0.85);
      leftEyelid.position.y = currentEyelidY;
      rightEyelid.position.y = currentEyelidY;

      // Hide glints when eye is almost fully closed to prevent shining through eyelid
      const showGlint = blinkProgress < 0.75;
      leftGlint.visible = showGlint;
      rightGlint.visible = showGlint;

      // Eyelashes fan ("eye laces") dynamic emotional tilt & blink tracking:
      // Happy: lashes flare upward & outward gracefully
      // Concerned: lashes tilt inward and slightly downward with furrowed brow
      // Blink: lashes sweep down smoothly with upper eyelid without clipping
      const leftLashTiltZ = 0.04 + (0.18 * currentHappy) - (0.14 * currentConcerned) + (0.06 * currentCurious);
      const rightLashTiltZ = -0.04 - (0.18 * currentHappy) + (0.14 * currentConcerned) - (0.06 * currentCurious);
      leftUpperLashGroup.rotation.z = leftLashTiltZ;
      rightUpperLashGroup.rotation.z = rightLashTiltZ;

      const lashLiftY = (0.003 * currentHappy) - (0.002 * currentConcerned) + (0.002 * currentCurious);
      // Lashes sweep downward along with the descending upper eyelid
      leftUpperLashGroup.position.y = (0.006 + lashLiftY) - (blinkProgress * 0.010);
      rightUpperLashGroup.position.y = (0.006 + lashLiftY) - (blinkProgress * 0.010);

      if (blinkProgress > 0) {
        leftUpperLashGroup.rotation.x = -Math.PI * 0.38 * blinkProgress;
        rightUpperLashGroup.rotation.x = -Math.PI * 0.38 * blinkProgress;
      } else {
        leftUpperLashGroup.rotation.x = 0;
        rightUpperLashGroup.rotation.x = 0;
      }

      // Head & eye tracking mouse smoothly
      const lookX = state.mouseNorm.x * 0.35;
      const lookY = state.mouseNorm.y * 0.25;
      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, lookX, 5, delta);
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, -lookY, 5, delta);

      // Pupils micro-gaze tracking + living saccade jumps
      const pupilX = THREE.MathUtils.damp(leftPupil.position.x, (state.mouseNorm.x * 0.005) + saccadeOffsetX, 8, delta);
      const pupilY = THREE.MathUtils.damp(leftPupil.position.y, (state.mouseNorm.y * 0.005) + saccadeOffsetY, 8, delta);
      leftPupil.position.x = pupilX;
      rightPupil.position.x = pupilX;
      leftPupil.position.y = pupilY;
      rightPupil.position.y = pupilY;

      // Eyebrow emotional morphing:
      // Happy: graceful lifted arch
      // Concerned: inner brow raised, outer dipped (distinct furrow of empathy/concern)
      // Thinking: asymmetric arch (one raised, one lowered)
      // Curious: high open arch
      const leftBrowY = 0.176 + (0.007 * currentHappy) + (0.008 * currentConcerned) + (0.012 * currentThinking) + (0.010 * currentCurious);
      const rightBrowY = 0.176 + (0.007 * currentHappy) + (0.008 * currentConcerned) - (0.004 * currentThinking) + (0.010 * currentCurious);
      leftBrow.position.y = leftBrowY;
      rightBrow.position.y = rightBrowY;
      leftBrowGlow.position.y = leftBrowY - 0.004;
      rightBrowGlow.position.y = rightBrowY - 0.004;

      const leftBrowZ = 0.05 + (0.05 * currentHappy) - (0.16 * currentConcerned) + (0.08 * currentThinking) + (0.04 * currentCurious);
      const rightBrowZ = -0.05 - (0.05 * currentHappy) + (0.16 * currentConcerned) - (0.04 * currentThinking) - (0.04 * currentCurious);
      leftBrow.rotation.z = leftBrowZ;
      rightBrow.rotation.z = rightBrowZ;
      leftBrowGlow.rotation.z = leftBrowZ;
      rightBrowGlow.rotation.z = rightBrowZ;

      // Cyber communicator antenna pulse matching emotional state
      const earPulseSpeed = currentHappy > 0.4 ? 6.5 : currentConcerned > 0.4 ? 8.5 : 2.5;
      const earPulse = Math.sin(elapsed * earPulseSpeed);
      leftAntenna.scale.y = 1 + (0.12 * currentCurious) + earPulse * 0.06;
      rightAntenna.scale.y = 1 + (0.12 * currentCurious) + earPulse * 0.06;

      // --- 4. REAL-TIME LIP SYNC & EMOTIONAL MOUTH STATES ---
      // Emotion corner lift & smile curvature
      const smileLift = (0.006 * currentHappy) - (0.005 * currentConcerned);
      const smileCornerRot = (0.32 * currentHappy) - (0.22 * currentConcerned);

      // Upper lip wings (Cupid's bow corners)
      upperLipLeftWing.position.y = 0.001 + smileLift;
      upperLipLeftWing.rotation.z = -0.15 - smileCornerRot;
      upperLipRightWing.position.y = 0.001 + smileLift;
      upperLipRightWing.rotation.z = 0.15 + smileCornerRot;

      // Smile corner commissure nodes
      leftSmileCorner.position.y = 0.001 + smileLift * 1.25;
      rightSmileCorner.position.y = 0.001 + smileLift * 1.25;
      leftSmileCorner.position.x = -0.024 * (1 + 0.14 * currentHappy - 0.1 * currentConcerned);
      rightSmileCorner.position.x = 0.024 * (1 + 0.14 * currentHappy - 0.1 * currentConcerned);

      // Lower lip width, fullness & curvature
      const lowerLipWidth = 2.0 * (1 + 0.22 * currentHappy - 0.14 * currentConcerned - 0.08 * currentThinking);
      lowerLipMesh.scale.x = lowerLipWidth;
      lowerLipMesh.position.y = -0.001 * currentHappy - 0.0035 * currentConcerned;
      lowerLipMesh.position.z = 0.004 * currentConcerned; // empathetic gentle pout in concerned state

      // Lip gloss tone & emissive modulation with emotion
      if (currentHappy > 0.45) {
        lipMat.color.setHex(0xe11d48); // radiant cherry pink
        lipMat.emissive.setHex(0x9f1239);
        lipMat.emissiveIntensity = 0.38;
      } else if (currentConcerned > 0.45) {
        lipMat.color.setHex(0xbe185d); // empathetic gentle mauve
        lipMat.emissive.setHex(0x701a75);
        lipMat.emissiveIntensity = 0.22;
      } else {
        lipMat.color.setHex(0xdf1c44); // classic glossy scarlet
        lipMat.emissive.setHex(0x881337);
        lipMat.emissiveIntensity = 0.28;
      }

      if (state.isSpeaking) {
        const v = state.viseme;
        const openHeight = THREE.MathUtils.lerp(0.002, 0.035, v.mouthOpen);
        const stretchWidth = THREE.MathUtils.lerp(0.85, 1.35, v.mouthWide);

        // Speech viseme modulation superimposed over emotional mouth contour
        upperLip.position.y = (openHeight * 0.45) + (smileLift * 0.5);
        lowerLip.position.y = (-openHeight * 0.45) - (smileLift * 0.2);
        upperLip.scale.x = stretchWidth;
        lowerLip.scale.x = stretchWidth * (1 + 0.14 * currentHappy);

        if (v.mouthOpen > 0.06) {
          oralCavity.visible = true;
          oralCavity.scale.y = THREE.MathUtils.lerp(0.1, 0.85, v.mouthOpen);
          oralCavity.scale.x = stretchWidth * 0.75;
          oralCavity.scale.z = 0.4;
        } else {
          oralCavity.visible = false;
          oralCavity.scale.set(0.001, 0.001, 0.001);
        }

        // Subtle head nod with cadence
        headGroup.rotation.z = Math.sin(elapsed * 5) * 0.03;
      } else {
        // Resting closed mouth: upper & lower lips meet seamlessly with ZERO gap and ZERO dark cavity (no moustache artifact)
        upperLip.position.y = 0.001 + smileLift;
        lowerLip.position.y = -0.001 + (currentConcerned * -0.001);
        upperLip.scale.x = 1.0 + (0.12 * currentHappy) - (0.08 * currentThinking);
        lowerLip.scale.x = 1.0 + (0.15 * currentHappy) - (0.1 * currentConcerned);
        oralCavity.visible = false;
        oralCavity.scale.set(0.001, 0.001, 0.001);
        headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, 0, 5, delta);
      }

      // --- 5. ARTICULATED HAND & BODY GESTURES ---
      holoHudGroup.visible = state.gesture === 'holo_typing';

      switch (state.gesture) {
        case 'wave': {
          // Right arm raised, hand waving back and forth cheerily
          rightShoulderGroup.rotation.z = THREE.MathUtils.damp(rightShoulderGroup.rotation.z, -2.4, 6, delta);
          rightShoulderGroup.rotation.x = THREE.MathUtils.damp(rightShoulderGroup.rotation.x, 0.4, 6, delta);
          rightElbowGroup.rotation.x = THREE.MathUtils.damp(rightElbowGroup.rotation.x, -0.6, 6, delta);
          rightHandGroup.rotation.z = Math.sin(elapsed * 12) * 0.45; // Wave hand back and forth!

          leftShoulderGroup.rotation.z = THREE.MathUtils.damp(leftShoulderGroup.rotation.z, 0.2, 5, delta);
          leftShoulderGroup.rotation.x = THREE.MathUtils.damp(leftShoulderGroup.rotation.x, 0.1, 5, delta);
          break;
        }

        case 'explain': {
          // Both arms open, palms gesturing outward with speech cadence
          const talkWave = Math.sin(elapsed * 4.5);
          rightShoulderGroup.rotation.z = THREE.MathUtils.damp(rightShoulderGroup.rotation.z, -0.7 + talkWave * 0.12, 5, delta);
          rightShoulderGroup.rotation.x = THREE.MathUtils.damp(rightShoulderGroup.rotation.x, 0.5 + talkWave * 0.15, 5, delta);
          rightElbowGroup.rotation.x = THREE.MathUtils.damp(rightElbowGroup.rotation.x, -0.85, 5, delta);
          rightHandGroup.rotation.y = 0.5;

          leftShoulderGroup.rotation.z = THREE.MathUtils.damp(leftShoulderGroup.rotation.z, 0.7 - talkWave * 0.12, 5, delta);
          leftShoulderGroup.rotation.x = THREE.MathUtils.damp(leftShoulderGroup.rotation.x, 0.45 - talkWave * 0.15, 5, delta);
          leftElbowGroup.rotation.x = THREE.MathUtils.damp(leftElbowGroup.rotation.x, -0.8, 5, delta);
          leftHandGroup.rotation.y = -0.5;
          break;
        }

        case 'think': {
          // Right hand brought to chin/temple, head tilted up
          rightShoulderGroup.rotation.z = THREE.MathUtils.damp(rightShoulderGroup.rotation.z, -0.9, 6, delta);
          rightShoulderGroup.rotation.x = THREE.MathUtils.damp(rightShoulderGroup.rotation.x, 1.25, 6, delta);
          rightElbowGroup.rotation.x = THREE.MathUtils.damp(rightElbowGroup.rotation.x, -1.8, 6, delta);
          rightHandGroup.rotation.y = 0.8;

          leftShoulderGroup.rotation.z = THREE.MathUtils.damp(leftShoulderGroup.rotation.z, 0.35, 5, delta);
          leftShoulderGroup.rotation.x = THREE.MathUtils.damp(leftShoulderGroup.rotation.x, 0.1, 5, delta);
          leftElbowGroup.rotation.x = THREE.MathUtils.damp(leftElbowGroup.rotation.x, -0.2, 5, delta);

          headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, 0.15, 4, delta);
          headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, 0.1, 4, delta);
          break;
        }

        case 'holo_typing': {
          // Both arms raised forward, typing rapidly on floating holo HUD
          const leftType = Math.sin(elapsed * 18);
          const rightType = Math.cos(elapsed * 18);

          leftShoulderGroup.rotation.x = THREE.MathUtils.damp(leftShoulderGroup.rotation.x, 0.85, 8, delta);
          leftShoulderGroup.rotation.z = THREE.MathUtils.damp(leftShoulderGroup.rotation.z, 0.3, 8, delta);
          leftElbowGroup.rotation.x = THREE.MathUtils.damp(leftElbowGroup.rotation.x, -1.1 + leftType * 0.1, 10, delta);

          rightShoulderGroup.rotation.x = THREE.MathUtils.damp(rightShoulderGroup.rotation.x, 0.85, 8, delta);
          rightShoulderGroup.rotation.z = THREE.MathUtils.damp(rightShoulderGroup.rotation.z, -0.3, 8, delta);
          rightElbowGroup.rotation.x = THREE.MathUtils.damp(rightElbowGroup.rotation.x, -1.1 + rightType * 0.1, 10, delta);
          break;
        }

        case 'cheer': {
          // Both hands raised celebratory with triumphant body language
          leftShoulderGroup.rotation.z = THREE.MathUtils.damp(leftShoulderGroup.rotation.z, 1.9, 8, delta);
          leftShoulderGroup.rotation.x = THREE.MathUtils.damp(leftShoulderGroup.rotation.x, 0.3, 8, delta);
          leftElbowGroup.rotation.x = THREE.MathUtils.damp(leftElbowGroup.rotation.x, -0.4, 8, delta);

          rightShoulderGroup.rotation.z = THREE.MathUtils.damp(rightShoulderGroup.rotation.z, -1.9, 8, delta);
          rightShoulderGroup.rotation.x = THREE.MathUtils.damp(rightShoulderGroup.rotation.x, 0.3, 8, delta);
          rightElbowGroup.rotation.x = THREE.MathUtils.damp(rightElbowGroup.rotation.x, -0.4, 8, delta);
          break;
        }

        case 'stance_shift': {
          // Deliberate stylish hip tilt & confident hands on hips
          leftShoulderGroup.rotation.z = THREE.MathUtils.damp(leftShoulderGroup.rotation.z, 0.5, 6, delta);
          leftShoulderGroup.rotation.x = THREE.MathUtils.damp(leftShoulderGroup.rotation.x, 0.2, 6, delta);
          leftElbowGroup.rotation.x = THREE.MathUtils.damp(leftElbowGroup.rotation.x, -1.3, 6, delta);
          leftHandGroup.rotation.z = 0.4;

          rightShoulderGroup.rotation.z = THREE.MathUtils.damp(rightShoulderGroup.rotation.z, -0.5, 6, delta);
          rightShoulderGroup.rotation.x = THREE.MathUtils.damp(rightShoulderGroup.rotation.x, 0.2, 6, delta);
          rightElbowGroup.rotation.x = THREE.MathUtils.damp(rightElbowGroup.rotation.x, -1.3, 6, delta);
          rightHandGroup.rotation.z = -0.4;
          break;
        }

        case 'idle':
        default: {
          // Relaxed natural resting pose
          leftShoulderGroup.rotation.z = THREE.MathUtils.damp(leftShoulderGroup.rotation.z, 0.18 + breathe * 0.02, 4, delta);
          leftShoulderGroup.rotation.x = THREE.MathUtils.damp(leftShoulderGroup.rotation.x, 0.05, 4, delta);
          leftElbowGroup.rotation.x = THREE.MathUtils.damp(leftElbowGroup.rotation.x, -0.22, 4, delta);
          leftHandGroup.rotation.z = 0;

          rightShoulderGroup.rotation.z = THREE.MathUtils.damp(rightShoulderGroup.rotation.z, -0.18 - breathe * 0.02, 4, delta);
          rightShoulderGroup.rotation.x = THREE.MathUtils.damp(rightShoulderGroup.rotation.x, 0.05, 4, delta);
          rightElbowGroup.rotation.x = THREE.MathUtils.damp(rightElbowGroup.rotation.x, -0.22, 4, delta);
          rightHandGroup.rotation.z = 0;
          break;
        }
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Click on Avatar: interactive dialogue & reaction
  const handleAvatarClick = () => {
    triggerGesture('wave', 2800);
    const greetings = [
      'Namaste! Main NOVA hoon, aapki AI saathi. Main aapke desktop tasks execute karne ke liye tayyar hoon!',
      'Hello Commander! All neural cores online and ready. How can I assist you right now?',
      'Haanji! Main sun rahi hoon, boliye kaunsa app kholna hai ya kya task karna hai?',
      'Ready to assist! App launching, Google search, and voice control fully primed.',
    ];
    const picked = greetings[Math.floor(Math.random() * greetings.length)];
    setInteractiveBubble(picked);
    onTriggerVoiceGreeting?.(picked);
    setTimeout(() => setInteractiveBubble(null), 5500);
  };

  const currentThemeData = AVATAR_THEMES[activeTheme];

  // Active resolved emotion for telemetry and UI badges
  const effectiveEmotion: AvatarEmotion = manualEmotion
    ? manualEmotion
    : emotion
    ? emotion
    : status === 'ERROR'
    ? 'concerned'
    : status === 'THINKING'
    ? 'thinking'
    : status === 'COMPLETED'
    ? 'happy'
    : isListening
    ? 'curious'
    : viseme?.emotion && ['happy', 'concerned', 'thinking', 'curious', 'neutral'].includes(viseme.emotion.toLowerCase())
    ? (viseme.emotion.toLowerCase() as AvatarEmotion)
    : 'neutral';

  const emotionBadgeConfig: Record<
    AvatarEmotion,
    { label: string; bg: string; text: string; border: string; dot: string; desc: string }
  > = {
    happy: {
      label: 'Happy',
      bg: 'rgba(16, 185, 129, 0.15)',
      text: '#6ee7b7',
      border: 'rgba(52, 211, 153, 0.45)',
      dot: '#10b981',
      desc: 'Squinch eyes, flared lashes, lifted nose tip, smiling Cupid\'s bow',
    },
    neutral: {
      label: 'Neutral',
      bg: 'rgba(59, 130, 246, 0.15)',
      text: '#93c5fd',
      border: 'rgba(96, 165, 250, 0.35)',
      dot: '#3b82f6',
      desc: 'Balanced serene gaze, resting fan lashes, sculpted nose & lips',
    },
    concerned: {
      label: 'Concerned',
      bg: 'rgba(244, 63, 94, 0.18)',
      text: '#fda4af',
      border: 'rgba(251, 113, 133, 0.45)',
      dot: '#f43f5e',
      desc: 'Furrowed brows, focused eyes, pinched nostrils, down-turned pout',
    },
    thinking: {
      label: 'Thinking',
      bg: 'rgba(168, 85, 247, 0.18)',
      text: '#d8b4fe',
      border: 'rgba(192, 132, 252, 0.45)',
      dot: '#a855f7',
      desc: 'Asymmetric arch, micro-gaze shift, pursed lips & antenna pulse',
    },
    curious: {
      label: 'Curious',
      bg: 'rgba(245, 158, 11, 0.18)',
      text: '#fde68a',
      border: 'rgba(251, 191, 36, 0.45)',
      dot: '#f59e0b',
      desc: 'Wide open aperture, high brows, soft parted lips & antenna lift',
    },
  };

  const activeEmotionMeta = emotionBadgeConfig[effectiveEmotion];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between select-none">
      {/* Top Telemetry & Controls Badge */}
      <div className="w-full flex items-center justify-between px-2 pt-1 z-20 font-mono text-[11px]">
        <div className="flex items-center space-x-2">
          <span
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full border bg-slate-950/80 shadow-md backdrop-blur-md"
            style={{ borderColor: `${currentThemeData.primaryCss}50` }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: currentThemeData.primaryCss }}
            />
            <span className="font-semibold text-slate-100">NOVA // 3D FEMALE AI</span>
          </span>

          {/* Active Live Emotion Indicator */}
          <span
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono shadow-sm backdrop-blur-md transition-all duration-300"
            style={{
              borderColor: activeEmotionMeta.border,
              backgroundColor: activeEmotionMeta.bg,
              color: activeEmotionMeta.text,
            }}
            title={activeEmotionMeta.desc}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeEmotionMeta.dot }} />
            <span>EXPRESSION: {activeEmotionMeta.label.toUpperCase()}</span>
          </span>
        </div>

        {/* Switch back to Orb Core mode */}
        {onSwitchToOrb && (
          <button
            type="button"
            onClick={onSwitchToOrb}
            className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 text-[10px] font-mono transition-all flex items-center space-x-1 shadow-sm"
            title="Switch to Orb Core Mode"
          >
            <RefreshCw className="w-3 h-3" />
            <span>ORB MODE</span>
          </button>
        )}
      </div>

      {/* Interactive Speech / Greeting Bubble */}
      {interactiveBubble && (
        <div className="absolute top-10 z-30 max-w-xs px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-cyan-400/50 shadow-[0_0_20px_rgba(0,240,255,0.25)] text-xs text-cyan-200 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="font-sans font-medium leading-relaxed">&ldquo;{interactiveBubble}&rdquo;</p>
        </div>
      )}

      {/* Main 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleAvatarClick}
        className="relative flex-1 w-full min-h-[340px] cursor-pointer flex items-center justify-center overflow-hidden"
        title="Click on NOVA to interact & trigger gesture greeting"
      >
        {/* Subtle Ambient Glow Behind Avatar */}
        <div
          className="absolute w-64 h-64 rounded-full blur-[100px] pointer-events-none -z-10 transition-colors duration-700 opacity-40"
          style={{ background: currentThemeData.glowRgba }}
        />
      </div>

      {/* Ergonomic Bottom Gesture & Emotion Dock */}
      <div className="w-full z-20 px-2 pb-1.5 flex flex-col items-center space-y-1.5">
        {/* Facial Emotion Shift Controls (Happy, Neutral, Concerned, Thinking, Curious) */}
        <div className="w-full flex items-center justify-between px-1 text-[10px] font-mono text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Smile className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-300 font-semibold">FACIAL STATE:</span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: activeEmotionMeta.bg,
                color: activeEmotionMeta.text,
                borderColor: activeEmotionMeta.border,
                borderWidth: '1px',
              }}
            >
              {manualEmotion ? `[MANUAL] ${manualEmotion}` : `[AI AUTO] ${effectiveEmotion}`}
            </span>
          </div>
          {manualEmotion && (
            <button
              type="button"
              onClick={() => setManualEmotion(null)}
              className="text-[9px] text-cyan-400 hover:text-cyan-200 underline font-mono"
            >
              Return to AI Auto
            </button>
          )}
        </div>

        {/* Emotion Switcher Buttons */}
        <div className="w-full flex items-center justify-center flex-wrap gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md shadow-md">
          <button
            type="button"
            onClick={() => setManualEmotion(null)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
              manualEmotion === null
                ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-semibold'
                : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:bg-slate-800'
            }`}
            title="AI automatically drives facial features based on response sentiment & status"
          >
            ⚡ Auto Sync
          </button>
          <button
            type="button"
            onClick={() => setManualEmotion('happy')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
              (manualEmotion === 'happy' || (manualEmotion === null && effectiveEmotion === 'happy'))
                ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
            title="Happy: Joyful squinch eyes, flared upward lashes, lifted nose tip, smiling Cupid's bow lips"
          >
            😊 Happy
          </button>
          <button
            type="button"
            onClick={() => setManualEmotion('neutral')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
              (manualEmotion === 'neutral' || (manualEmotion === null && effectiveEmotion === 'neutral'))
                ? 'bg-sky-500/30 text-sky-200 border-sky-400 font-semibold'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
            title="Neutral: Serene balanced posture, natural fan lashes, sculpted nose & contoured lips"
          >
            😐 Neutral
          </button>
          <button
            type="button"
            onClick={() => setManualEmotion('concerned')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
              (manualEmotion === 'concerned' || (manualEmotion === null && effectiveEmotion === 'concerned'))
                ? 'bg-rose-500/30 text-rose-200 border-rose-400 font-semibold shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
            title="Concerned: Furrowed brows, tense attentive gaze, pinched nostrils, empathetic down-turned pout"
          >
            😟 Concerned
          </button>
          <button
            type="button"
            onClick={() => setManualEmotion('thinking')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
              (manualEmotion === 'thinking' || (manualEmotion === null && effectiveEmotion === 'thinking'))
                ? 'bg-purple-500/30 text-purple-200 border-purple-400 font-semibold'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
            title="Thinking: Inquisitive asymmetric brow, focused gaze, pursed lips & antenna pulse"
          >
            🤔 Thinking
          </button>
          <button
            type="button"
            onClick={() => setManualEmotion('curious')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
              (manualEmotion === 'curious' || (manualEmotion === null && effectiveEmotion === 'curious'))
                ? 'bg-amber-500/30 text-amber-200 border-amber-400 font-semibold'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
            title="Curious: Wide open eyes, arched brows, parted lips & attentive antenna lift"
          >
            😯 Curious
          </button>
        </div>

        {/* Quick Reaction & Gesture Buttons */}
        <div className="w-full flex items-center justify-center flex-wrap gap-1.5 p-1 rounded-xl bg-slate-950/75 border border-cyan-500/20 backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={() => triggerGesture('wave')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all flex items-center space-x-1 border ${
              currentGesture === 'wave'
                ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span>👋 Wave</span>
          </button>

          <button
            type="button"
            onClick={() => triggerGesture('explain')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all flex items-center space-x-1 border ${
              currentGesture === 'explain'
                ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span>💡 Explain</span>
          </button>

          <button
            type="button"
            onClick={() => triggerGesture('think')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all flex items-center space-x-1 border ${
              currentGesture === 'think'
                ? 'bg-purple-500/30 text-purple-200 border-purple-400'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span>🤔 Think</span>
          </button>

          <button
            type="button"
            onClick={() => triggerGesture('stance_shift')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all flex items-center space-x-1 border ${
              currentGesture === 'stance_shift'
                ? 'bg-pink-500/30 text-pink-200 border-pink-400'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span>💃 Stance</span>
          </button>

          <button
            type="button"
            onClick={() => triggerGesture('cheer')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all flex items-center space-x-1 border ${
              currentGesture === 'cheer'
                ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span>🎉 Cheer</span>
          </button>

          <button
            type="button"
            onClick={() => triggerGesture('holo_typing')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all flex items-center space-x-1 border ${
              currentGesture === 'holo_typing'
                ? 'bg-sky-500/30 text-sky-200 border-sky-400'
                : 'bg-slate-900/60 text-slate-300 border-slate-700/50 hover:bg-slate-800'
            }`}
          >
            <span>⚡ Holo-HUD</span>
          </button>
        </div>

        {/* Theme Swatches Selector */}
        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
          <Palette className="w-3 h-3 text-slate-500" />
          <span>SUIT THEME:</span>
          <div className="flex items-center space-x-1.5">
            {(Object.keys(AVATAR_THEMES) as AvatarTheme[]).map((tKey) => {
              const t = AVATAR_THEMES[tKey];
              const isSelected = activeTheme === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => setActiveTheme(tKey)}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    isSelected ? 'scale-125 border-white ring-2 ring-cyan-400/50' : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: t.primaryCss }}
                  title={t.name}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
