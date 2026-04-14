import { Resend } from "resend";
import { contactContent } from "@/content/contact";

export const runtime = "nodejs";

const MAX_NAME = 200;
const MAX_MESSAGE = 8000;

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
};

function parsePayload(body: ContactPayload) {
  const name =
    typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim() : "";
  const message =
    typeof body.message === "string" ? body.message.trim() : "";

  if (!name || name.length > MAX_NAME) {
    return { ok: false as const, error: "Please enter your name." };
  }
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return { ok: false as const, error: "Please enter a valid email address." };
  }
  if (!message || message.length > MAX_MESSAGE) {
    return { ok: false as const, error: "Please enter a message." };
  }

  return { ok: true as const, name, email, message };
}

export async function POST(request: Request) {
  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = parsePayload(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { name, email, message } = parsed;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Email is not configured on the server." },
      { status: 503 },
    );
  }

  const to = process.env.CONTACT_TO ?? contactContent.email;
  const from =
    process.env.RESEND_FROM ?? "Folio Contact <yansons.folio.contact@alkouka.resend.app>";

  const resend = new Resend(apiKey);
  const subject = `Portfolio: message from ${name}`;
  const html = `
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
  `;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    replyTo: email,
    html,
  });

  if (error) {
    const dev = process.env.NODE_ENV === "development";
    let message = error.message;
    if (dev && /domain/i.test(message) && /invalid/i.test(message)) {
      message = `${message} Verify the domain in Resend (Domains), then set RESEND_FROM to an address @ that domain — or remove RESEND_FROM to use the default test sender.`;
    }
    return Response.json(
      {
        error: dev ? message : "Could not send your message. Please try again or email directly.",
      },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
