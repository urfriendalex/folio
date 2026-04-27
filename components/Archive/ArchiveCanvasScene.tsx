"use client";

import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import type { ArchiveAssetKind, ArchiveEntry } from "@/content/archive/archive-data";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";
import styles from "./ArchiveCanvas.module.scss";

const CHUNK_SIZE = 110;
const RENDER_DISTANCE = 2;
const CHUNK_FADE_MARGIN = 1;
const MAX_VELOCITY = 3.2;
const DEPTH_FADE_START = 140;
const DEPTH_FADE_END = 260;
const INVIS_THRESHOLD = 0.01;
const KEYBOARD_SPEED = 0.18;
const VELOCITY_LERP = 0.16;
const VELOCITY_DECAY = 0.9;
const INITIAL_CAMERA_Z = 50;
const MAX_PLANE_CACHE = 256;
const PIXELS_PER_WORLD_UNIT = 120;
const FALLBACK_WORLD_SIZE = 14;
const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const textureCache = new Map<string, THREE.Texture>();
const loadCallbacks = new Map<string, Set<TextureLoadCallback>>();
const videoElementCache = new Map<string, HTMLVideoElement>();
const planeCache = new Map<string, PlaneData[]>();
const textureLoader = new THREE.TextureLoader();
const centerRaycaster = new THREE.Raycaster();
const centerNdc = new THREE.Vector2(0, 0);

const KEYBOARD_MAP: Array<{ name: KeyboardKey; keys: string[] }> = [
  { name: "forward", keys: ["w", "W", "ArrowUp"] },
  { name: "backward", keys: ["s", "S", "ArrowDown"] },
  { name: "left", keys: ["a", "A", "ArrowLeft"] },
  { name: "right", keys: ["d", "D", "ArrowRight"] },
  { name: "up", keys: ["e", "E"] },
  { name: "down", keys: ["q", "Q"] },
];

type ArchiveMediaItem = {
  url: string;
  width: number;
  height: number;
  kind: ArchiveAssetKind;
  label: string;
};

type KeyboardKey = "forward" | "backward" | "left" | "right" | "up" | "down";

type ChunkData = {
  key: string;
  cx: number;
  cy: number;
  cz: number;
};

type ChunkOffset = {
  dx: number;
  dy: number;
  dz: number;
  dist: number;
};

type PlaneData = {
  id: string;
  position: THREE.Vector3;
  mediaIndex: number;
  chunkX: number;
  chunkY: number;
  chunkZ: number;
};

type CameraGridState = {
  cx: number;
  cy: number;
  cz: number;
  camZ: number;
};

type ControllerState = {
  velocity: { x: number; y: number; z: number };
  targetVel: { x: number; y: number; z: number };
  basePos: { x: number; y: number; z: number };
  drift: { x: number; y: number };
  mouse: { x: number; y: number };
  lastMouse: { x: number; y: number };
  scrollAccum: number;
  isDragging: boolean;
  lastTouches: Touch[];
  lastTouchDist: number;
  lastChunkKey: string;
  lastChunkUpdate: number;
  pendingChunk: { cx: number; cy: number; cz: number } | null;
};

type SceneLoadState = {
  active: boolean;
  loaded: number;
  total: number;
};

type ArchiveCanvasSceneProps = {
  items: ArchiveEntry[];
  onSceneLoadStateChange?: (state: SceneLoadState) => void;
  onHoverLabelChange: (label: string | null) => void;
  onFocusLabelChange: (label: string | null) => void;
};

type TextureLoadResult =
  | { status: "loaded"; texture: THREE.Texture }
  | { status: "error" };

type TextureLoadCallback = (result: TextureLoadResult) => void;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 9999) * 10000;
  return value - Math.floor(value);
}

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function getTouchDistance(touches: Touch[]) {
  if (touches.length < 2) {
    return 0;
  }

  const [firstTouch, secondTouch] = touches;

  if (!firstTouch || !secondTouch) {
    return 0;
  }

  return Math.hypot(
    firstTouch.clientX - secondTouch.clientX,
    firstTouch.clientY - secondTouch.clientY,
  );
}

