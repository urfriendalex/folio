type PaintBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function containPaintBox(
  container: DOMRect,
  mediaWidth: number,
  mediaHeight: number,
): PaintBox | null {
  if (mediaWidth <= 0 || mediaHeight <= 0 || container.width <= 0 || container.height <= 0) {
    return null;
  }

  const containerRatio = container.width / container.height;
  const mediaRatio = mediaWidth / mediaHeight;
  const width =
    mediaRatio > containerRatio ? container.width : container.height * mediaRatio;
  const height =
    mediaRatio > containerRatio ? container.width / mediaRatio : container.height;

  const left = container.left + (container.width - width) / 2;
  const top = container.top + (container.height - height) / 2;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

function pointInBox(clientX: number, clientY: number, box: PaintBox) {
  return clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom;
}

export function findProjectMediaRoot(host: HTMLElement): HTMLElement | null {
  if (host.matches("[data-project-media]")) {
    return host;
  }

  return host.querySelector("[data-project-media]");
}

export function loadedMediaPaintBox(host: HTMLElement): PaintBox | null {
  const root = findProjectMediaRoot(host);
  if (!root || root.getAttribute("data-ready") !== "true") {
    return null;
  }

  const surface =
    root.querySelector<HTMLElement>("[data-project-media-surface]") ?? root;
  const container = surface.getBoundingClientRect();
  const fit = root.getAttribute("data-fit") ?? "contain";

  if (fit !== "contain") {
    return {
      left: container.left,
      top: container.top,
      right: container.right,
      bottom: container.bottom,
    };
  }

  const mediaWidth = Number(root.getAttribute("data-media-width"));
  const mediaHeight = Number(root.getAttribute("data-media-height"));

  return containPaintBox(container, mediaWidth, mediaHeight);
}

export function isPointerOverLoadedMedia(
  host: HTMLElement,
  clientX: number,
  clientY: number,
) {
  const box = loadedMediaPaintBox(host);
  return box ? pointInBox(clientX, clientY, box) : false;
}
