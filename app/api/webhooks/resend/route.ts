import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
/** Large inbound messages + raw download can exceed the default function timeout. */
export const maxDuration = 60;

function resolveForwardFrom(): string | null {
  const explicit = process.env.INBOUND_FORWARD_FROM?.trim();
  if (explicit) return explicit;
  const fromResend = process.env.RESEND_FROM?.trim();
  if (fromResend) return fromResend;
  return null;
}

/**
 * Resend Inbound: add this URL in Resend → Webhooks, event `email.received`.
 * Verifies the Svix signature, then optionally forwards the message with
 * `emails.receiving.forward` (same behavior as the Resend “forward” guide).
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;

  if (!webhookSecret || !apiKey) {
    return new NextResponse("Resend webhooks are not configured.", { status: 503 });
  }

  const raw = await req.text();
  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return new NextResponse("Missing Svix signature headers", { status: 400 });
  }

  const resend = new Resend(apiKey);
  let result: ReturnType<Resend["webhooks"]["verify"]>;
  try {
    result = resend.webhooks.verify({
      payload: raw,
      headers: { id, timestamp, signature },
      webhookSecret: webhookSecret,
    });
  } catch {
    return new NextResponse("Invalid webhook signature", { status: 400 });
  }

  if (result.type !== "email.received") {
    return NextResponse.json({ ok: true });
  }

  const forwardTo = process.env.INBOUND_FORWARD_TO?.trim();
  if (!forwardTo) {
    return NextResponse.json({ ok: true, forwarded: false });
  }

  const from = resolveForwardFrom();
  if (!from) {
    console.error(
      "INBOUND_FORWARD_TO is set; set INBOUND_FORWARD_FROM or RESEND_FROM for the forward sender.",
    );
    return new NextResponse("Forward From address not configured", { status: 503 });
  }

  const { data, error } = await resend.emails.receiving.forward({
    emailId: result.data.email_id,
    to: forwardTo,
    from,
  });

  if (error) {
    console.error("resend.emails.receiving.forward:", error.message);
    return new NextResponse(error.message, { status: 502 });
  }

  return NextResponse.json({ ok: true, forwarded: true, id: data?.id });
}
