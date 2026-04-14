"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawTrailSnapshotsCanvas2D,
  type SnapshotCanvasCache,
  type TrailSnapshot,
} from "./trailGpuRenderer";
import styles from "./NotFoundStage.module.scss";

type Props = {
  snapshots: TrailSnapshot[];
  ghostSize: { width: number; height: number };
};

export function TrailCanvasLayer({ snapshots, ghostSize }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<SnapshotCanvasCache>({ signature: "", images: new Map() });
  const drawFrameRef = useRef<number | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (drawFrameRef.current !== null) {
      window.cancelAnimationFrame(drawFrameRef.current);
    }

    drawFrameRef.current = window.requestAnimationFrame(() => {
      drawFrameRef.current = null;

      const width = viewport.w || window.innerWidth || 1;
      const height = viewport.h || window.innerHeight || 1;

      if (canvas.width !== width) {
        canvas.width = width;
      }
      if (canvas.height !== height) {
        canvas.height = height;
      }

      const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!context) {
        return;
      }

      drawTrailSnapshotsCanvas2D(
        context,
        canvas,
        snapshots,
        width,
        height,
        ghostSize,
        cacheRef.current,
      );
    });

    return () => {
      if (drawFrameRef.current !== null) {
        window.cancelAnimationFrame(drawFrameRef.current);
        drawFrameRef.current = null;
      }
    };
  }, [snapshots, ghostSize, viewport]);

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const fonts = document.fonts;
    if (!fonts) {
      return;
    }

    let cancelled = false;

    fonts.ready.then(() => {
      if (cancelled) {
        return;
      }

      cacheRef.current.signature = "";
      cacheRef.current.images.clear();
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (snapshots.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className={styles.trailCanvas}
      width={typeof window !== "undefined" ? window.innerWidth : 1}
      height={typeof window !== "undefined" ? window.innerHeight : 1}
      aria-hidden
    />
  );
}
