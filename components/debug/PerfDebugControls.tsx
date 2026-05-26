"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  buildPerfOffShareUrl,
  clearPerfFlags,
  getActivePerfOffFlags,
  getPerfDebugPanelOpenPreference,
  isPerfDebugPanelEnabled,
  PERF_EXPERIMENT_OPTIONS,
  setPerfDebugPanelOpen,
  setPerfFlagEnabled,
  subscribePerfExperiments,
  type PerfExperimentFlag,
} from "@/lib/perfExperiments";
import styles from "./PerfDebugControls.module.scss";

function subscribeOpenPreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("folio:perf-debug-panel", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("folio:perf-debug-panel", handler);
  };
}

function getOpenPreferenceSnapshot(): boolean {
  return getPerfDebugPanelOpenPreference();
}

export function PerfDebugControls() {
  const enabled = isPerfDebugPanelEnabled();
  const [panelOpen, setPanelOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [reloadHint, setReloadHint] = useState<string | null>(null);

  const activeFlags = useSyncExternalStore(
    subscribePerfExperiments,
    getActivePerfOffFlags,
    () => [] as PerfExperimentFlag[],
  );

  const storedOpen = useSyncExternalStore(
    subscribeOpenPreference,
    getOpenPreferenceSnapshot,
    () => false,
  );

  useEffect(() => {
    if (storedOpen) {
      setPanelOpen(true);
    }
  }, [storedOpen]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "`" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      event.preventDefault();
      setPanelOpen((open) => {
        const next = !open;
        setPerfDebugPanelOpen(next);
        window.dispatchEvent(new CustomEvent("folio:perf-debug-panel"));
        return next;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => {
      const next = !open;
      setPerfDebugPanelOpen(next);
      window.dispatchEvent(new CustomEvent("folio:perf-debug-panel"));
      return next;
    });
  }, []);

  const handleToggleFlag = useCallback((flag: PerfExperimentFlag, checked: boolean) => {
    const option = PERF_EXPERIMENT_OPTIONS.find((entry) => entry.flag === flag);
    setPerfFlagEnabled(flag, checked);

    if (option?.reloadRecommended) {
      setReloadHint(`${option.label}: reload the page to apply.`);
      return;
    }

    setReloadHint(null);
  }, []);

  const handleClear = useCallback(() => {
    clearPerfFlags();
    setReloadHint(null);
    setCopyStatus(null);
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = buildPerfOffShareUrl();

    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("Link copied");
    } catch {
      setCopyStatus(url);
    }
  }, []);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  if (!enabled) {
    return null;
  }

  const activeCount = activeFlags.length;

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.launcher}
        data-active={activeCount > 0}
        aria-expanded={panelOpen}
        aria-controls="perf-debug-panel"
        onClick={togglePanel}
      >
        <span>Perf</span>
        {activeCount > 0 ? <span>({activeCount} off)</span> : null}
        <span aria-hidden="true">{panelOpen ? "▾" : "▸"}</span>
      </button>

      {panelOpen ? (
        <div id="perf-debug-panel" className={styles.panel} role="region" aria-label="Performance experiments">
          <div className={styles.header}>
            <div>
              <p className={styles.title}>Perf bisect</p>
              <p className={styles.subtitle}>Disable subsystems to find jank · ` backtick toggles panel</p>
            </div>
          </div>

          <ul className={styles.list}>
            {PERF_EXPERIMENT_OPTIONS.map((option) => (
              <li key={option.flag}>
                <label className={styles.option}>
                  <input
                    type="checkbox"
                    checked={activeFlags.includes(option.flag)}
                    onChange={(event) => handleToggleFlag(option.flag, event.target.checked)}
                  />
                  <span className={styles.optionLabel}>{option.label}</span>
                  <span className={styles.optionHint}>{option.hint}</span>
                </label>
              </li>
            ))}
          </ul>

          {reloadHint ? <p className={styles.notice}>{reloadHint}</p> : null}

          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={handleClear}>
              Clear all
            </button>
            <button type="button" className={styles.button} onClick={handleCopyLink}>
              Copy link
            </button>
            <button type="button" className={styles.buttonPrimary} onClick={handleReload}>
              Reload
            </button>
          </div>

          {copyStatus ? <p className={styles.notice}>{copyStatus}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
