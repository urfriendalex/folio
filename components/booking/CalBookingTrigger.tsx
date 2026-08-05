"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { getScheduleCallHref } from "@/components/booking/calBooking";
import { useOverlay } from "@/components/ui/Overlay/OverlayProvider";

type CalBookingTriggerProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode;
};

export function CalBookingTrigger({ children, onClick, ...props }: CalBookingTriggerProps) {
  const { openCalBooking } = useOverlay();

  return (
    <a
      href={getScheduleCallHref()}
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        event.preventDefault();
        openCalBooking();
      }}
    >
      {children}
    </a>
  );
}
