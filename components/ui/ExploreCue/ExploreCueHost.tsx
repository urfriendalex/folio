"use client";

/* eslint-disable react-hooks/refs -- Hook returns stable event/ref callbacks; refs are read only when those callbacks run. */

import { type ComponentProps } from "react";
import { useExploreCueTarget } from "./useExploreCueTarget";

type ExploreCueHostProps = ComponentProps<"div"> & {
  enabled?: boolean;
  label?: string;
};

export function ExploreCueHost({
  enabled = true,
  label = "explore",
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...rest
}: ExploreCueHostProps) {
  const cue = useExploreCueTarget<HTMLDivElement>({ enabled, label });

  return (
    <div
      {...rest}
      ref={cue.setRef}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        cue.onPointerEnter(event);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        cue.onPointerMove(event);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        cue.onPointerLeave(event);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        cue.onFocus(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        cue.onBlur(event);
      }}
    />
  );
}
