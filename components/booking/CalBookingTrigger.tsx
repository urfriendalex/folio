"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useOverlay } from "@/components/ui/Overlay/OverlayProvider";

type CalBookingTriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
};

export function CalBookingTrigger({ children, onClick, ...props }: CalBookingTriggerProps) {
  const { openCalBooking } = useOverlay();

  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        openCalBooking();
      }}
    >
      {children}
    </button>
  );
}