function createInitialState(cameraZ: number): ControllerState {
  return {
    velocity: { x: 0, y: 0, z: 0 },
    targetVel: { x: 0, y: 0, z: 0 },
    basePos: { x: 0, y: 0, z: cameraZ },
    drift: { x: 0, y: 0 },
    mouse: { x: 0, y: 0 },
    lastMouse: { x: 0, y: 0 },
    scrollAccum: 0,
    isDragging: false,
    lastTouches: [],
    lastTouchDist: 0,
    lastChunkKey: "",
    lastChunkUpdate: 0,
    pendingChunk: null,
  };
}

function getChunkUpdateThrottleMs(isZooming: boolean, zoomSpeed: number) {
  if (zoomSpeed > 1) {
    return 500;
  }

  if (isZooming) {
    return 400;
  }

  return 100;
}

function shouldThrottleUpdate(lastUpdateTime: number, throttleMs: number, currentTime: number) {
  return currentTime - lastUpdateTime >= throttleMs;
}

function touchPlaneCache(key: string) {
  const cached = planeCache.get(key);

  if (!cached) {
    return;
  }

  planeCache.delete(key);
  planeCache.set(key, cached);
}

function evictPlaneCache() {
  while (planeCache.size > MAX_PLANE_CACHE) {
    const firstKey = planeCache.keys().next().value;

    if (!firstKey) {
      break;
    }

    planeCache.delete(firstKey);
  }
}

function generateChunkPlanes(cx: number, cy: number, cz: number) {
  const planes: PlaneData[] = [];
  const seed = hashString(`${cx},${cy},${cz}`);

  for (let index = 0; index < 5; index += 1) {
    const baseSeed = seed + index * 1000;
    const random = (step: number) => seededRandom(baseSeed + step);

    planes.push({
      id: `${cx}-${cy}-${cz}-${index}`,
      position: new THREE.Vector3(
        cx * CHUNK_SIZE + random(0) * CHUNK_SIZE,
        cy * CHUNK_SIZE + random(1) * CHUNK_SIZE,
        cz * CHUNK_SIZE + random(2) * CHUNK_SIZE,
      ),
      mediaIndex: Math.floor(random(5) * 1_000_000),
      chunkX: cx,
      chunkY: cy,
      chunkZ: cz,
    });
  }

  return planes;
}

function generateChunkPlanesCached(cx: number, cy: number, cz: number) {
  const key = `${cx},${cy},${cz}`;
  const cached = planeCache.get(key);

  if (cached) {
    touchPlaneCache(key);
    return cached;
  }

  const planes = generateChunkPlanes(cx, cy, cz);
  planeCache.set(key, planes);
  evictPlaneCache();
  return planes;
}

function isTextureLoaded(texture: THREE.Texture) {
  const image = texture.image as HTMLImageElement | HTMLVideoElement | undefined;

  if (image instanceof HTMLVideoElement) {
    return image.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && image.videoWidth > 0;
  }

  return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
}

function applyImageTextureSettings(texture: THREE.Texture) {
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  const coarsePointer =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  texture.anisotropy = coarsePointer ? 2 : 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
}

function applyVideoTextureSettings(texture: THREE.Texture) {
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
}

function notifyTextureLoaded(key: string, texture: THREE.Texture) {
  loadCallbacks.get(key)?.forEach((callback) => {
    callback({ status: "loaded", texture });
  });
  loadCallbacks.delete(key);
}

function notifyTextureError(key: string) {
  loadCallbacks.get(key)?.forEach((callback) => {
    callback({ status: "error" });
  });
  loadCallbacks.delete(key);
  textureCache.delete(key);
  videoElementCache.delete(key);
}

function ensureVideoPlayback(video: HTMLVideoElement) {
  const startPlayback = () => {
    const playAttempt = video.play();

    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {
        // Ignore autoplay rejections; retry on user gesture below.
      });
    }
  };

  startPlayback();

  if (typeof window === "undefined") {
    return;
  }

  const resumePlayback = () => {
    startPlayback();
    window.removeEventListener("pointerdown", resumePlayback);
    window.removeEventListener("touchstart", resumePlayback);
    window.removeEventListener("keydown", resumePlayback);
  };

  window.addEventListener("pointerdown", resumePlayback, { once: true });
  window.addEventListener("touchstart", resumePlayback, { once: true });
  window.addEventListener("keydown", resumePlayback, { once: true });
}

