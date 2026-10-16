"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import { useClientMounted } from "@/lib/useClientMounted";

type DeferredSiteAnalyticsProps = {
  gaMeasurementId?: string;
  cfBeaconToken?: string;
};

/**
 * Injects analytics only after hydration so Next.js does not emit
 * first-load `<link rel="preload">` tags for gtag or the CF beacon.
 */
export function DeferredSiteAnalytics({
  gaMeasurementId,
  cfBeaconToken,
}: DeferredSiteAnalyticsProps) {
  const mounted = useClientMounted();

  if (!mounted) {
    return null;
  }

  return (
    <>
      {gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
      {cfBeaconToken ? (
        <Script
          id="cf-web-analytics"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon={JSON.stringify({ token: cfBeaconToken })}
        />
      ) : null}
    </>
  );
}
