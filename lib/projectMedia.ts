import type { ProjectEntry, ProjectMediaSlot, ProjectThumbnail } from "@/content/projects/types";

export const PROJECT_MEDIA_MOBILE_QUERY = "(max-width: 48rem)";

export type ProjectMediaPlaceholderGrid = {
  cols: number;
  rows: number;
};

const LANDSCAPE_PLACEHOLDER_GRID: ProjectMediaPlaceholderGrid = { cols: 16, rows: 9 };
const PORTRAIT_PLACEHOLDER_GRID: ProjectMediaPlaceholderGrid = { cols: 9, rows: 16 };
const SQUARE_PLACEHOLDER_GRID: ProjectMediaPlaceholderGrid = { cols: 12, rows: 12 };

export function projectMediaPlaceholderGridForAsset(
  asset: { width: number; height: number },
): ProjectMediaPlaceholderGrid {
  const ratio = asset.width / asset.height;

  if (ratio > 1.15) {
    return LANDSCAPE_PLACEHOLDER_GRID;
  }

  if (ratio < 0.87) {
    return PORTRAIT_PLACEHOLDER_GRID;
  }

  return SQUARE_PLACEHOLDER_GRID;
}

/** Filename segment of a `/projects/...` URL (e.g. `media-02.mp4`). */
export function publicSrcBasename(src: string): string {
  const i = src.lastIndexOf("/");
  return i >= 0 ? src.slice(i + 1) : src;
}

const MEDIA_ORDER_FALLBACK_BASE = 1_000_000;

/**
 * Applies gallery order: entries in `orderIndexByBasename` (see `content/projects/project-media-order.ts`)
 * first, then remaining slots in stable generator order. Strips `orderIndex` from slots afterward.
 *
 * Precedence per slot: override map → optional `slot.orderIndex` → fallback (preserves default order among unconfigured items).
 */
export function normalizeProjectMediaSlots(
  media: ProjectMediaSlot[],
  orderIndexByBasename?: Partial<Record<string, number>>,
): ProjectMediaSlot[] {
  const decorated = media.map((slot, index) => {
    const base = publicSrcBasename(slot.desktop.src);
    const fromMap = orderIndexByBasename?.[base];
    const sortKey =
      fromMap ??
      slot.orderIndex ??
      MEDIA_ORDER_FALLBACK_BASE + index;

    return { slot, sortKey, index };
  });

  return decorated
    .sort((a, b) => {
      if (a.sortKey !== b.sortKey) {
        return a.sortKey - b.sortKey;
      }
      return a.index - b.index;
    })
    .map(({ slot }) => {
      const rest: ProjectMediaSlot = { ...slot };
      delete rest.orderIndex;
      return rest as ProjectMediaSlot;
    });
}

export function thumbnailToMediaSlot(thumbnail: ProjectThumbnail): ProjectMediaSlot {
  return {
    kind: thumbnail.desktop.video ? "video" : "image",
    desktop: {
      src: thumbnail.desktop.video ?? thumbnail.desktop.poster,
      poster: thumbnail.desktop.poster,
      width: thumbnail.desktop.width,
      height: thumbnail.desktop.height,
    },
    mobile: thumbnail.mobile
      ? {
          src: thumbnail.mobile.video ?? thumbnail.desktop.video ?? thumbnail.mobile.poster,
          poster: thumbnail.mobile.poster,
          width: thumbnail.mobile.width,
          height: thumbnail.mobile.height,
        }
      : undefined,
    loop: true,
  };
}

export function getThumbnailPosterSources(project: ProjectEntry) {
  return [project.thumbnail.desktop.poster, project.thumbnail.mobile?.poster].filter(Boolean) as string[];
}
