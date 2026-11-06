"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  buildCalendarDraft,
  buildGoogleCalendarUrl,
  buildIcs,
  buildIcsRouteHref,
  buildOutlookCalendarUrl,
  CALL_ICS_FILENAME,
  type CalendarDraft,
} from "@/lib/calendar/ics";
import {
  defaultCalendarOption,
  detectCalendarSurface,
  detectDesktopOs,
  orderedCalendarOptions,
  usesCalendarMenu,
  type CalendarOptionId,
  type CalendarSurface,
  type DesktopOs,
} from "@/lib/calendar/platform";
import styles from "./CalBookingOverlayContent.module.scss";

type AddToCalendarProps = {
  start: string;
  end?: string | null;
  lengthInMinutes?: number | null;
  meetingUrl?: string | null;
  uid?: string | null;
};

type DetectedCalendar = {
  surface: CalendarSurface;
  os: DesktopOs;
};

function detectCalendar(): DetectedCalendar {
  if (typeof navigator === "undefined") {
    return { surface: "desktop", os: "other" };
  }

  const input = {
    userAgent: navigator.userAgent,
    platform: navigator.platform || "",
    maxTouchPoints: navigator.maxTouchPoints || 0,
  };

  return {
    surface: detectCalendarSurface(input),
    os: detectDesktopOs(input),
  };
}

function openHref(href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadIcs(draft: CalendarDraft) {
  const file = new File([buildIcs(draft)], CALL_ICS_FILENAME, { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = CALL_ICS_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function openAppleCalendar(draft: CalendarDraft, startIso: string, uid: string | null) {
  openHref(
    buildIcsRouteHref({
      startIso,
      minutes: draft.minutes,
      meetingUrl: draft.url,
      uid,
      download: false,
    }),
  );
}

function activateCalendarOption(
  option: CalendarOptionId,
  draft: CalendarDraft,
  startIso: string,
  uid: string | null,
  surface: CalendarSurface,
) {
  if (option === "google") {
    openHref(buildGoogleCalendarUrl(draft));
    return;
  }

  if (option === "outlook-live") {
    openHref(buildOutlookCalendarUrl(draft, "live"));
    return;
  }

  if (option === "outlook-office") {
    openHref(buildOutlookCalendarUrl(draft, "office"));
    return;
  }

  if (surface === "ios" || surface === "macos-safari") {
    openAppleCalendar(draft, startIso, uid);
    return;
  }

  downloadIcs(draft);
}

export function AddToCalendar({ start, end, lengthInMinutes, meetingUrl, uid }: AddToCalendarProps) {
  const draft = buildCalendarDraft({
    startIso: start,
    endIso: end,
    lengthInMinutes,
    meetingUrl,
    uid,
  });
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [detected] = useState(detectCalendar);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const showMenu = usesCalendarMenu(detected.surface);
  const preferred = defaultCalendarOption(detected.surface, detected.os);
  const options = orderedCalendarOptions(preferred);

  useEffect(() => {
    if (!open) {
      return;
    }

    itemRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  if (!draft) {
    return null;
  }

  const event = draft;

  function run(option: CalendarOptionId) {
    setOpen(false);
    activateCalendarOption(option, event, start, uid ?? null, detected.surface);
  }

  function openMenu(index: number) {
    setActiveIndex(index);
    setOpen(true);
  }

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index + 1) % options.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index - 1 + options.length) % options.length);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const directLabel =
    preferred === "ics"
      ? "Add to calendar. Opens Apple Calendar."
      : "Add to calendar. Opens Google Calendar.";

  return (
    <div
      ref={rootRef}
      className={styles.calendarControl}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.copyLinkAction}
        aria-label={showMenu ? undefined : directLabel}
        aria-haspopup={showMenu ? "menu" : undefined}
        aria-expanded={showMenu ? open : undefined}
        aria-controls={showMenu && open ? menuId : undefined}
        onClick={() => {
          if (showMenu) {
            if (open) {
              setOpen(false);
            } else {
              openMenu(0);
            }
            return;
          }

          run(preferred);
        }}
        onKeyDown={(event) => {
          if (!showMenu) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenu(0);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(options.length - 1);
          }
        }}
      >
        Add to calendar
      </button>
      {showMenu && open ? (
        <div id={menuId} role="menu" aria-label="Add to calendar" className={styles.calendarMenu}>
          {options.map((option, index) => (
            <button
              key={option.id}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              role="menuitem"
              className={styles.calendarMenuItem}
              data-active={index === activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => run(option.id)}
              onKeyDown={(event) => onMenuKeyDown(event, index)}
            >
              {index === 0 ? <span className="sr-only">Recommended. </span> : null}
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