function getTexture(item: ArchiveMediaItem, onLoad?: TextureLoadCallback) {
  const key = item.url;
  const existing = textureCache.get(key);

  if (existing) {
    if (onLoad) {
      if (isTextureLoaded(existing)) {
        onLoad({ status: "loaded", texture: existing });
      } else {
        loadCallbacks.get(key)?.add(onLoad);
      }
    }

    return existing;
  }

  const callbacks = new Set<TextureLoadCallback>();

  if (onLoad) {
    callbacks.add(onLoad);
  }

  loadCallbacks.set(key, callbacks);

  if (item.kind === "video") {
    const video = document.createElement("video");

    video.src = key;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.autoplay = true;
    video.disablePictureInPicture = true;

    const texture = new THREE.VideoTexture(video);

    applyVideoTextureSettings(texture);

    const handleLoaded = () => {
      applyVideoTextureSettings(texture);
      ensureVideoPlayback(video);
      notifyTextureLoaded(key, texture);
    };
    const handleError = () => {
      console.error("Video load failed:", key);
      notifyTextureError(key);
    };

    video.addEventListener("loadeddata", handleLoaded, { once: true });
    video.addEventListener("canplay", handleLoaded, { once: true });
    video.addEventListener("error", handleError, { once: true });

    textureCache.set(key, texture);
    videoElementCache.set(key, video);

    video.load();
    ensureVideoPlayback(video);

    return texture;
  }

  const texture = textureLoader.load(
    key,
    (nextTexture: THREE.Texture) => {
      applyImageTextureSettings(nextTexture);
      notifyTextureLoaded(key, nextTexture);
    },
    undefined,
    (error: unknown) => {
      console.error("Texture load failed:", key, error);
      notifyTextureError(key);
    },
  );

  textureCache.set(key, texture);
  return texture;
}

function getDisplayScale(media: ArchiveMediaItem) {
  if (media.width > 0 && media.height > 0) {
    return new THREE.Vector3(
      media.width / PIXELS_PER_WORLD_UNIT,
      media.height / PIXELS_PER_WORLD_UNIT,
      1,
    );
  }

  return new THREE.Vector3(FALLBACK_WORLD_SIZE, FALLBACK_WORLD_SIZE, 1);
}

