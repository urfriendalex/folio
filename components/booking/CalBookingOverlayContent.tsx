"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { contactContent } from "@/content/contact";
import { getCalPageHref, normalizeCalLink } from "./calBooking";
import styles from "./CalBookingOverlayContent.module.scss";

type CalLocation = {
  type?: string;
  integration?: string;
  link?: string;
  address?: string;
  public?: boolean;
};

type CalBookingField = {
  slug?: string;
  type?: string;
  required?: boolean;
  hidden?: boolean;
};

type CalEventType = {
  id: number;
  title: string;
  slug: string;
  description: string;
  lengthInMinutes: number;
  bookingUrl: string;
  username: string | null;
  locations: CalLocation[];
  bookingFields: CalBookingField[];
};

type CalOverviewResponse = {
  username: string | null;
  timeZone: string;
  profileUrl: string;
  eventTypes: CalEventType[];
  defaultEventTypeId: number | null;
};

type CalSlotMap = Record<string, Array<{ start: string; end?: string }>>;

type BookingSuccess = {
  uid: string | null;
  title: string | null;
  start: string;
  end: string | null;
  attendeeEmail: string;
  location: string | null;
  meetingUrl: string | null;
};

type AsyncState<T> =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: string };

type BookingStep = "date" | "time" | "details";

const RANGE_DAYS = 7;
const STEP_ORDER: BookingStep[] = ["date", "time", "details"];
const SKELETON_DAYS = Array.from({ length: RANGE_DAYS }, (_, index) => index);
const SKELETON_SLOTS = Array.from({ length: 10 }, (_, index) => index);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return getLocalDateKey(date);
}

function buildDateRange(start: string) {
  return Array.from({ length: RANGE_DAYS }, (_, index) => addDays(start, index));
}

function formatLongDate(dateKey: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function formatShortDate(dateKey: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    timeZone,
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function formatMonthRange(start: string, end: string, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
  });

  return `${formatter.format(new Date(`${start}T12:00:00Z`))} – ${formatter.format(new Date(`${end}T12:00:00Z`))}`;
}

function formatSlotTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

