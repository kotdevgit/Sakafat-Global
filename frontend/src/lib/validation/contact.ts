/**
 * Enquiry field rules, shared by the browser form and the /api/contact route so
 * live validation and the server check can never drift apart. Django validates
 * independently — its endpoint is public, so the browser is never trusted.
 */

/**
 * Letters of any script, plus the joiners real names use. Urdu and Arabic names
 * must pass as readily as Latin ones, so this is not limited to A-Z; digits and
 * symbols are what it rejects.
 */
const NAME = /^\p{L}[\p{L}\p{M} '’.-]*$/u;
/** As above, plus digits and the punctuation organisation names carry. */
const ORGANISATION = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} &'’.,()/-]*$/u;
/** Place names: letters and the separators between a city and a country. */
const PLACE = /^\p{L}[\p{L}\p{M} '’.,-]*$/u;
/** Digits with the punctuation phone numbers are written with; length checked separately. */
const PHONE = /^\+?[\d\s()-]+$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
/** Free text still has to contain a letter, so "...." is not a subject. */
const HAS_LETTER = /\p{L}/u;

const PHONE_MIN_DIGITS = 7;
/** E.164 caps a number at 15 digits including the country code. */
const PHONE_MAX_DIGITS = 15;

export const enquiryTypes = ["general", "programme", "creative", "partnership", "media", "other"] as const;

export type FieldRule = {
  /** The name Django expects, so the route can map the payload in one place. */
  djangoField: string;
  label: string;
  required: boolean;
  maxLength: number;
  minLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
};

export const contactFields = {
  fullName: {
    djangoField: "full_name", label: "Full name", required: true, maxLength: 150, minLength: 2,
    pattern: NAME,
    patternMessage: "Use letters only — spaces, hyphens and apostrophes are fine, but not digits.",
  },
  organisation: {
    djangoField: "organisation", label: "Organisation", required: false, maxLength: 200, minLength: 2,
    pattern: ORGANISATION,
    patternMessage: "Use letters, numbers and standard punctuation.",
  },
  email: {
    djangoField: "email", label: "Email address", required: true, maxLength: 254,
    pattern: EMAIL,
    patternMessage: "Enter a complete email address, such as name@example.com.",
  },
  phone: {
    djangoField: "phone_number", label: "Phone number", required: true, maxLength: 30,
    pattern: PHONE,
    patternMessage: "Use digits, and optionally a leading + for the country code.",
  },
  location: {
    djangoField: "country_city", label: "Country and city", required: false, maxLength: 150, minLength: 2,
    pattern: PLACE,
    patternMessage: "Use letters only — for example, Pakistan, Lahore.",
  },
  enquiryType: { djangoField: "enquiry_type", label: "Enquiry type", required: true, maxLength: 30 },
  subject: {
    djangoField: "subject", label: "Subject", required: true, maxLength: 100, minLength: 3,
    pattern: HAS_LETTER, patternMessage: "Describe your enquiry in a few words.",
  },
  message: {
    djangoField: "message", label: "Message", required: true, maxLength: 500, minLength: 20,
    pattern: HAS_LETTER, patternMessage: "Tell us a little about your enquiry.",
  },
  portfolio: { djangoField: "relevant_link", label: "Relevant link or portfolio", required: false, maxLength: 200 },
} as const satisfies Record<string, FieldRule>;

export type ContactField = keyof typeof contactFields;
export const contactFieldNames = Object.keys(contactFields) as ContactField[];

function countDigits(value: string): number {
  return (value.match(/\d/gu) ?? []).length;
}

/** True for an http(s) address with a real host, which is all Django's URLField stores. */
function isWebAddress(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Characters each restricted field accepts; everything else is dropped as typed. */
const allowedCharacters: Partial<Record<ContactField, RegExp>> = {
  fullName: /[\p{L}\p{M} '’.-]/u,
  organisation: /[\p{L}\p{M}\p{N} &'’.,()/-]/u,
  location: /[\p{L}\p{M} '’.,-]/u,
  phone: /[\d+\s()-]/u,
};

/**
 * Invisible characters: control codes, zero-width joiners and bidirectional
 * overrides. Nobody types these deliberately, and they can disguise what a
 * message actually says, so they are stripped everywhere.
 */
const INVISIBLE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/gu;

/**
 * Strips the characters a field does not accept.
 *
 * Subject and message stay free text on purpose — a real enquiry may quote a
 * budget or a reference number, and filtering those would fight the visitor
 * rather than help them. They are held to length limits instead, and only
 * invisible characters are removed. A subject is one line, so newlines pasted
 * into it collapse to spaces.
 */
export function filterValue(field: ContactField, value: string): string {
  // The maxlength attribute stops typing and pasting past the limit, but not an
  // autofilled or scripted value, so the cap is applied here as well.
  const visible = value.replace(INVISIBLE, "").slice(0, contactFields[field].maxLength);
  if (field === "subject") return visible.replace(/[\r\n\t]+/gu, " ");
  if (field === "message") return visible;

  const allowed = allowedCharacters[field];
  if (!allowed) return visible;
  const kept = Array.from(visible).filter((char) => allowed.test(char)).join("");
  // A + is only meaningful as a country-code prefix, so keep just a leading one.
  return field === "phone" ? kept.replace(/(?!^)\+/gu, "") : kept;
}

/**
 * Validates one field's raw input. Returns the message to show, or null when the
 * value is acceptable. Empty optional fields are acceptable.
 */
export function validateField(field: ContactField, raw: string): string | null {
  const rule: FieldRule = contactFields[field];
  const value = raw.trim();

  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length > rule.maxLength) {
    return `${rule.label} must be ${rule.maxLength} characters or fewer.`;
  }
  if (rule.minLength && value.length < rule.minLength) {
    return `${rule.label} must be at least ${rule.minLength} characters.`;
  }

  if (field === "enquiryType") {
    return (enquiryTypes as readonly string[]).includes(value)
      ? null
      : "Choose one of the listed enquiry types.";
  }
  if (field === "portfolio") {
    return isWebAddress(value) ? null : "Enter a full link starting with https://";
  }
  if (field === "phone") {
    if (!rule.pattern?.test(value)) return rule.patternMessage ?? null;
    const digits = countDigits(value);
    if (digits < PHONE_MIN_DIGITS) return `Phone number must include at least ${PHONE_MIN_DIGITS} digits.`;
    if (digits > PHONE_MAX_DIGITS) return `Phone number must include no more than ${PHONE_MAX_DIGITS} digits.`;
    return null;
  }
  if (rule.pattern && !rule.pattern.test(value)) return rule.patternMessage ?? `${rule.label} is not valid.`;
  return null;
}

/** Validates every field at once. Returns a map of field name to message. */
export function validateContact(values: Partial<Record<ContactField, string>>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of contactFieldNames) {
    const message = validateField(field, values[field] ?? "");
    if (message) errors[field] = message;
  }
  return errors;
}
