let lockCount = 0;
let savedScrollY = 0;
let shouldRestoreScroll = true;

export function skipNextScrollRestore() {
  shouldRestoreScroll = false;
}

export function lockBodyScroll() {
  if (lockCount === 0) {
    shouldRestoreScroll = true;
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
  }
  lockCount++;
}

export function unlockBodyScroll() {
  if (lockCount <= 0) {
    return;
  }
  lockCount--;
  if (lockCount === 0) {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    const scrollY = savedScrollY;
    savedScrollY = 0;
    const restoreScroll = shouldRestoreScroll;
    shouldRestoreScroll = true;

    if (restoreScroll) {
      window.scrollTo(0, scrollY);
    }
  }
}