function formatSlotSummary(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

function getViewerTimeZone(fallback: string) {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

function getLocationLabel(location: CalLocation, index: number) {
  if (location.address) {
    return location.address;
  }

  if (location.integration === "cal-video") {
    return "Cal video";
  }

  if (location.integration) {
    return location.integration.replace(/-/g, " ");
  }

  if (location.type) {
    return location.type.replace(/-/g, " ");
  }

  return `Option ${index + 1}`;
}

type CalBookingOverlayContentProps = {
  calLink: string;
};

function BookingSkeleton() {
  return (
    <div className={styles.widgetSection} aria-hidden="true">
      <div className={styles.guidedShell}>
        <aside className={styles.contextPane}>
          <div className={styles.utilityLinks}>
            <span className={`${styles.skeletonLine} ${styles.skeletonLink}`} />
            <span className={`${styles.skeletonLine} ${styles.skeletonLink}`} />
          </div>
          <div className={styles.skeletonEventGroup}>
            <span className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
            <div className={styles.skeletonEventList}>
              {Array.from({ length: 3 }, (_, index) => (
                <span key={index} className={styles.skeletonEvent}>
                  <span className={`${styles.skeletonLine} ${styles.skeletonEventTitle}`} />
                  <span className={`${styles.skeletonLine} ${styles.skeletonEventMeta}`} />
                </span>
              ))}
            </div>
          </div>
        </aside>
        <section className={styles.stepPane}>
          <div className={styles.skeletonStepContent}>
            <div className={styles.stepTop}>
              <span className={`${styles.skeletonLine} ${styles.skeletonStepTitle}`} />
              <div className={styles.navGroup}>
                <span className={styles.skeletonNav} />
                <span className={styles.skeletonNav} />
              </div>
            </div>
            <div className={styles.skeletonDateGrid}>
              {SKELETON_DAYS.map((day) => (
                <span key={day} className={styles.skeletonDate}>
                  <span className={`${styles.skeletonLine} ${styles.skeletonDatePrimary}`} />
                  <span className={`${styles.skeletonLine} ${styles.skeletonDateMeta}`} />
                </span>
              ))}
            </div>
          </div>
          <div className={styles.actionBar}>
            <span className={styles.skeletonSubmit} />
          </div>
        </section>
      </div>
    </div>
  );
}

export function CalBookingOverlayContent({ calLink }: CalBookingOverlayContentProps) {
  const normalizedCalLink = useMemo(() => normalizeCalLink(calLink), [calLink]);
  const fallbackCalPageHref = useMemo(() => getCalPageHref(normalizedCalLink), [normalizedCalLink]);
  const [overviewState, setOverviewState] = useState<AsyncState<CalOverviewResponse>>({
    status: "loading",
  });
  const [viewerTimeZone, setViewerTimeZone] = useState("Europe/Warsaw");
  const [rangeStart, setRangeStart] = useState(() => getLocalDateKey());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<BookingStep>("date");
  const [slotsState, setSlotsState] = useState<AsyncState<CalSlotMap>>({ status: "idle" });
  const [bookingState, setBookingState] = useState<
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "success"; booking: BookingSuccess }
    | { status: "error"; error: string }
  >({ status: "idle" });
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    notes: "",
  });
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const rangeEnd = useMemo(() => addDays(rangeStart, RANGE_DAYS - 1), [rangeStart]);
  const overview = overviewState.status === "ready" ? overviewState.data : null;
  const selectedEvent = useMemo(
    () => overview?.eventTypes.find((eventType) => eventType.id === selectedEventId) ?? null,
    [overview, selectedEventId],
  );
  const selectedLocation =
    selectedEvent?.locations.length && selectedEvent.locations[selectedLocationIndex]
      ? selectedEvent.locations[selectedLocationIndex]
      : selectedEvent?.locations[0];
  const slotDays = useMemo(() => {
    const rangeKeys = buildDateRange(rangeStart);
    const slotMap = slotsState.status === "ready" ? slotsState.data : {};

    return rangeKeys.map((dateKey) => ({
      dateKey,
      label: formatLongDate(dateKey, viewerTimeZone),
      shortLabel: formatShortDate(dateKey, viewerTimeZone),
      slots: slotMap[dateKey] ?? [],
    }));
  }, [rangeStart, slotsState, viewerTimeZone]);
  const selectedDay = slotDays.find((day) => day.dateKey === selectedDateKey) ?? null;
  const selectedDaySlots = selectedDay?.slots ?? [];
  const externalBookingHref = selectedEvent?.bookingUrl || overview?.profileUrl || fallbackCalPageHref;
  const canGoBack = rangeStart > getLocalDateKey();
  const isEmailValid = EMAIL_RE.test(formValues.email.trim());
  const canSchedule =
    Boolean(selectedEvent && selectedSlot && isEmailValid) && bookingState.status !== "submitting";
  const canStepBack = step !== "date";
  const canStepForward = step === "date" ? Boolean(selectedDateKey) : step === "time" ? Boolean(selectedSlot) : false;
  const stepNumber = STEP_ORDER.indexOf(step) + 1;

  useEffect(() => {
    setViewerTimeZone(getViewerTimeZone("Europe/Warsaw"));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setOverviewState({ status: "loading" });

    fetch("/api/cal/booking", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as CalOverviewResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Could not load booking options.");
        }

        return payload;
      })
      .then((payload) => {
        setOverviewState({ status: "ready", data: payload });
        setSelectedEventId(payload.defaultEventTypeId);
        setViewerTimeZone((current) => current || payload.timeZone || "UTC");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setOverviewState({
          status: "error",
          error: error instanceof Error ? error.message : "Could not load booking options.",
        });
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      eventTypeId: String(selectedEventId),
      start: rangeStart,
      end: rangeEnd,
      timeZone: viewerTimeZone,
    });

    setSlotsState({ status: "loading" });

    fetch(`/api/cal/booking/slots?${query.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as { ok?: boolean; slots?: CalSlotMap; error?: string };

        if (!response.ok || !payload.ok || !payload.slots) {
          throw new Error(payload.error || "Could not load availability.");
        }

        return payload.slots;
      })
      .then((slots) => {
        setSlotsState({ status: "ready", data: slots });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setSlotsState({
          status: "error",
          error: error instanceof Error ? error.message : "Could not load availability.",
        });
      });

    return () => controller.abort();
  }, [rangeEnd, rangeStart, selectedEventId, viewerTimeZone]);

  useEffect(() => {
    if (selectedDateKey && !buildDateRange(rangeStart).includes(selectedDateKey)) {
      setSelectedDateKey(null);
      setSelectedSlot(null);
      setStep("date");
    }
  }, [rangeStart, selectedDateKey]);

  function handleEventSelect(eventTypeId: number) {
    startTransition(() => {
      setSelectedEventId(eventTypeId);
      setSelectedLocationIndex(0);
      setSelectedDateKey(null);
      setSelectedSlot(null);
      setStep("date");
      setBookingState({ status: "idle" });
    });
  }

  function handleWeekShift(direction: -1 | 1) {
    if (direction === -1 && !canGoBack) {
      return;
    }

    startTransition(() => {
      setRangeStart(addDays(rangeStart, direction * RANGE_DAYS));
      setSelectedDateKey(null);
      setSelectedSlot(null);
      setStep("date");
      setBookingState({ status: "idle" });
    });
  }

  function handleDateSelect(dateKey: string) {
    startTransition(() => {
      setSelectedDateKey(dateKey);
      setSelectedSlot(null);
      setStep("time");
      setBookingState({ status: "idle" });
    });
  }

  function handleSlotSelect(slot: string) {
    startTransition(() => {
      setSelectedSlot(slot);
      setStep("details");
      setBookingState({ status: "idle" });
    });
  }

  function goToPreviousStep() {
    if (step === "details") {
      setStep("time");
      return;
    }

    if (step === "time") {
      setStep("date");
    }
  }

  function goToNextStep() {
    if (step === "date" && selectedDateKey) {
      setStep("time");
      return;
    }

    if (step === "time" && selectedSlot) {
      setStep("details");
    }
  }

  async function handleBookingSubmit() {
    if (!selectedEvent || !selectedSlot || !isEmailValid || bookingState.status === "submitting") {
      return;
    }

    setBookingState({ status: "submitting" });

    try {
      const response = await fetch("/api/cal/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventTypeId: selectedEvent.id,
          start: selectedSlot,
          name: formValues.name,
          email: formValues.email,
          notes: formValues.notes,
          timeZone: viewerTimeZone,
          location: selectedLocation,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        booking?: BookingSuccess;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.booking) {
        throw new Error(payload.error || "Could not create the booking.");
      }

      setBookingState({ status: "success", booking: payload.booking });
    } catch (error) {
      setBookingState({
        status: "error",
        error: error instanceof Error ? error.message : "Could not create the booking.",
      });
    }
  }

  async function handleCopyMeetingUrl(meetingUrl: string) {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.flowShell}>
        <header className={styles.header}>
          <div className={styles.headerLine}>
            <h2 className={styles.title}>Schedule a call</h2>
            <div className={styles.headerControls}>
              <span className={styles.stepCounter}>Step {stepNumber}</span>
              <div className={styles.stepNav} aria-label="Booking step navigation">
                <button
                  type="button"
                  className={styles.stepNavButton}
                  aria-label="Previous step"
                  onClick={goToPreviousStep}
                  disabled={!canStepBack}
                >
                  ←
                </button>
                <button
                  type="button"
                  className={styles.stepNavButton}
                  aria-label="Next step"
                  onClick={goToNextStep}
                  disabled={!canStepForward}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.body}>
          <div className={styles.sheetLayout}>
            <div className={styles.sheetAside}>
              {overviewState.status === "error" ? (
                <div className={styles.fallbackPanel}>
                  <span className={`section-label ${styles.metaTitle}`}>Booking unavailable</span>
                  <p className={styles.fallbackBody}>{overviewState.error}</p>
                  <a
                    href={externalBookingHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.primaryLink}
                  >
                    Open booking page
                  </a>
                </div>
              ) : overviewState.status === "loading" ? (
                <BookingSkeleton />
              ) : !overview || overview.eventTypes.length === 0 || !selectedEvent ? (
                <div className={styles.fallbackPanel}>
                  <span className={`section-label ${styles.metaTitle}`}>No public event types</span>
                  <p className={styles.fallbackBody}>The hosted Cal.com page is available as a fallback.</p>
                  <a
                    href={externalBookingHref}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.primaryLink}
                  >
                    Open booking page
                  </a>
                </div>
              ) : bookingState.status === "success" ? (
                <div className={`${styles.messagePanel} ${styles.successPanel}`}>
                  <span className={`section-label ${styles.metaTitle}`}>Booked</span>
                  <p className={styles.messageTitle}>Call scheduled</p>
                  <p className={styles.messageText}>
                    {formatSlotSummary(bookingState.booking.start, viewerTimeZone)}. Confirmation sent to{" "}
                    {bookingState.booking.attendeeEmail}.
                  </p>
                  {bookingState.booking.meetingUrl ? (
                    <button
                      type="button"
                      className={styles.copyLinkButton}
                      onClick={() => handleCopyMeetingUrl(bookingState.booking.meetingUrl!)}
                    >
                      <span>{bookingState.booking.meetingUrl}</span>
                      <span>
                        {copyStatus === "copied"
                          ? "Copied"
                          : copyStatus === "error"
                            ? "Copy failed"
                            : "Copy link"}
                      </span>
                    </button>
                  ) : null}
                  <a href={`mailto:${contactContent.email}`} className={`text-link ${styles.inlineLink}`}>
                    Email instead
                  </a>
                </div>
              ) : (
                <div className={styles.widgetSection}>
                  <div className={styles.guidedShell} data-step={step}>
                    <aside className={styles.contextPane}>
                      <div className={styles.utilityLinks}>
                        <a href={`mailto:${contactContent.email}`} className={`text-link ${styles.inlineLink}`}>
                          Email
                        </a>
                        <a
                          href={externalBookingHref}
                          target="_blank"
                          rel="noreferrer"
                          className={`text-link ${styles.inlineLink}`}
                        >
                          Cal.com
                        </a>
                      </div>

                      {overview.eventTypes.length > 1 ? (
                        <div className={styles.eventPicker} aria-label="Select call type">
                          {overview.eventTypes.map((eventType) => {
                            const isActive = eventType.id === selectedEvent.id;

                            return (
                              <button
                                key={eventType.id}
                                type="button"
                                className={styles.eventButton}
                                data-active={isActive}
                                onClick={() => handleEventSelect(eventType.id)}
                              >
                                <span className={styles.eventButtonTitle}>{eventType.title}</span>
                                <span className={styles.eventButtonMeta}>{eventType.lengthInMinutes} min</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={styles.singleEvent}>
                          <span className={`section-label ${styles.metaTitle}`}>Call type</span>
                          <p className={styles.eventTitle}>{selectedEvent.title}</p>
                          <p className={styles.eventBody}>{selectedEvent.lengthInMinutes} min</p>
                        </div>
                      )}
                    </aside>

                    <section className={styles.stepPane} aria-live="polite">
                      <div key={step} className={styles.stepContent}>
                        {step === "date" ? (
                          <>
                          <div className={styles.stepTop}>
                            <div>
                              <p className={styles.stepTitle}>{formatMonthRange(rangeStart, rangeEnd, viewerTimeZone)}</p>
                            </div>
                            <div className={styles.navGroup}>
                              <button
                                type="button"
                                className={styles.navButton}
                                onClick={() => handleWeekShift(-1)}
                                disabled={!canGoBack}
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                className={styles.navButton}
                                onClick={() => handleWeekShift(1)}
                              >
                                Next
                              </button>
                            </div>
                          </div>

                          {slotsState.status === "error" ? (
                            <div className={styles.inlineNotice}>
                              <p className={styles.messageText}>{slotsState.error}</p>
                            </div>
                          ) : (
                            <div className={styles.dateGrid}>
                              {slotDays.map((day) => (
                                <button
                                  key={day.dateKey}
                                  type="button"
                                  className={styles.dateButton}
                                  data-active={day.dateKey === selectedDateKey}
                                  data-loading={slotsState.status === "loading"}
                                  disabled={slotsState.status === "loading"}
                                  onClick={() => handleDateSelect(day.dateKey)}
                                >
                                  <span>{day.shortLabel}</span>
                                  <span>
                                    {slotsState.status === "loading"
                                      ? "..."
                                      : day.slots.length
                                        ? `${day.slots.length} slots`
                                        : "No slots"}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                          </>
                        ) : null}

                        {step === "time" ? (
                          <>
                          <div className={styles.stepTop}>
                            <div>
                              <p className={styles.stepTitle}>
                                {selectedDateKey ? formatLongDate(selectedDateKey, viewerTimeZone) : "Choose time"}
                              </p>
                            </div>
                          </div>

                          <div className={styles.timeGrid}>
                            {slotsState.status === "loading" ? (
                              SKELETON_SLOTS.map((slot) => <span key={slot} className={styles.skeletonSlot} />)
                            ) : selectedDaySlots.length ? (
                              selectedDaySlots.map((slot) => (
                                <button
                                  key={slot.start}
                                  type="button"
                                  className={styles.slotButton}
                                  data-active={selectedSlot === slot.start}
                                  onClick={() => handleSlotSelect(slot.start)}
                                >
                                  {formatSlotTime(slot.start, viewerTimeZone)}
                                </button>
                              ))
                            ) : (
                              <div className={styles.emptyState}>
                                <p className={styles.emptyText}>No availability on this date.</p>
                                <button
                                  type="button"
                                  className={styles.secondaryAction}
                                  onClick={() => {
                                    setSelectedDateKey(null);
                                    setSelectedSlot(null);
                                    setStep("date");
                                  }}
                                >
                                  Choose another date
                                </button>
                              </div>
                            )}
                          </div>
                          </>
                        ) : null}

                        {step === "details" ? (
                          <form
                          className={styles.formGrid}
                          onSubmit={(event) => {
                            event.preventDefault();
                            void handleBookingSubmit();
                          }}
                        >
                          <div className={styles.stepTop}>
                            <div>
                              <p className={styles.stepTitle}>
                                {selectedSlot ? formatSlotSummary(selectedSlot, viewerTimeZone) : "Add details"}
                              </p>
                            </div>
                          </div>

                          {selectedEvent.locations.length > 1 ? (
                            <label className={styles.field}>
                              <span className={`section-label ${styles.metaTitle}`}>Location</span>
                              <select
                                className={styles.input}
                                value={selectedLocationIndex}
                                onChange={(event) => setSelectedLocationIndex(Number(event.target.value))}
                              >
                                {selectedEvent.locations.map((location, index) => (
                                  <option key={`${location.type || "location"}-${index}`} value={index}>
                                    {getLocationLabel(location, index)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}

                          <div className={styles.formFields}>
                            <label className={styles.field}>
                              <span className={`section-label ${styles.metaTitle}`}>Name</span>
                              <input
                                className={styles.input}
                                type="text"
                                value={formValues.name}
                                onChange={(event) =>
                                  setFormValues((current) => ({ ...current, name: event.target.value }))
                                }
                                autoComplete="name"
                              />
                            </label>

                            <label className={styles.field}>
                              <span className={`section-label ${styles.metaTitle}`}>Email</span>
                              <input
                                className={styles.input}
                                type="email"
                                value={formValues.email}
                                onChange={(event) =>
                                  setFormValues((current) => ({ ...current, email: event.target.value }))
                                }
                                autoComplete="email"
                                required
                              />
                            </label>
                          </div>

                          {bookingState.status === "error" ? (
                            <p className={styles.formError}>{bookingState.error}</p>
                          ) : null}
                          </form>
                        ) : null}
                      </div>

                      <div className={styles.actionBar}>
                        <button
                          type="button"
                          className={styles.primaryLink}
                          disabled={!canSchedule}
                          onClick={() => void handleBookingSubmit()}
                        >
                          {bookingState.status === "submitting" ? "Booking..." : "Schedule call"}
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