function MediaPlane({
  plane,
  media,
  cameraGridRef,
  onHoverLabelChange,
  placeholderColor,
  pointerHoverForLabel,
}: {
  plane: PlaneData;
  media: ArchiveMediaItem;
  cameraGridRef: MutableRefObject<CameraGridState>;
  onHoverLabelChange: (label: string | null) => void;
  placeholderColor: string;
  pointerHoverForLabel: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const localState = useRef({ opacity: 0, frame: 0, ready: false });
  const [, forceRender] = useState(0);
  const texture = useMemo(() => getTexture(media), [media]);
  const isReady = isTextureLoaded(texture);

  useFrame(() => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    const state = localState.current;

    if (!material || !mesh) {
      return;
    }

    state.frame = (state.frame + 1) & 1;

    if (state.opacity < INVIS_THRESHOLD && !mesh.visible && state.frame === 0) {
      return;
    }

    const cameraGrid = cameraGridRef.current;
    const distance = Math.max(
      Math.abs(plane.chunkX - cameraGrid.cx),
      Math.abs(plane.chunkY - cameraGrid.cy),
      Math.abs(plane.chunkZ - cameraGrid.cz),
    );
    const absoluteDepth = Math.abs(plane.position.z - cameraGrid.camZ);

    if (absoluteDepth > DEPTH_FADE_END + 50) {
      state.opacity = 0;
      material.opacity = 0;
      material.depthWrite = false;
      mesh.visible = false;
      return;
    }

    const gridFade =
      distance <= RENDER_DISTANCE
        ? 1
        : Math.max(
            0,
            1 - (distance - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.0001),
          );

    const depthFade =
      absoluteDepth <= DEPTH_FADE_START
        ? 1
        : Math.max(
            0,
            1 -
              (absoluteDepth - DEPTH_FADE_START) /
                Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.0001),
          );

    const targetOpacity = Math.min(gridFade, depthFade * depthFade);

    state.opacity =
      targetOpacity < INVIS_THRESHOLD && state.opacity < INVIS_THRESHOLD
        ? 0
        : lerp(state.opacity, targetOpacity, 0.18);

    const visibleOpacity = state.ready ? state.opacity : state.opacity * 0.24;
    const isFullyOpaque = state.ready && visibleOpacity > 0.99;

    material.opacity = isFullyOpaque ? 1 : visibleOpacity;
    material.depthWrite = isFullyOpaque;
    mesh.visible = visibleOpacity > INVIS_THRESHOLD;
  });

  const displayScale = useMemo(() => {
    return getDisplayScale(media);
  }, [media]);

  useEffect(() => {
    let isCancelled = false;
    const state = localState.current;

    state.opacity = 0;
    state.ready = isReady;

    const material = materialRef.current;

    if (material) {
      material.opacity = 0;
      material.depthWrite = false;
      material.map = null;
      material.color.set(placeholderColor);
    }

    if (!isReady) {
      getTexture(media, (result) => {
        if (isCancelled) {
          return;
        }

        if (result.status !== "loaded") {
          return;
        }

        state.ready = true;
        forceRender((value) => value + 1);
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [forceRender, isReady, media, placeholderColor]);

  useEffect(() => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    const state = localState.current;

    if (!material || !mesh) {
      return;
    }

    mesh.scale.copy(displayScale);

    if (!texture || !isReady || !state.ready) {
      material.map = null;
      material.color.set(placeholderColor);
      material.needsUpdate = true;
      return;
    }

    material.map = texture;
    material.color.set("#ffffff");
    material.opacity = state.opacity;
    material.depthWrite = state.opacity >= 1;
    material.needsUpdate = true;
  }, [displayScale, isReady, placeholderColor, texture]);

  return (
    <mesh
      ref={meshRef}
      position={plane.position}
      scale={displayScale}
      visible={false}
      geometry={PLANE_GEOMETRY}
      userData={{ archiveImageLabel: media.label }}
      onPointerEnter={() => {
        if (!pointerHoverForLabel || !localState.current.ready) {
          return;
        }

        onHoverLabelChange(media.label);
      }}
      onPointerLeave={() => {
        if (!pointerHoverForLabel) {
          return;
        }

        onHoverLabelChange(null);
      }}
    >
      <meshBasicMaterial ref={materialRef} transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Chunk({
  cx,
  cy,
  cz,
  media,
  cameraGridRef,
  onHoverLabelChange,
  placeholderColor,
  pointerHoverForLabel,
}: {
  cx: number;
  cy: number;
  cz: number;
  media: ArchiveMediaItem[];
  cameraGridRef: MutableRefObject<CameraGridState>;
  onHoverLabelChange: (label: string | null) => void;
  placeholderColor: string;
  pointerHoverForLabel: boolean;
}) {
  const [planes, setPlanes] = useState<PlaneData[] | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const run = () => {
      if (!isCancelled) {
        setPlanes(generateChunkPlanesCached(cx, cy, cz));
      }
    };

    if (typeof requestIdleCallback !== "undefined") {
      const idleId = requestIdleCallback(run, { timeout: 100 });

      return () => {
        isCancelled = true;
        cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(run, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [cx, cy, cz]);

  if (!planes) {
    return null;
  }

  return (
    <group>
      {planes.map((plane) => {
        const mediaItem = media[plane.mediaIndex % media.length];

        if (!mediaItem) {
          return null;
        }

        return (
          <MediaPlane
            key={plane.id}
            plane={plane}
            media={mediaItem}
            cameraGridRef={cameraGridRef}
            onHoverLabelChange={onHoverLabelChange}
            placeholderColor={placeholderColor}
            pointerHoverForLabel={pointerHoverForLabel}
          />
        );
      })}
    </group>
  );
}

function SceneController({
  media,
  onHoverLabelChange,
  onFocusLabelChange,
  placeholderColor,
}: {
  media: ArchiveMediaItem[];
  onHoverLabelChange: (label: string | null) => void;
  onFocusLabelChange: (label: string | null) => void;
  placeholderColor: string;
}) {
  const { camera, gl, scene } = useThree();
  const isTouchDevice = useIsTouchDevice();
  const lastFocusLabelRef = useRef<string | null>(null);
  const [, getKeys] = useKeyboardControls<KeyboardKey>();
  const state = useRef<ControllerState>(createInitialState(INITIAL_CAMERA_Z));
  const cameraGridRef = useRef<CameraGridState>({
    cx: 0,
    cy: 0,
    cz: 0,
    camZ: INITIAL_CAMERA_Z,
  });
  const [chunks, setChunks] = useState<ChunkData[]>(() =>
    CHUNK_OFFSETS.map((offset) => ({
      key: `${offset.dx},${offset.dy},${offset.dz}`,
      cx: offset.dx,
      cy: offset.dy,
      cz: offset.dz,
    })),
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseDown = (event: MouseEvent) => {
      const currentState = state.current;
      currentState.isDragging = true;
      currentState.lastMouse = { x: event.clientX, y: event.clientY };
      onHoverLabelChange(null);
    };

    const onMouseUp = () => {
      state.current.isDragging = false;
    };

    const onMouseLeave = () => {
      state.current.mouse = { x: 0, y: 0 };
      state.current.isDragging = false;
      onHoverLabelChange(null);
    };

    const onMouseMove = (event: MouseEvent) => {
      const currentState = state.current;

      currentState.mouse = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      };

      if (!currentState.isDragging) {
        return;
      }

      currentState.targetVel.x -= (event.clientX - currentState.lastMouse.x) * 0.025;
      currentState.targetVel.y += (event.clientY - currentState.lastMouse.y) * 0.025;
      currentState.lastMouse = { x: event.clientX, y: event.clientY };
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      state.current.scrollAccum += event.deltaY * 0.006;
    };

    const onTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      const currentState = state.current;

      currentState.lastTouches = Array.from(event.touches);
      currentState.lastTouchDist = getTouchDistance(currentState.lastTouches);
      onHoverLabelChange(null);
    };

    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      const currentState = state.current;
      const touches = Array.from(event.touches);

      if (touches.length === 1 && currentState.lastTouches.length >= 1) {
        const [touch] = touches;
        const [lastTouch] = currentState.lastTouches;

        if (touch && lastTouch) {
          currentState.targetVel.x -= (touch.clientX - lastTouch.clientX) * 0.02;
          currentState.targetVel.y += (touch.clientY - lastTouch.clientY) * 0.02;
        }
      } else if (touches.length === 2 && currentState.lastTouchDist > 0) {
        const distance = getTouchDistance(touches);
        currentState.scrollAccum += (currentState.lastTouchDist - distance) * 0.006;
        currentState.lastTouchDist = distance;
      }

      currentState.lastTouches = touches;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const currentState = state.current;
      currentState.lastTouches = Array.from(event.touches);
      currentState.lastTouchDist = getTouchDistance(currentState.lastTouches);
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [gl, onHoverLabelChange]);

  useEffect(() => {
    if (isTouchDevice) {
      return;
    }

    lastFocusLabelRef.current = null;
    onFocusLabelChange(null);
  }, [isTouchDevice, onFocusLabelChange]);

  useFrame(() => {
    const currentState = state.current;
    const now = performance.now();
    const { forward, backward, left, right, up, down } = getKeys();

    if (forward) {
      currentState.targetVel.z -= KEYBOARD_SPEED;
    }

    if (backward) {
      currentState.targetVel.z += KEYBOARD_SPEED;
    }

    if (left) {
      currentState.targetVel.x -= KEYBOARD_SPEED;
    }

    if (right) {
      currentState.targetVel.x += KEYBOARD_SPEED;
    }

    if (down) {
      currentState.targetVel.y -= KEYBOARD_SPEED;
    }

    if (up) {
      currentState.targetVel.y += KEYBOARD_SPEED;
    }

    const isZooming = Math.abs(currentState.velocity.z) > 0.05;
    const zoomFactor = clamp(currentState.basePos.z / INITIAL_CAMERA_Z, 0.3, 2);
    const driftAmount = 8 * zoomFactor;
    const driftLerp = isZooming ? 0.2 : 0.12;

    if (currentState.isDragging) {
      // Preserve the current drift while dragging, matching the reference interaction.
    } else if (isTouchDevice) {
      currentState.drift.x = lerp(currentState.drift.x, 0, driftLerp);
      currentState.drift.y = lerp(currentState.drift.y, 0, driftLerp);
    } else {
      currentState.drift.x = lerp(
        currentState.drift.x,
        currentState.mouse.x * driftAmount,
        driftLerp,
      );
      currentState.drift.y = lerp(
        currentState.drift.y,
        currentState.mouse.y * driftAmount,
        driftLerp,
      );
    }

    currentState.targetVel.z += currentState.scrollAccum;
    currentState.scrollAccum *= 0.8;

    currentState.targetVel.x = clamp(currentState.targetVel.x, -MAX_VELOCITY, MAX_VELOCITY);
    currentState.targetVel.y = clamp(currentState.targetVel.y, -MAX_VELOCITY, MAX_VELOCITY);
    currentState.targetVel.z = clamp(currentState.targetVel.z, -MAX_VELOCITY, MAX_VELOCITY);

    currentState.velocity.x = lerp(
      currentState.velocity.x,
      currentState.targetVel.x,
      VELOCITY_LERP,
    );
    currentState.velocity.y = lerp(
      currentState.velocity.y,
      currentState.targetVel.y,
      VELOCITY_LERP,
    );
    currentState.velocity.z = lerp(
      currentState.velocity.z,
      currentState.targetVel.z,
      VELOCITY_LERP,
    );

    currentState.basePos.x += currentState.velocity.x;
    currentState.basePos.y += currentState.velocity.y;
    currentState.basePos.z += currentState.velocity.z;

    camera.position.set(
      currentState.basePos.x + currentState.drift.x,
      currentState.basePos.y + currentState.drift.y,
      currentState.basePos.z,
    );

    currentState.targetVel.x *= VELOCITY_DECAY;
    currentState.targetVel.y *= VELOCITY_DECAY;
    currentState.targetVel.z *= VELOCITY_DECAY;

    const cx = Math.floor(currentState.basePos.x / CHUNK_SIZE);
    const cy = Math.floor(currentState.basePos.y / CHUNK_SIZE);
    const cz = Math.floor(currentState.basePos.z / CHUNK_SIZE);

    cameraGridRef.current = {
      cx,
      cy,
      cz,
      camZ: currentState.basePos.z,
    };

    const chunkKey = `${cx},${cy},${cz}`;

    if (chunkKey !== currentState.lastChunkKey) {
      currentState.pendingChunk = { cx, cy, cz };
      currentState.lastChunkKey = chunkKey;
    }

    const throttleMs = getChunkUpdateThrottleMs(isZooming, Math.abs(currentState.velocity.z));

    if (
      currentState.pendingChunk &&
      shouldThrottleUpdate(currentState.lastChunkUpdate, throttleMs, now)
    ) {
      const { cx: nextCx, cy: nextCy, cz: nextCz } = currentState.pendingChunk;

      currentState.pendingChunk = null;
      currentState.lastChunkUpdate = now;

      setChunks(
        CHUNK_OFFSETS.map((offset) => ({
          key: `${nextCx + offset.dx},${nextCy + offset.dy},${nextCz + offset.dz}`,
          cx: nextCx + offset.dx,
          cy: nextCy + offset.dy,
          cz: nextCz + offset.dz,
        })),
      );
    }

    if (isTouchDevice) {
      centerRaycaster.setFromCamera(centerNdc, camera);
      const hits = centerRaycaster.intersectObjects(scene.children, true);
      const labelHit = hits.find(
        (h) => typeof h.object.userData?.archiveImageLabel === "string",
      );
      const nextLabel = (labelHit?.object.userData?.archiveImageLabel as string) ?? null;

      if (lastFocusLabelRef.current !== nextLabel) {
        lastFocusLabelRef.current = nextLabel;
        onFocusLabelChange(nextLabel);
      }
    }
  });

  useEffect(() => {
    state.current = createInitialState(INITIAL_CAMERA_Z);
    camera.position.set(0, 0, INITIAL_CAMERA_Z);
    cameraGridRef.current = { cx: 0, cy: 0, cz: 0, camZ: INITIAL_CAMERA_Z };
  }, [camera]);

  return (
    <>
      {chunks.map((chunk) => (
        <Chunk
          key={chunk.key}
          cx={chunk.cx}
          cy={chunk.cy}
          cz={chunk.cz}
          media={media}
          cameraGridRef={cameraGridRef}
          onHoverLabelChange={onHoverLabelChange}
          placeholderColor={placeholderColor}
          pointerHoverForLabel={!isTouchDevice}
        />
      ))}
    </>
  );
}

const CHUNK_OFFSETS: ChunkOffset[] = (() => {
  const maxDistance = RENDER_DISTANCE + CHUNK_FADE_MARGIN;
  const offsets: ChunkOffset[] = [];

  for (let dx = -maxDistance; dx <= maxDistance; dx += 1) {
    for (let dy = -maxDistance; dy <= maxDistance; dy += 1) {
      for (let dz = -maxDistance; dz <= maxDistance; dz += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));

        if (distance > maxDistance) {
          continue;
        }

        offsets.push({
          dx,
          dy,
          dz,
          dist: distance,
        });
      }
    }
  }

  return offsets;
})();

function getInitialPreloadMedia(media: ArchiveMediaItem[]) {
  if (!media.length) {
    return [];
  }

  const preloadItems = new Map<string, ArchiveMediaItem>();

  CHUNK_OFFSETS.forEach((offset) => {
    if (offset.dist > RENDER_DISTANCE) {
      return;
    }

    generateChunkPlanesCached(offset.dx, offset.dy, offset.dz).forEach((plane) => {
      const mediaItem = media[plane.mediaIndex % media.length];

      if (mediaItem) {
        preloadItems.set(mediaItem.url, mediaItem);
      }
    });
  });

  return Array.from(preloadItems.values());
}

function ArchiveWebglGpuDiagnostics() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const ctx = gl.getContext();

    if (!ctx || !("getParameter" in ctx)) {
      return;
    }

    try {
      void ctx.getParameter(ctx.VENDOR);
      void ctx.getParameter(ctx.RENDERER);
    } catch {
      // ignore
    }
  }, [gl]);

  return null;
}

