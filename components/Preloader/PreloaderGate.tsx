"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PRELOADER_REPLAY_EVENT } from "@/lib/preloaderReplay";
import { Preloader } from "./Preloader";

type PreloaderGateProps = {
  children: ReactNode;
};

export function PreloaderGate({ children }: PreloaderGateProps) {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const handleReplay = () => {
      const html = document.documentElement;
      html.setAttribute("data-preloader", "run");
      html.classList.add("is-loading");
      setShowPreloader(true);
    };

    window.addEventListener(PRELOADER_REPLAY_EVENT, handleReplay);
    return () => {
      window.removeEventListener(PRELOADER_REPLAY_EVENT, handleReplay);
    };
  }, []);

  const handleDone = () => {
    setShowPreloader(false);
  };

  return (
    <>
      {showPreloader ? <Preloader onDone={handleDone} /> : null}
      {children}
    </>
  );
}
