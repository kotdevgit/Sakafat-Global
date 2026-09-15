import { getApiBaseUrl } from "./config";

/** Mirrors Django's Episode serializer; Django remains the authority for these values. */
export type Episode = {
  id: number;
  title: string;
  slug: string;
  category: string;
  categoryLabel: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string;
  videoUrl: string | null;
};

function toEpisode(entry: Record<string, unknown>, base: string): Episode | null {
  const { id, title, slug, category, description } = entry;
  if (typeof id !== "number" || typeof title !== "string" || typeof slug !== "string") return null;
  if (typeof category !== "string" || typeof description !== "string") return null;
  const absolute = (value: unknown): string | null => {
    if (typeof value !== "string" || !value) return null;
    try {
      // Django returns a relative media path unless the request reaches it absolutely.
      return new URL(value, base).toString();
    } catch {
      return null;
    }
  };
  return {
    id,
    title,
    slug,
    category,
    categoryLabel: typeof entry.category_label === "string" ? entry.category_label : category,
    description,
    imageUrl: absolute(entry.image),
    imageAlt: typeof entry.image_alt === "string" ? entry.image_alt : "",
    videoUrl: absolute(entry.video_url),
  };
}

/**
 * Reads the published episodes from Django.
 * Returns an empty list when the backend is unavailable so a page still renders.
 */
export async function getEpisodes(): Promise<Episode[]> {
  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return [];
  }
  try {
    const response = await fetch(new URL("episode/", base), {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      // Episodes change through the admin, so refresh them on a short cycle.
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    const entries = Array.isArray(data)
      ? data
      : Array.isArray((data as { results?: unknown }).results)
        ? (data as { results: unknown[] }).results
        : [];
    return entries
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => toEpisode(entry, base))
      .filter((episode): episode is Episode => episode !== null);
  } catch {
    return [];
  }
}
