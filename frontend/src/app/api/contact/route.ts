import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/config";

/** Enquiry fields Django accepts, with the browser field name that supplies each. */
const textFields: [browserField: string, djangoField: string, maxLength: number][] = [
  ["fullName", "full_name", 150],
  ["organisation", "organisation", 200],
  ["email", "email", 254],
  ["phone", "phone_number", 30],
  ["location", "country_city", 150],
  ["enquiryType", "enquiry_type", 30],
  ["subject", "subject", 255],
  ["message", "message", 5000],
  ["portfolio", "relevant_link", 200],
];
const requiredFields = new Set(["fullName", "email", "enquiryType", "subject", "message"]);
const enquiryTypes = new Set(["general", "partnership", "programme", "creative", "media", "other"]);
const maxAttachmentBytes = 5 * 1024 * 1024;

/** Maps Django field names back to the browser field names the form marks up. */
const browserFieldFor: Record<string, string> = Object.fromEntries(
  textFields.map(([browserField, djangoField]) => [djangoField, browserField]),
);

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
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
  if (!sameOrigin) return reply({ message: "Please submit this form from the Sakafat website." }, 403);

  let submitted: FormData;
  try {
    submitted = await request.formData();
  } catch {
    return reply({ message: "Please check your form and try again." }, 400);
  }

  const errors: Record<string, string> = {};
  const payload = new FormData();
  for (const [browserField, djangoField, maxLength] of textFields) {
    const raw = submitted.get(browserField);
    if (typeof raw !== "string") {
      if (requiredFields.has(browserField)) errors[browserField] = "This field is required.";
      continue;
    }
    const value = raw.trim();
    if (!value) {
      if (requiredFields.has(browserField)) errors[browserField] = "This field is required.";
      continue;
    }
    if (value.length > maxLength) {
      errors[browserField] = `Please use ${maxLength} characters or fewer.`;
      continue;
    }
    payload.set(djangoField, value);
  }
  if (payload.has("enquiry_type") && !enquiryTypes.has(String(payload.get("enquiry_type")))) {
    errors.enquiryType = "Choose one of the listed enquiry types.";
  }
  if (submitted.get("consent") !== "true") {
    errors.consent = "Please confirm you agree before sending.";
  }
  payload.set("consent", "true");

  const attachment = submitted.get("attachment");
  if (attachment instanceof File && attachment.size > 0) {
    if (attachment.size > maxAttachmentBytes) errors.attachment = "Attachments must be 5 MB or smaller.";
    else payload.set("attachment", attachment, attachment.name);
  }

  if (Object.keys(errors).length > 0) {
    return reply({ message: "Please check the highlighted fields.", errors }, 400);
  }

  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return reply({ message: "Enquiries are not available yet. Please try again later." }, 503);
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
      return reply({ message: "We couldn’t send your enquiry. Please try again later." }, 502);
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
          message: fieldErrors.non_field_errors || fieldErrors.detail || "Please check the highlighted fields.",
          errors: fieldErrors,
        },
        upstream.status,
      );
    }
    // Django echoes the stored record; the browser only needs confirmation.
    return reply({ message: "Thank you. Your enquiry has been received and a confirmation email is on its way." });
  } catch {
    return reply({ message: "We couldn’t reach enquiry services. Please try again shortly." }, 503);
  }
}
