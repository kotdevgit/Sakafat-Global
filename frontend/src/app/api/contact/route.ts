import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";
import {
  contactFieldNames,
  contactFields,
  maxAttachmentBytes,
  resolveContactMessage,
  validateField,
  type ContactField,
} from "@/lib/validation/contact";
import { getDictionary } from "@/lib/i18n/dictionary";
import { localeFromRequest } from "@/lib/i18n/request";

/** Maps Django field names back to the browser field names the form marks up. */
const browserFieldFor: Record<string, string> = Object.fromEntries(
  contactFieldNames.map((field) => [contactFields[field].djangoField, field]),
);

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  // The browser calls this from both language trees, so the reply is written in
  // whichever language the page that sent it is being read in.
  const dict = getDictionary(localeFromRequest(request));
  const api = dict.api.contact;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || new URL(request.url).host;
  let sameOrigin = false;
  try {
    sameOrigin = Boolean(
      origin && new URL(origin).host === host && ["http:", "https:"].includes(new URL(origin).protocol),
    );
  } catch {
    /* Invalid origins are rejected. */
  }
  if (!sameOrigin) return reply({ message: api.wrongOrigin }, 403);

  let submitted: FormData;
  try {
    submitted = await request.formData();
  } catch {
    return reply({ message: api.malformed }, 400);
  }

  // The browser validates the same rules live, but it is not trusted: every field
  // is checked again here before anything reaches Django.
  const errors: Record<string, string> = {};
  const payload = new FormData();
  for (const field of contactFieldNames) {
    const raw = submitted.get(field);
    const value = typeof raw === "string" ? raw.trim() : "";
    const issue = validateField(field as ContactField, value);
    if (issue) {
      errors[field] = resolveContactMessage(dict, field as ContactField, issue);
      continue;
    }
    if (value) payload.set(contactFields[field].djangoField, value);
  }
  if (submitted.get("consent") !== "true") {
    errors.consent = dict.validation.consentRequired;
  }
  payload.set("consent", "true");

  const attachment = submitted.get("attachment");
  if (attachment instanceof File && attachment.size > 0) {
    if (attachment.size > maxAttachmentBytes) errors.attachment = dict.validation.attachmentTooLarge;
    else payload.set("attachment", attachment, attachment.name);
  }

  if (Object.keys(errors).length > 0) {
    return reply({ message: api.checkFields, errors }, 400);
  }

  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return reply({ message: api.unavailable }, 503);
  }

  try {
    const upstream = await fetch(new URL("contact/", base), {
      method: "POST",
      headers: { Accept: "application/json" },
      body: payload,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    if (upstream.status >= 500) {
      return reply({ message: api.upstreamError }, 502);
    }
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({}) as Record<string, unknown>);
      const fieldErrors: Record<string, string> = {};
      for (const [djangoField, value] of Object.entries(data)) {
        const text = typeof value === "string"
          ? value
          : Array.isArray(value)
            ? value.filter((item) => typeof item === "string").join(" ")
            : "";
        if (!text) continue;
        fieldErrors[browserFieldFor[djangoField] ?? djangoField] = text;
      }
      return reply(
        {
          message: fieldErrors.non_field_errors || fieldErrors.detail || api.checkFields,
          errors: fieldErrors,
        },
        upstream.status,
      );
    }
    // Django echoes the stored record; the browser only needs confirmation.
    return reply({ message: api.received });
  } catch {
    return reply({ message: api.unreachable }, 503);
  }
}
