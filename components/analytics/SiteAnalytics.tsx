import { DeferredSiteAnalytics } from "@/components/analytics/DeferredSiteAnalytics";

/**
 * Optional GA4 + Cloudflare Web Analytics.
 * Both load after the page is interactive so they stay off the preloader path.
 * Either script is omitted when its env var is unset.
 */
export function SiteAnalytics() {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const cfBeaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN?.trim();

  if (!gaMeasurementId && !cfBeaconToken) {
    return null;
  }

  return (
    <DeferredSiteAnalytics
      gaMeasurementId={gaMeasurementId || undefined}
      cfBeaconToken={cfBeaconToken || undefined}
    />
  );
}