export function ArchiveCanvasScene({
  items,
  onHoverLabelChange,
  onFocusLabelChange,
  onSceneLoadStateChange,
}: ArchiveCanvasSceneProps) {
  const isTouchDevice = useIsTouchDevice();
  const [sceneBackground, setSceneBackground] = useState("#f7f6f2");
  const [placeholderColor, setPlaceholderColor] = useState("#101010");
  const media = useMemo<ArchiveMediaItem[]>(
    () =>
      items.map((item) => ({
        url: item.image,
        width: item.width,
        height: item.height,
        kind: item.kind,
        label: item.image,
      })),
    [items],
  );
  const initialPreloadMedia = useMemo(() => getInitialPreloadMedia(media), [media]);
  const dpr = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    isTouchDevice ? 1.1 : 1.35,
  );

  useEffect(() => {
    const root = document.documentElement;
    const syncSceneColors = () => {
      const nextBackground = getComputedStyle(root).getPropertyValue("--bg-color").trim();
      const nextPlaceholderColor = getComputedStyle(root).getPropertyValue("--fg-color").trim();

      if (nextBackground) {
        setSceneBackground(nextBackground);
      }

      if (nextPlaceholderColor) {
        setPlaceholderColor(nextPlaceholderColor);
      }
    };

    syncSceneColors();

    const observer = new MutationObserver(() => {
      syncSceneColors();
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!onSceneLoadStateChange) {
      return;
    }

    if (!initialPreloadMedia.length) {
      onSceneLoadStateChange({ active: false, loaded: 0, total: 0 });
      return;
    }

    let isCancelled = false;
    const settled = new Set<string>();
    const total = initialPreloadMedia.length;
    const publishState = () => {
      if (!isCancelled) {
        onSceneLoadStateChange({
          active: settled.size < total,
          loaded: settled.size,
          total,
        });
      }
    };
    const markSettled = (url: string) => {
      if (settled.has(url)) {
        return;
      }

      settled.add(url);
      publishState();
    };

    publishState();

    initialPreloadMedia.forEach((item) => {
      const texture = getTexture(item, () => {
        markSettled(item.url);
      });

      if (isTextureLoaded(texture)) {
        markSettled(item.url);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [initialPreloadMedia, onSceneLoadStateChange]);

  if (!media.length) {
    return <div className={styles.scene} aria-hidden="true" />;
  }

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <div className={styles.scene}>
        <Canvas
          camera={{ position: [0, 0, INITIAL_CAMERA_Z], fov: 60, near: 1, far: 500 }}
          className={styles.sceneCanvas}
          dpr={dpr}
          flat
          gl={{
            alpha: false,
            antialias: false,
            depth: true,
            powerPreference: "high-performance",
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            stencil: false,
          }}
          onCreated={({ gl }) => {
            gl.xr.enabled = false;
            gl.shadowMap.enabled = false;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <ArchiveWebglGpuDiagnostics />
          <color attach="background" args={[sceneBackground]} />
          <fog attach="fog" args={[sceneBackground, 120, 320]} />
          <SceneController
            media={media}
            onHoverLabelChange={onHoverLabelChange}
            onFocusLabelChange={onFocusLabelChange}
            placeholderColor={placeholderColor}
          />
        </Canvas>
      </div>
    </KeyboardControls>
  );
}
