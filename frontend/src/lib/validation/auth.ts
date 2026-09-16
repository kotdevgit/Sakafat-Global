/**
 * Account field rules, shared by the auth form and the /api/auth route.
 *
 * Django stays authoritative for the checks that cannot be made in a browser —
 * the common-password list, similarity to the username, and whether an account
 * already exists. These rules catch the rest before a request is made, and the
 * messages deliberately promise nothing Django would then contradict.
 */

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

function validatePassword(value: string, username: string): string | null {
  if (value.length < passwordMinLength) {
    return `Password must be at least ${passwordMinLength} characters.`;
  }
  if (value.length > passwordMaxLength) {
    return `Password must be ${passwordMaxLength} characters or fewer.`;
  }
  if (ALL_DIGITS.test(value)) return "Password cannot be only numbers.";
  if (username && value.toLowerCase().includes(username.toLowerCase())) {
    return "Password cannot contain your username.";
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
): string | null {
  const value = field === "password" || field === "new_password" || field === "confirmPassword"
    ? raw
    : raw.trim();

  switch (field) {
    case "username":
      if (!value) return "Username is required.";
      if (value.length > usernameMaxLength) {
        return `Username must be ${usernameMaxLength} characters or fewer.`;
      }
      if (context === "login") return null;
      if (value.length < 3) return "Username must be at least 3 characters.";
      return USERNAME.test(value)
        ? null
        : "Use letters, digits and . @ + - _ only — no spaces.";

    case "email":
      if (!value) return "Email address is required.";
      if (value.length > emailMaxLength) {
        return `Email address must be ${emailMaxLength} characters or fewer.`;
      }
      return EMAIL.test(value) ? null : "Enter a complete email address, such as name@example.com.";

    case "password":
    case "new_password":
      if (!value) return "Password is required.";
      return context === "login" ? null : validatePassword(value, username);

    case "confirmPassword":
      if (!value) return "Please confirm your password.";
      return value === password ? null : "Enter the same password in both fields.";

    case "otp":
      if (!value) return "Verification code is required.";
      return SIX_DIGITS.test(value) ? null : `Enter the ${otpLength}-digit code from your email.`;
  }
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
