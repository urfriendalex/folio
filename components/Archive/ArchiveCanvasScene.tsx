"use client";

import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
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
const TOUCH_DRAG_SPEED = 0.02;
const MOBILE_TOUCH_DRAG_MULTIPLIER = 1.3;
const INITIAL_CAMERA_Z = 50;
/** Must match `<Canvas camera={{ fov: … }}>` below so click-to-focus framing stays accurate. */
const ARCHIVE_CAMERA_FOV = 85;
const ARCHIVE_FOCUS_VIEWPORT_FILL = 0.33;
/** Multiplier on computed click-focus distance (<1 = closer / larger on screen). 0.65 ⇒ 35% closer. */
const ARCHIVE_FOCUS_CLICK_DISTANCE_SCALE = 0.65;
const ARCHIVE_FOCUS_LAMBDA = 4.35;
const ARCHIVE_FOCUS_MIN_PLANE_DISTANCE = 14;
const ARCHIVE_FOCUS_MAX_PLANE_DISTANCE = 240;
const ARCHIVE_FOCUS_COMPLETE_TOL = 0.075;
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
const clickRaycaster = new THREE.Raycaster();
/** Treat as tap/click when the pointer moved less than this between down and up (screen px). */
const ARCHIVE_IMAGE_TAP_MAX_MOVE_PX = 12;
const archiveImageCenterScratch = new THREE.Vector3();
const archiveFocusBounds = new THREE.Box3();
const archiveFocusSize = new THREE.Vector3();

function archiveDistanceForViewportFill(
  planeWorldWidth: number,
  planeWorldHeight: number,
  viewportAspect: number,
): number {
  const tanHalfV = Math.tan((ARCHIVE_CAMERA_FOV * Math.PI) / 360);
  const denomBase = 2 * ARCHIVE_FOCUS_VIEWPORT_FILL * tanHalfV;
  const dFromH = planeWorldHeight / denomBase;
  const dFromW = planeWorldWidth / Math.max(denomBase * viewportAspect, 1e-6);

  const rawD = Math.max(dFromH, dFromW) * ARCHIVE_FOCUS_CLICK_DISTANCE_SCALE;

  return clamp(rawD, ARCHIVE_FOCUS_MIN_PLANE_DISTANCE, ARCHIVE_FOCUS_MAX_PLANE_DISTANCE);
}

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

function getDisplayScaleFromPixelSize(width: number, height: number) {
  if (width > 0 && height > 0) {
    return new THREE.Vector3(
      width / PIXELS_PER_WORLD_UNIT,
      height / PIXELS_PER_WORLD_UNIT,
      1,
    );
  }

  return new THREE.Vector3(FALLBACK_WORLD_SIZE, FALLBACK_WORLD_SIZE, 1);
}

