/** Public endpoint only; Django owns authentication, business rules, and data. */
export function getApiBaseUrl(): string {
  const value = process.env.DJANGO_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) {
    throw new Error("Set DJANGO_API_BASE_URL in .env.local before connecting to Django.");
  }
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must use HTTP or HTTPS.");
  }
  return value.endsWith("/") ? value : `${value}/`;
}
