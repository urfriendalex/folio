export type ProjectGridView = "stack" | "wide" | "regular";
export type ProjectIndexView = "list" | ProjectGridView;

export type StoredProjectLayout = {
  view: ProjectIndexView;
  grid: ProjectGridView;
};

const STORAGE_KEY = "projectLayout";

const DEFAULT_LAYOUT: StoredProjectLayout = {
  view: "list",
  grid: "wide",
};

function isProjectGridView(value: string): value is ProjectGridView {
  return value === "stack" || value === "wide" || value === "regular";
}

function isProjectIndexView(value: string): value is ProjectIndexView {
  return value === "list" || isProjectGridView(value);
}

export function readProjectLayout(): StoredProjectLayout {
  if (typeof window === "undefined") {
    return DEFAULT_LAYOUT;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_LAYOUT;
    }

    const parsed = JSON.parse(raw) as Partial<StoredProjectLayout>;
    const parsedView = parsed.view ?? "";
    const parsedGrid = parsed.grid ?? "";
    const grid = isProjectGridView(parsedGrid)
      ? parsedGrid
      : isProjectGridView(parsedView)
        ? parsedView
        : DEFAULT_LAYOUT.grid;
    const view = isProjectIndexView(parsedView) ? parsedView : DEFAULT_LAYOUT.view;

    return { view, grid };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function writeProjectLayout(patch: Partial<StoredProjectLayout>): StoredProjectLayout {
  const current = readProjectLayout();
  const next: StoredProjectLayout = {
    view: patch.view ?? current.view,
    grid: patch.grid ?? current.grid,
  };

  if (isProjectGridView(next.view)) {
    next.grid = next.view;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }

  return next;
}

export function coerceProjectGridView(
  grid: ProjectGridView,
  viewport: { mobile: boolean; superWide: boolean },
): ProjectGridView {
  if (grid === "stack" && (viewport.mobile || viewport.superWide)) {
    return "wide";
  }

  return grid;
}

export function coerceProjectIndexView(
  view: ProjectIndexView,
  viewport: { mobile: boolean; superWide: boolean },
): ProjectIndexView {
  if (view === "list") {
    return "list";
  }

  if (viewport.mobile && view === "regular") {
    return "wide";
  }

  return coerceProjectGridView(view, viewport);
}
