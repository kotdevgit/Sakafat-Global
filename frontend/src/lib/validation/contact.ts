/**
 * Enquiry field rules, shared by the browser form and the /api/contact route so
 * live validation and the server check can never drift apart. Django validates
 * independently — its endpoint is public, so the browser is never trusted.
 *
 * The rules report a message *code* rather than English text, so the same rule
 * produces the right sentence in whichever language the visitor is reading.
 * `resolveContactMessage` turns a code into words using the active dictionary.
 */
import { format, type Dictionary } from "@/lib/i18n/dictionary";

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
/**
 * A subject must start with a letter, digit or opening quote/bracket,
 * and contain only letters, numbers, spaces and standard enquiry punctuation
 * (hyphens, dashes, quotes, colons, slashes, commas, periods, brackets, hash, currency).
 * It rejects symbols like < > { } [ ] \ ^ ~ ` | = * @ % + ;.
 */
const SUBJECT = /^[\p{L}\p{N}'’"”“(][\p{L}\p{M}\p{N}\s'’"”“–—.,:;?!()/&#£$€\-]*$/u;
/** Free text still has to contain a letter, so "...." is not a subject. */
const HAS_LETTER = /\p{L}/u;

const PHONE_MIN_DIGITS = 7;
/** E.164 caps a number at 15 digits including the country code. */
const PHONE_MAX_DIGITS = 15;

/** Attachments are limited to 5 MB. */
export const maxAttachmentBytes = 5 * 1024 * 1024;

export const enquiryTypes = ["general", "programme", "creative", "partnership", "media", "other"] as const;

/**
 * The enquiry types the form offers, in the order they are listed. "other" is a
 * stored value Django accepts but the form does not present, so it is not here.
 * The words shown for each come from the dictionary, so the list reads in the
 * visitor's language while the stored value stays the same in both.
 */
export const offeredEnquiryTypes = ["general", "programme", "creative", "partnership", "media"] as const;

export type OfferedEnquiryType = (typeof offeredEnquiryTypes)[number];

/** The offered types paired with their words in the given language. */
export function enquiryOptions(dict: Dictionary): [OfferedEnquiryType, string][] {
  return offeredEnquiryTypes.map((type) => [type, dict.contact.form.enquiryOptions[type]]);
}

/** The anchor the enquiry form carries, so a call to action can land on it. */
export const enquiryFormId = "enquiry-form";

/**
 * Builds a link to the enquiry form with the enquiry already framed. Every call
 * to action across the site goes through this, so the type and subject a visitor
 * arrives with always match a type the form actually offers.
 */
export function enquiryHref(type: OfferedEnquiryType, subject: string): string {
  const query = new URLSearchParams({ type, subject });
  return `/contact?${query}#${enquiryFormId}`;
}

/** A failed check: the dictionary key for the sentence, plus anything it interpolates. */
export type ValidationIssue = {
  code: keyof Dictionary["validation"];
  values?: Record<string, string | number>;
};

export type FieldRule = {
  /** The name Django expects, so the route can map the payload in one place. */
  djangoField: string;
  required: boolean;
  maxLength: number;
  minLength?: number;
  pattern?: RegExp;
  /** Dictionary key for the message shown when `pattern` fails. */
  patternCode?: keyof Dictionary["validation"];
};

export const contactFields = {
  fullName: {
    djangoField: "full_name", required: true, maxLength: 150, minLength: 2,
    pattern: NAME, patternCode: "namePattern",
  },
  organisation: {
    djangoField: "organisation", required: false, maxLength: 200, minLength: 2,
    pattern: ORGANISATION, patternCode: "organisationPattern",
  },
  email: {
    djangoField: "email", required: true, maxLength: 254,
    pattern: EMAIL, patternCode: "emailPattern",
  },
  phone: {
    djangoField: "phone_number", required: true, maxLength: 30,
    pattern: PHONE, patternCode: "phonePattern",
  },
  location: {
    djangoField: "country_city", required: false, maxLength: 150, minLength: 2,
    pattern: PLACE, patternCode: "placePattern",
  },
  enquiryType: { djangoField: "enquiry_type", required: true, maxLength: 30 },
  subject: {
    djangoField: "subject", required: true, maxLength: 100, minLength: 3,
    pattern: SUBJECT, patternCode: "subjectPattern",
  },
  message: {
    djangoField: "message", required: true, maxLength: 500, minLength: 20,
    pattern: HAS_LETTER, patternCode: "messagePattern",
  },
  portfolio: { djangoField: "relevant_link", required: false, maxLength: 200 },
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
  subject: /[\p{L}\p{M}\p{N}\s'’"”“–—.,:;?!()/&#£$€\-]/u,
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
  if (field === "subject") {
    const singleLine = visible.replace(/[\r\n\t]+/gu, " ");
    const allowed = allowedCharacters.subject;
    return allowed ? Array.from(singleLine).filter((char) => allowed.test(char)).join("") : singleLine;
  }
  if (field === "message") {
    return visible.replace(/[<>]/gu, "");
  }

  const allowed = allowedCharacters[field];
  if (!allowed) return visible;
  const kept = Array.from(visible).filter((char) => allowed.test(char)).join("");
  // A + is only meaningful as a country-code prefix, so keep just a leading one.
  return field === "phone" ? kept.replace(/(?!^)\+/gu, "") : kept;
}

/**
 * Validates one field's raw input. Returns the issue to report, or null when the
 * value is acceptable. Empty optional fields are acceptable.
 */
export function validateField(field: ContactField, raw: string): ValidationIssue | null {
  const rule: FieldRule = contactFields[field];
  const value = raw.trim();

  if (!value) return rule.required ? { code: "required" } : null;
  if (value.length > rule.maxLength) return { code: "maxLength", values: { max: rule.maxLength } };
  if (rule.minLength && value.length < rule.minLength) {
    return { code: "minLength", values: { min: rule.minLength } };
  }

  if (field === "enquiryType") {
    return (enquiryTypes as readonly string[]).includes(value) ? null : { code: "enquiryTypeChoice" };
  }
  if (field === "portfolio") {
    return isWebAddress(value) ? null : { code: "urlPattern" };
  }
  if (field === "phone") {
    if (!rule.pattern?.test(value)) return { code: rule.patternCode ?? "invalid" };
    const digits = countDigits(value);
    if (digits < PHONE_MIN_DIGITS) return { code: "phoneMinDigits", values: { min: PHONE_MIN_DIGITS } };
    if (digits > PHONE_MAX_DIGITS) return { code: "phoneMaxDigits", values: { max: PHONE_MAX_DIGITS } };
    return null;
  }
  if (rule.pattern && !rule.pattern.test(value)) return { code: rule.patternCode ?? "invalid" };
  return null;
}

/** Validates every field at once. Returns a map of field name to issue. */
export function validateContact(
  values: Partial<Record<ContactField, string>>,
): Partial<Record<ContactField, ValidationIssue>> {
  const issues: Partial<Record<ContactField, ValidationIssue>> = {};
  for (const field of contactFieldNames) {
    const issue = validateField(field, values[field] ?? "");
    if (issue) issues[field] = issue;
  }
  return issues;
}

/**
 * Turns an issue into a sentence. The field's own name is supplied from the same
 * dictionary the form labels come from, so "Full name is required." and
 * "پورا نام ضروری ہے۔" are built from one rule and one label.
 */
export function resolveContactMessage(
  dict: Dictionary,
  field: ContactField,
  issue: ValidationIssue,
): string {
  return format(dict.validation[issue.code], {
    label: dict.contact.form.labels[field],
    ...issue.values,
  });
}

/** Resolves a whole map of issues at once, for rendering or for an API reply. */
export function resolveContactMessages(
  dict: Dictionary,
  issues: Partial<Record<ContactField, ValidationIssue>>,
): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const [field, issue] of Object.entries(issues)) {
    if (issue) messages[field] = resolveContactMessage(dict, field as ContactField, issue);
  }
  return messages;
}
