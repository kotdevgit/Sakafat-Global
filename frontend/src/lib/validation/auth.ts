/**
 * Account field rules, shared by the auth form and the /api/auth route.
 *
 * Django stays authoritative for the checks that cannot be made in a browser —
 * the common-password list, similarity to the username, and whether an account
 * already exists. These rules catch the rest before a request is made, and the
 * messages deliberately promise nothing Django would then contradict.
 */

import { format, type Dictionary } from "@/lib/i18n/dictionary";

/** A failed check: the dictionary key for the sentence, plus anything it interpolates. */
export type AuthIssue = {
  code: keyof Dictionary["validation"];
  values?: Record<string, string | number>;
};

/** Django's own username rule: letters, digits and . @ + - _ in any script. */
const USERNAME = /^[\w.@+-]+$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
const SIX_DIGITS = /^\d{6}$/u;
/** Django rejects an all-numeric password, so the form says so first. */
const ALL_DIGITS = /^\d+$/u;

export const usernameMaxLength = 150;
export const emailMaxLength = 254;
export const passwordMinLength = 8;
export const passwordMaxLength = 128;
export const otpLength = 6;

export type AuthField = "username" | "email" | "password" | "new_password" | "confirmPassword" | "otp";

/**
 * Existing accounts predate any rule tightening, so signing in only checks that
 * something was entered. The strict shape rules belong to registration.
 */
export type AuthContext = "login" | "register";

function validatePassword(value: string, username: string): AuthIssue | null {
  if (value.length < passwordMinLength) {
    return { code: "passwordMinLength", values: { min: passwordMinLength } };
  }
  if (value.length > passwordMaxLength) {
    return { code: "passwordMaxLength", values: { max: passwordMaxLength } };
  }
  if (ALL_DIGITS.test(value)) return { code: "passwordAllNumbers" };
  if (username && value.toLowerCase().includes(username.toLowerCase())) {
    return { code: "passwordContainsUsername" };
  }
  return null;
}

/**
 * Validates one field. `username` is supplied so a password can be checked
 * against it; `confirm` is the other password when checking a match.
 */
export function validateAuthField(
  field: AuthField,
  raw: string,
  { context = "register", username = "", password = "" }: {
    context?: AuthContext;
    username?: string;
    password?: string;
  } = {},
): AuthIssue | null {
  const value = field === "password" || field === "new_password" || field === "confirmPassword"
    ? raw
    : raw.trim();

  switch (field) {
    case "username":
      if (!value) return { code: "usernameRequired" };
      if (value.length > usernameMaxLength) {
        return { code: "usernameMaxLength", values: { max: usernameMaxLength } };
      }
      if (context === "login") return null;
      if (value.length < 3) return { code: "usernameMinLength", values: { min: 3 } };
      return USERNAME.test(value) ? null : { code: "usernamePattern" };

    case "email":
      if (!value) return { code: "emailRequired" };
      if (value.length > emailMaxLength) {
        return { code: "emailMaxLength", values: { max: emailMaxLength } };
      }
      return EMAIL.test(value) ? null : { code: "emailPattern" };

    case "password":
    case "new_password":
      if (!value) return { code: "passwordRequired" };
      return context === "login" ? null : validatePassword(value, username);

    case "confirmPassword":
      if (!value) return { code: "confirmPasswordRequired" };
      return value === password ? null : { code: "confirmPasswordMismatch" };

    case "otp":
      if (!value) return { code: "otpRequired" };
      return SIX_DIGITS.test(value) ? null : { code: "otpPattern", values: { length: otpLength } };
  }
}

/** Turns an issue into a sentence in the language being read. */
export function resolveAuthMessage(dict: Dictionary, issue: AuthIssue): string {
  return format(dict.validation[issue.code], issue.values);
}

/** Characters each restricted field accepts; everything else is dropped as typed. */
const allowedCharacters: Partial<Record<AuthField, RegExp>> = {
  username: /[\w.@+-]/u,
  otp: /\d/u,
};

/**
 * Strips the characters a field does not accept. Passwords and email addresses
 * are returned untouched — filtering a password would silently change it, and an
 * address is better validated than censored.
 */
export function filterAuthValue(field: AuthField, value: string): string {
  const allowed = allowedCharacters[field];
  if (!allowed) return value;
  const kept = Array.from(value).filter((char) => allowed.test(char)).join("");
  return field === "otp" ? kept.slice(0, otpLength) : kept;
}
