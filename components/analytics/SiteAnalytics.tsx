import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

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
