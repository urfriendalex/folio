/**
 * Canvas snapshot trail renderer.
 * Preserves the original trail mechanic: each trail is a frozen window snapshot
 * positioned from the window's top-left origin, then scaled in place.
 */

import { notFoundContent } from "@/content/not-found";

export type TrailSnapshot = {
  id: number;
  x: number;
  y: number;
  asciiFrame: string;
  asciiTransform: string;
  screenSnapshot: HTMLCanvasElement | null;
};

export type SnapshotCanvasCache = {
  signature: string;
  images: Map<string, HTMLCanvasElement>;
};

type GhostSize = {
  width: number;
  height: number;
};

type SnapshotStyle = {
  shell: string;
  shellShadow: string;
  shellHighlight: string;
  titleTop: string;
  titleBottom: string;
  titleInk: string;
  border: string;
  ink: string;
  frame: string;
  frameEdge: string;
  frameShadow: string;
  screen: string;
  patternDot: string;
  buttonFace: string;
  buttonHighlight: string;
  buttonShadow: string;
  iconRed: string;
  iconBlue: string;
  iconGreen: string;
  iconYellow: string;
  walkerColor: string;
  closeInk: string;
};

const COPY_TEXT = notFoundContent.copy;
const CLOSE_LABEL = notFoundContent.closeLabel;
const TITLE_LABEL = notFoundContent.windowTitle;
const COPY_LABEL = notFoundContent.copyLabel;
const BRAND_MARK = notFoundContent.brandMark;
const ACTION_LABELS = notFoundContent.quickLinks.map((l) => l.label);

/** Horizontal stretch for snapshot parity (match DOM `.screenAsciiViewport`) */
const ASCII_WIDE_X = 1.14;

export function drawTrailSnapshotsCanvas2D(
  ctx: CanvasRenderingContext2D,
  themeHost: HTMLElement,
  snapshots: TrailSnapshot[],
  width: number,
  height: number,
  ghostSize: GhostSize,
  cache: SnapshotCanvasCache,
): void {
  const signature = getSnapshotSignature(themeHost, ghostSize);
  if (cache.signature !== signature) {
    cache.signature = signature;
    cache.images.clear();
  }

  ctx.clearRect(0, 0, width, height);

  if (snapshots.length === 0) {
    return;
  }

  const style = readSnapshotStyle(themeHost);

  for (const snapshot of snapshots) {
    const snapshotCanvas = getOrCreateSnapshotCanvas(cache, snapshot, ghostSize, style);
    ctx.drawImage(snapshotCanvas, snapshot.x, snapshot.y, ghostSize.width, ghostSize.height);
  }
}

function getOrCreateSnapshotCanvas(
  cache: SnapshotCanvasCache,
  snapshot: TrailSnapshot,
  ghostSize: GhostSize,
  style: SnapshotStyle,
): HTMLCanvasElement {
  const key = snapshot.screenSnapshot
    ? `${cache.signature}::snapshot-${snapshot.id}`
    : `${cache.signature}::${snapshot.asciiTransform}::${snapshot.asciiFrame}`;
  const existing = cache.images.get(key);
  if (existing) {
    return existing;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(ghostSize.width));
  canvas.height = Math.max(1, Math.ceil(ghostSize.height));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  drawSnapshotToCanvas(ctx, snapshot, ghostSize, style);
  cache.images.set(key, canvas);
  return canvas;
}

