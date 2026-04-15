import { scrollElementIntoView, scrollToHeroSection } from "@/lib/smoothScroll";

type HomeSectionId = "hero" | "work" | "contact";

type RouterLike = {
  push: (href: string) => void;
};

type NavigateToHomeSectionOptions = {
  pathname: string;
  router: RouterLike;
  sectionId: HomeSectionId;
  beforeScroll?: () => void;
};

/** Same hash resolution as the primary nav: on `/` use in-page anchors; elsewhere go home with hash. */
export function getAnchor(pathname: string, id: Exclude<HomeSectionId, "hero">) {
  return pathname === "/" ? `#${id}` : `/#${id}`;
}

export function navigateToHomeSection({
  pathname,
  router,
  sectionId,
  beforeScroll,
}: NavigateToHomeSectionOptions) {
  beforeScroll?.();

  if (pathname !== "/") {
    router.push(`/#${sectionId}`);
    return;
  }

  window.history.replaceState(window.history.state, "", `#${sectionId}`);

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (sectionId === "hero") {
        scrollToHeroSection();
        return;
      }

      const section = document.getElementById(sectionId);

      if (section) {
        scrollElementIntoView(section);
      }
    });
  });
}
