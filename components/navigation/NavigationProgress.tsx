"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./NavigationProgress.module.scss";

const MATRIX_COLUMNS = 9;
const MATRIX_ROWS = 5;
const MATRIX_CELLS = MATRIX_COLUMNS * MATRIX_ROWS;

type StartNavigation = (callback: () => void, showGlobalFeedback?: boolean) => void;

const NavigationContext = createContext<{
  isPendingNav: boolean;
  showGlobalFeedback: boolean;
  startNavigation: StartNavigation;
} | null>(null);

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const [isPendingNav, startTransition] = useTransition();
  const [globalFeedbackEnabled, setGlobalFeedbackEnabled] = useState(true);
  const startNavigation = useCallback<StartNavigation>(
    (callback, showGlobalFeedback = true) => {
      setGlobalFeedbackEnabled(showGlobalFeedback);
      startTransition(callback);
    },
    [startTransition],
  );
  const showGlobalFeedback = isPendingNav && globalFeedbackEnabled;
  const value = useMemo(
    () => ({ isPendingNav, showGlobalFeedback, startNavigation }),
    [isPendingNav, showGlobalFeedback, startNavigation],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-hidden={!showGlobalFeedback}
        className={styles.status}
        data-visible={showGlobalFeedback ? "true" : "false"}
      >
        <div className={styles.loader}>
          <div className={styles.matrix} aria-hidden="true">
            {Array.from({ length: MATRIX_CELLS }, (_, cellIndex) => (
              <span
                key={cellIndex}
                className={styles.cell}
                style={{ "--cell-index": cellIndex } as CSSProperties}
              />
            ))}
          </div>
          <span className={styles.label}>{showGlobalFeedback ? "LOADING" : ""}</span>
        </div>
      </div>
    </NavigationContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error("NavigationProgressProvider is required");
  }

  return context;
}