function drawSnapshotToCanvas(
  ctx: CanvasRenderingContext2D,
  snapshot: TrailSnapshot,
  ghostSize: GhostSize,
  style: SnapshotStyle,
) {
  const { width, height } = ghostSize;
  const titleBarX = 4;
  const titleBarY = 4;
  const titleBarWidth = width - 8;
  const titleBarHeight = 25;
  const bodyInsetX = 11;
  const bodyInsetTop = 34;
  const bodyInsetBottom = 11;
  const screenFrameX = bodyInsetX;
  const screenFrameY = bodyInsetTop;
  const screenFrameWidth = width - bodyInsetX * 2;
  const screenHeight = Math.max(128, Math.round(height * 0.43));
  const screenFrameHeight = screenHeight + 4;
  const screenX = screenFrameX + 2;
  const screenY = screenFrameY + 2;
  const screenWidth = screenFrameWidth - 4;
  const copyY = screenFrameY + screenFrameHeight + 13;
  const buttonHeight = 34;
  const buttonGap = 8;
  const actionCount = ACTION_LABELS.length;
  const buttonWidth = Math.floor(
    (width - bodyInsetX * 2 - buttonGap * Math.max(0, actionCount - 1)) / Math.max(1, actionCount),
  );
  const buttonY = height - bodyInsetBottom - buttonHeight;

  ctx.clearRect(0, 0, width, height);

  drawWindowShell(ctx, width, height, style);
  drawTitleBar(ctx, titleBarX, titleBarY, titleBarWidth, titleBarHeight, style);
  drawWindowBrandMark(ctx, titleBarX + 5, titleBarY + titleBarHeight / 2, style);
  drawHeaderTitle(ctx, titleBarX + 34, titleBarY + titleBarHeight / 2, titleBarWidth - 58, style);
  drawCloseButton(ctx, titleBarX + titleBarWidth - 18, titleBarY + 5, style);
  drawSunkenRect(ctx, screenFrameX, screenFrameY, screenFrameWidth, screenFrameHeight, style, style.frame, true);
  ctx.fillStyle = style.screen;
  ctx.fillRect(screenX, screenY, screenWidth, screenHeight);

  drawScreenPattern(ctx, screenX, screenY, screenWidth, screenHeight, style);
  if (snapshot.screenSnapshot) {
    drawScreenSnapshot(ctx, snapshot.screenSnapshot, screenX, screenY, screenWidth, screenHeight);
  } else {
    drawAsciiFrame(ctx, snapshot, screenX, screenY, screenWidth, screenHeight, style);
  }
  drawCopy(ctx, width, copyY, buttonY, style);

  ACTION_LABELS.forEach((label, index) => {
    drawActionButton(
      ctx,
      bodyInsetX + index * (buttonWidth + buttonGap),
      buttonY,
      buttonWidth,
      buttonHeight,
      label,
      style,
    );
  });
}

function drawWindowBrandMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  yCenter: number,
  style: SnapshotStyle,
) {
  ctx.fillStyle = style.titleInk;
  ctx.font = '700 10px Tahoma, "Segoe UI", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(BRAND_MARK, x, yCenter);
}

function drawWindowShell(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: SnapshotStyle,
) {
  ctx.fillStyle = style.border;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = style.shell;
  ctx.fillRect(1, 1, width - 2, height - 2);

  ctx.strokeStyle = style.shellHighlight;
  ctx.beginPath();
  ctx.moveTo(1.5, height - 1.5);
  ctx.lineTo(1.5, 1.5);
  ctx.lineTo(width - 1.5, 1.5);
  ctx.stroke();

  ctx.strokeStyle = style.shellShadow;
  ctx.beginPath();
  ctx.moveTo(width - 1.5, 1.5);
  ctx.lineTo(width - 1.5, height - 1.5);
  ctx.lineTo(1.5, height - 1.5);
  ctx.stroke();
}

function drawTitleBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: SnapshotStyle,
) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, style.titleTop);
  gradient.addColorStop(1, style.titleBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

function drawHeaderTitle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxWidth: number,
  style: SnapshotStyle,
) {
  ctx.fillStyle = style.titleInk;
  ctx.font = '9px "Silkscreen", monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(fitSingleLineText(ctx, TITLE_LABEL, maxWidth), x, y);
}

function drawCloseButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: SnapshotStyle,
) {
  const size = 14;
  drawRaisedRect(ctx, x, y, size, size, style, style.buttonFace);

  ctx.fillStyle = style.closeInk;
  ctx.font = '9px "Silkscreen", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(CLOSE_LABEL, x + size / 2, y + size / 2 + 0.5);
}

function drawScreenPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: SnapshotStyle,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.fillStyle = withAlpha(style.patternDot, 0.34);
  for (let dotY = y + 1; dotY < y + height; dotY += 5.5) {
    for (let dotX = x + 1; dotX < x + width; dotX += 5.5) {
      ctx.fillRect(dotX, dotY, 1.1, 1.1);
    }
  }

  ctx.restore();
}

function drawAsciiFrame(
  ctx: CanvasRenderingContext2D,
  snapshot: TrailSnapshot,
  x: number,
  y: number,
  width: number,
  height: number,
  style: SnapshotStyle,
) {
  const lines = snapshot.asciiFrame.replace(/\r/g, "").split("\n");
  const safeLines = lines.length > 0 ? lines : [""];
  const rootFontSize = getRootFontSize();
  const viewportWidth = window.innerWidth;
  const baseFontSize = viewportWidth <= 768
    ? clamp(rootFontSize * 0.52, viewportWidth * 0.018, rootFontSize * 0.82)
    : clamp(rootFontSize * 0.82, viewportWidth * 0.0142, rootFontSize * 1.14);
  const lineHeight = baseFontSize * 0.9;
  const scale = getAsciiSnapshotScale(snapshot.asciiTransform)
    ?? fitAsciiScale(ctx, safeLines, width / ASCII_WIDE_X, height, baseFontSize, lineHeight);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.scale(scale * ASCII_WIDE_X, scale);

  ctx.font = `${baseFontSize}px "Geist Mono", monospace`;
  ctx.fillStyle = style.walkerColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const totalHeight = safeLines.length * lineHeight;
  let lineY = -(totalHeight / 2);

  for (const line of safeLines) {
    ctx.fillText(line, 0, lineY);
    lineY += lineHeight;
  }

  ctx.restore();
}

