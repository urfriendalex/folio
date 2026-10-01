"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { PRELOADER_REPLAY_EVENT } from "@/lib/preloaderReplay";
import { Preloader } from "./Preloader";

type PreloaderGateProps = {
  children: ReactNode;
};

export function PreloaderGate({ children }: PreloaderGateProps) {
  const [showPreloader, setShowPreloader] = useState(true);
  const [session, setSession] = useState(0);

  useEffect(() => {
    const handleReplay = () => {
      const html = document.documentElement;
      html.setAttribute("data-preloader", "run");
      html.classList.add("is-loading");
      html.classList.remove("is-preloader-exiting");
      setSession((current) => current + 1);
      setShowPreloader(true);
    };

    window.addEventListener(PRELOADER_REPLAY_EVENT, handleReplay);
    return () => {
      window.removeEventListener(PRELOADER_REPLAY_EVENT, handleReplay);
    };
  }, []);

  const handleDone = useCallback(() => {
    setShowPreloader(false);
  }, []);

  return (
    <>
      {showPreloader ? (
        <Preloader key={session} replay={session > 0} onDone={handleDone} />
      ) : null}
      {children}
    </>
  );
}