function readIntrinsicPixelSize(texture: THREE.Texture) {
  const image = texture.image as HTMLImageElement | HTMLVideoElement | undefined;

  if (!image) {
    return null;
  }

  if (image instanceof HTMLVideoElement) {
    const width = image.videoWidth;
    const height = image.videoHeight;

    if (width > 0 && height > 0) {
      return { width, height };
    }

    return null;
  }

  if (image instanceof HTMLImageElement) {
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    if (width > 0 && height > 0) {
      return { width, height };
    }

    return null;
  }

  return null;
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
  cameraGridRef: RefObject<CameraGridState>;
  onHoverLabelChange: (label: string | null) => void;
  placeholderColor: string;
  pointerHoverForLabel: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const localState = useRef({ opacity: 0, frame: 0, ready: false });
  const [, forceRender] = useState(0);
  const [intrinsicSize, setIntrinsicSize] = useState<{ width: number; height: number } | null>(null);
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
    const width = intrinsicSize?.width ?? media.width;
    const height = intrinsicSize?.height ?? media.height;

    return getDisplayScaleFromPixelSize(width, height);
  }, [intrinsicSize, media.height, media.width]);

  useEffect(() => {
    setIntrinsicSize(null);
  }, [media.url]);

  useEffect(() => {
    if (!texture || !isReady) {
      return;
    }

    const nextIntrinsic = readIntrinsicPixelSize(texture);

    if (nextIntrinsic) {
      setIntrinsicSize((previous) => {
        if (
          previous &&
          previous.width === nextIntrinsic.width &&
          previous.height === nextIntrinsic.height
        ) {
          return previous;
        }

        return nextIntrinsic;
      });
    }
  }, [isReady, texture]);

  useEffect(() => {
    const image = texture?.image;

    if (!(image instanceof HTMLVideoElement)) {
      return;
    }

    const syncFromVideo = () => {
      const width = image.videoWidth;
      const height = image.videoHeight;

      if (width > 0 && height > 0) {
        setIntrinsicSize((previous) => {
          if (
            previous &&
            previous.width === width &&
            previous.height === height
          ) {
            return previous;
          }

          return { width, height };
        });
      }
    };

    syncFromVideo();
    image.addEventListener("loadedmetadata", syncFromVideo);

    return () => {
      image.removeEventListener("loadedmetadata", syncFromVideo);
    };
  }, [texture]);

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
  cameraGridRef: RefObject<CameraGridState>;
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
  const touchDragSpeed = isTouchDevice
    ? TOUCH_DRAG_SPEED * MOBILE_TOUCH_DRAG_MULTIPLIER
    : TOUCH_DRAG_SPEED;
  const lastFocusLabelRef = useRef<string | null>(null);
  const [, getKeys] = useKeyboardControls<KeyboardKey>();
  const state = useRef<ControllerState>(createInitialState(INITIAL_CAMERA_Z));
  const cameraGridRef = useRef<CameraGridState>({
    cx: 0,
    cy: 0,
    cz: 0,
    camZ: INITIAL_CAMERA_Z,
  });
  const tapGestureRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    maxMoveSq: 0,
  });
  const isTouchDeviceRef = useRef(isTouchDevice);
  isTouchDeviceRef.current = isTouchDevice;
  const desktopImageFocusRef = useRef<{
    active: boolean;
    goalX: number;
    goalY: number;
    goalZ: number;
  }>({ active: false, goalX: 0, goalY: 0, goalZ: INITIAL_CAMERA_Z });
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
    const tapThresholdSq = ARCHIVE_IMAGE_TAP_MAX_MOVE_PX * ARCHIVE_IMAGE_TAP_MAX_MOVE_PX;

    const tryCenterOnArchiveImage = (clientX: number, clientY: number) => {
      if (isTouchDeviceRef.current) {
        return;
      }

      const rect = canvas.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      clickRaycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = clickRaycaster.intersectObjects(scene.children, true);
      const hit = hits.find((h) => typeof h.object.userData?.archiveImageLabel === "string");

      if (!hit) {
        return;
      }

      hit.object.updateWorldMatrix(true, false);
      archiveFocusBounds.setFromObject(hit.object);
      archiveFocusBounds.getSize(archiveFocusSize);

      const planeH = Math.max(archiveFocusSize.y, 1e-3);
      const planeW = Math.max(archiveFocusSize.x, 1e-3);
      const viewportAspect = rect.width / Math.max(rect.height, 1);
      const distance = archiveDistanceForViewportFill(planeW, planeH, viewportAspect);

      hit.object.getWorldPosition(archiveImageCenterScratch);
      const px = archiveImageCenterScratch.x;
      const py = archiveImageCenterScratch.y;
      const pz = archiveImageCenterScratch.z;

      desktopImageFocusRef.current = {
        active: true,
        goalX: px,
        goalY: py,
        goalZ: pz + distance,
      };

      const currentState = state.current;
      currentState.velocity.x = 0;
      currentState.velocity.y = 0;
      currentState.velocity.z = 0;
      currentState.targetVel.x = 0;
      currentState.targetVel.y = 0;
      currentState.targetVel.z = 0;
      currentState.scrollAccum = 0;
    };

    const onMouseDown = (event: MouseEvent) => {
      const currentState = state.current;
      currentState.isDragging = true;
      currentState.lastMouse = { x: event.clientX, y: event.clientY };
      onHoverLabelChange(null);

      if (event.button === 0) {
        const g = tapGestureRef.current;
        g.active = true;
        g.startX = event.clientX;
        g.startY = event.clientY;
        g.maxMoveSq = 0;
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      const g = tapGestureRef.current;

      if (g.active && event.button === 0) {
        if (g.maxMoveSq <= tapThresholdSq) {
          tryCenterOnArchiveImage(event.clientX, event.clientY);
        }

        g.active = false;
        g.maxMoveSq = 0;
      }

      state.current.isDragging = false;
    };

    const onMouseLeave = () => {
      state.current.mouse = { x: 0, y: 0 };
      state.current.isDragging = false;
      tapGestureRef.current.active = false;
      tapGestureRef.current.maxMoveSq = 0;
      onHoverLabelChange(null);
    };

    const onMouseMove = (event: MouseEvent) => {
      const currentState = state.current;

      currentState.mouse = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      };

      const g = tapGestureRef.current;

      if (g.active) {
        const dx = event.clientX - g.startX;
        const dy = event.clientY - g.startY;
        g.maxMoveSq = Math.max(g.maxMoveSq, dx * dx + dy * dy);
      }

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
      desktopImageFocusRef.current.active = false;
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
          currentState.targetVel.x -= (touch.clientX - lastTouch.clientX) * touchDragSpeed;
          currentState.targetVel.y += (touch.clientY - lastTouch.clientY) * touchDragSpeed;
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
  }, [camera, gl, onHoverLabelChange, scene, touchDragSpeed]);

  useEffect(() => {
    if (isTouchDevice) {
      return;
    }

    lastFocusLabelRef.current = null;
    onFocusLabelChange(null);
  }, [isTouchDevice, onFocusLabelChange]);

  useFrame((_, delta) => {
    const currentState = state.current;
    const now = performance.now();
    const cappedDelta = Math.min(delta, 0.085);
    const { forward, backward, left, right, up, down } = getKeys();

    const focusRef = desktopImageFocusRef.current;
    let desktopImageFocus = focusRef.active && !isTouchDevice;

    if (
      desktopImageFocus &&
      (forward ||
        backward ||
        left ||
        right ||
        up ||
        down ||
        Math.abs(currentState.scrollAccum) > 0.018)
    ) {
      focusRef.active = false;
      desktopImageFocus = false;
    }

    if (!desktopImageFocus) {
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

      const isZoomingPhysics = Math.abs(currentState.velocity.z) > 0.05;
      const zoomFactor = clamp(currentState.basePos.z / INITIAL_CAMERA_Z, 0.3, 2);
      const driftAmount = 8 * zoomFactor;
      const driftLerp = isZoomingPhysics ? 0.2 : 0.12;

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

      currentState.targetVel.x *= VELOCITY_DECAY;
      currentState.targetVel.y *= VELOCITY_DECAY;
      currentState.targetVel.z *= VELOCITY_DECAY;
    } else {
      const focusSmooth = 1 - Math.exp(-ARCHIVE_FOCUS_LAMBDA * cappedDelta);
      const tx = focusRef.goalX - currentState.drift.x;
      const ty = focusRef.goalY - currentState.drift.y;
      const tz = focusRef.goalZ;

      currentState.basePos.x = lerp(currentState.basePos.x, tx, focusSmooth);
      currentState.basePos.y = lerp(currentState.basePos.y, ty, focusSmooth);
      currentState.basePos.z = lerp(currentState.basePos.z, tz, focusSmooth);
      currentState.drift.x = lerp(currentState.drift.x, 0, focusSmooth * 1.05);
      currentState.drift.y = lerp(currentState.drift.y, 0, focusSmooth * 1.05);
      currentState.velocity.x = 0;
      currentState.velocity.y = 0;
      currentState.velocity.z = 0;
      currentState.targetVel.x = 0;
      currentState.targetVel.y = 0;
      currentState.targetVel.z = 0;
      currentState.scrollAccum *= 0.78;

      if (
        Math.abs(currentState.basePos.x - tx) < ARCHIVE_FOCUS_COMPLETE_TOL &&
        Math.abs(currentState.basePos.y - ty) < ARCHIVE_FOCUS_COMPLETE_TOL &&
        Math.abs(currentState.basePos.z - tz) < ARCHIVE_FOCUS_COMPLETE_TOL
      ) {
        focusRef.active = false;
      }
    }

    camera.position.set(
      currentState.basePos.x + currentState.drift.x,
      currentState.basePos.y + currentState.drift.y,
      currentState.basePos.z,
    );

    const isZooming =
      desktopImageFocus ||
      Math.abs(currentState.velocity.z) > 0.05 ||
      Math.abs(currentState.scrollAccum) > 0.02;

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

  useLayoutEffect(() => {
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
          camera={{
            position: [0, 0, INITIAL_CAMERA_Z],
            fov: ARCHIVE_CAMERA_FOV,
            near: 1,
            far: 500,
          }}
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
