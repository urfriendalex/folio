"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Preloader } from "./Preloader";

type PreloaderGateProps = {
  children: ReactNode;
};

export function PreloaderGate({ children }: PreloaderGateProps) {
  const [showPreloader, setShowPreloader] = useState(true);

  const handleDone = () => {
    setShowPreloader(false);
  };

  return (
    <>
      {showPreloader ? <Preloader onDone={handleDone} /> : null}
      <div data-app-shell="true">{children}</div>
    </>
  );
}
