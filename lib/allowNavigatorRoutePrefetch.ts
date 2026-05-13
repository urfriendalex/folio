type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
};

/**
 * Shared gate for `router.prefetch` / intent-based route warming.
 * Skip on save-data and very slow connections so we don't spend bandwidth speculatively.
 */
export function allowNavigatorRoutePrefetch(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (navigator as NavigatorWithConnection).connection;

  if (!connection) {
    return true;
  }

  if (connection.saveData) {
    return false;
  }

  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g";
}
