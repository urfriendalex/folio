const STORAGE_KEY = "folio:home-hero-reveal-done";
const STORAGE_EVENT = "folio:home-hero-reveal-done-change";

export function getHomeHeroRevealDone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function subscribeHomeHeroRevealDone(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };

  const handleChange = () => {
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleChange);
  };
}

export function setHomeHeroRevealDone(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // ignore quota / private mode
  }
}
