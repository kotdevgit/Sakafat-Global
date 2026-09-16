/**
 * A page renders an empty section rather than an error when Django cannot be
 * reached, which is right for a visitor but invisible to whoever is running the
 * project. Without this, a missing .env.local or a stopped backend looks exactly
 * like "there is no content yet", and there is nothing in any log to say
 * otherwise. These warnings go to the server console only.
 */
export function reportUnavailable(what: string, reason: unknown): void {
  const detail =
    reason instanceof Error ? reason.message : typeof reason === "string" ? reason : String(reason);
  console.warn(`[sakafat] ${what} could not be loaded — the section will render empty. ${detail}`);
}

/** The usual cause, so it is worth naming the fix rather than the symptom. */
export const missingApiBaseUrl =
  "Django's address is not configured. Copy frontend/.env.example to frontend/.env.local and restart the dev server.";