function drawScreenSnapshot(
  ctx: CanvasRenderingContext2D,
  snapshotCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(
    width / Math.max(1, snapshotCanvas.width),
    height / Math.max(1, snapshotCanvas.height),
  );
  const drawWidth = snapshotCanvas.width * scale;
  const drawHeight = snapshotCanvas.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(snapshotCanvas, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function drawCopy(
  ctx: CanvasRenderingContext2D,
  width: number,
  copyY: number,
  buttonY: number,
  style: SnapshotStyle,
) {
  const left = 12;
  const maxWidth = width - left * 2;

  ctx.fillStyle = style.ink;
  ctx.font = '11px "Silkscreen", monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(COPY_LABEL, left, copyY);

  ctx.font = '10px "Silkscreen", monospace';
  const paragraphTop = copyY + 18;
  const availableHeight = Math.max(0, buttonY - 10 - paragraphTop);
  drawWrappedText(ctx, COPY_TEXT, left, paragraphTop, maxWidth, 14, Math.max(1, Math.floor(availableHeight / 14)));
}

function drawActionButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  style: SnapshotStyle,
) {
  drawRaisedRect(ctx, x, y, width, height, style, style.buttonFace);

  ctx.fillStyle = style.ink;
  ctx.font = '8px "Silkscreen", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fitSingleLineText(ctx, label, width - 8), x + width / 2, y + height / 2 + 1);
}

function fitAsciiScale(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  width: number,
  height: number,
  baseFontSize: number,
  lineHeight: number,
) {
  ctx.save();
  ctx.font = `${baseFontSize}px "Geist Mono", monospace`;

  let widestLine = 0;
  for (const line of lines) {
    widestLine = Math.max(widestLine, ctx.measureText(line).width);
  }

  ctx.restore();

  const textWidth = Math.max(1, widestLine);
  const textHeight = Math.max(1, lines.length * lineHeight);
  return Math.min((width * 0.82) / textWidth, (height * 0.82) / textHeight);
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || currentLine.length === 0) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function readSnapshotStyle(themeHost: HTMLElement): SnapshotStyle {
  const computed = window.getComputedStyle(themeHost);

  return {
    shell: readCssVar(computed, "--window-shell", "#c3c3c3"),
    shellShadow: readCssVar(computed, "--window-shell-shadow", "#878787"),
    shellHighlight: readCssVar(computed, "--window-shell-highlight", "#ffffff"),
    titleTop: readCssVar(computed, "--window-title-top", "#07226f"),
    titleBottom: readCssVar(computed, "--window-title-bottom", "#0b3ca8"),
    titleInk: readCssVar(computed, "--window-title-ink", "#ffffff"),
    border: readCssVar(computed, "--window-border", "#000000"),
    ink: readCssVar(computed, "--window-ink", "#111111"),
    frame: readCssVar(computed, "--window-frame", "#fdfdfd"),
    frameEdge: readCssVar(computed, "--window-frame-edge", "#c8c8c8"),
    frameShadow: readCssVar(computed, "--window-frame-shadow", "#7b7b7b"),
    screen: readCssVar(computed, "--window-screen", "#ffffff"),
    patternDot: readCssVar(computed, "--window-pattern-dot", "rgba(0,0,0,0.2)"),
    buttonFace: readCssVar(computed, "--window-button-face", "#c3c3c3"),
    buttonHighlight: readCssVar(computed, "--window-button-highlight", "#ffffff"),
    buttonShadow: readCssVar(computed, "--window-button-shadow", "#7b7b7b"),
    iconRed: readCssVar(computed, "--window-icon-red", "#ce1f25"),
    iconBlue: readCssVar(computed, "--window-icon-blue", "#0a36a1"),
    iconGreen: readCssVar(computed, "--window-icon-green", "#14a44d"),
    iconYellow: readCssVar(computed, "--window-icon-yellow", "#f0cf27"),
    walkerColor: readCssVar(computed, "--walker-color", "#050505"),
    closeInk: readCssVar(computed, "--window-close-ink", "#111111"),
  };
}

function getSnapshotSignature(themeHost: HTMLElement, ghostSize: GhostSize) {
  const style = readSnapshotStyle(themeHost);

  return [
    ghostSize.width,
    ghostSize.height,
    window.innerWidth <= 768 ? "mobile" : "desktop",
    style.shell,
    style.shellShadow,
    style.shellHighlight,
    style.titleTop,
    style.titleBottom,
    style.titleInk,
    style.border,
    style.ink,
    style.frame,
    style.frameEdge,
    style.frameShadow,
    style.screen,
    style.patternDot,
    style.buttonFace,
    style.buttonHighlight,
    style.buttonShadow,
    style.iconRed,
    style.iconBlue,
    style.iconGreen,
    style.iconYellow,
    style.walkerColor,
    style.closeInk,
    TITLE_LABEL,
    COPY_LABEL,
    COPY_TEXT,
    ACTION_LABELS.join(","),
    CLOSE_LABEL,
    BRAND_MARK,
    String(ASCII_WIDE_X),
  ].join("|");
}

function getAsciiSnapshotScale(transform: string) {
  const match = transform.match(/scale\(([-\d.]+)(?:,\s*([-\d.]+))?\)/);
  if (!match) {
    return null;
  }

  const scaleX = Number.parseFloat(match[1] ?? "");
  const scaleY = Number.parseFloat(match[2] ?? match[1] ?? "");
  const scale = Math.min(scaleX, scaleY);
  return Number.isFinite(scale) ? scale : null;
}

function getRootFontSize() {
  const fontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(fontSize) ? fontSize : 16;
}

function readCssVar(style: CSSStyleDeclaration, variableName: string, fallback: string) {
  return style.getPropertyValue(variableName).trim() || fallback;
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const normalized = hex.length === 3
      ? hex.split("").map((char) => `${char}${char}`).join("")
      : hex;

    if (normalized.length !== 6) {
      return color;
    }

    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgbaMatch) {
    return color;
  }

  const channels = rgbaMatch[1]?.split(",").map((channel) => channel.trim());
  if (!channels || channels.length < 3) {
    return color;
  }

  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
}

