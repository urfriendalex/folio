import { NextResponse, type NextRequest } from "next/server";
import { SCHEDULE_CALL_HASH } from "@/components/booking/calBooking";
import { redirectForSocialBooking } from "@/lib/socialBookingRedirect";

/**
 * Hash links break in bios (`#` becomes `%23` and is sent as a path).
 * `/book` and `/schedule-call` are the links to share; this sends them, the
 * encoded form, and `?schedule=call` to the existing `/#schedule-call` overlay.
 */
export function proxy(request: NextRequest) {
  const redirectUrl = redirectForSocialBooking(request.nextUrl, SCHEDULE_CALL_HASH);

  if (!redirectUrl) {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.pathname = redirectUrl.pathname;
  destination.search = redirectUrl.search;
  destination.hash = redirectUrl.hash;

  return NextResponse.redirect(destination);
}

export const config = {
  matcher: [
    "/book",
    "/schedule-call",
    // `%23` is `#` left encoded in the path. The decoded form is matched too,
    // because the router tries both before invoking this proxy.
    "/(.*%23.*)",
    "/(.*#.*)",
    {
      source: "/:path*",
      has: [{ type: "query", key: "schedule", value: "call" }],
    },
  ],
};