function clamp(min: number, value: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fitSingleLineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}...`;
}

function drawRaisedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: SnapshotStyle,
  fill: string,
) {
  ctx.fillStyle = style.border;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, width - 2, height - 2);

  ctx.strokeStyle = style.buttonHighlight;
  ctx.beginPath();
  ctx.moveTo(x + 1.5, y + height - 1.5);
  ctx.lineTo(x + 1.5, y + 1.5);
  ctx.lineTo(x + width - 1.5, y + 1.5);
  ctx.stroke();

  ctx.strokeStyle = style.buttonShadow;
  ctx.beginPath();
  ctx.moveTo(x + width - 1.5, y + 1.5);
  ctx.lineTo(x + width - 1.5, y + height - 1.5);
  ctx.lineTo(x + 1.5, y + height - 1.5);
  ctx.stroke();
}

function drawSunkenRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: SnapshotStyle,
  fill: string,
  doubleBevel = false,
) {
  ctx.fillStyle = style.border;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, width - 2, height - 2);

  ctx.strokeStyle = style.frameShadow;
  ctx.beginPath();
  ctx.moveTo(x + 1.5, y + height - 1.5);
  ctx.lineTo(x + 1.5, y + 1.5);
  ctx.lineTo(x + width - 1.5, y + 1.5);
  ctx.stroke();

  ctx.strokeStyle = style.shellHighlight;
  ctx.beginPath();
  ctx.moveTo(x + width - 1.5, y + 1.5);
  ctx.lineTo(x + width - 1.5, y + height - 1.5);
  ctx.lineTo(x + 1.5, y + height - 1.5);
  ctx.stroke();

  if (!doubleBevel) {
    return;
  }

  ctx.strokeStyle = style.frameEdge;
  ctx.beginPath();
  ctx.moveTo(x + 2.5, y + height - 2.5);
  ctx.lineTo(x + 2.5, y + 2.5);
  ctx.lineTo(x + width - 2.5, y + 2.5);
  ctx.stroke();

  ctx.strokeStyle = style.shellHighlight;
  ctx.beginPath();
  ctx.moveTo(x + width - 2.5, y + 2.5);
  ctx.lineTo(x + width - 2.5, y + height - 2.5);
  ctx.lineTo(x + 2.5, y + height - 2.5);
  ctx.stroke();
}
