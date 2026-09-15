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
  imageWidth: number | null;
  imageHeight: number | null;
  /** Optional upright artwork, preferred by the homepage hero over a centre crop. */
  heroImageUrl: string | null;
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
    imageWidth: typeof entry.image_width === "number" ? entry.image_width : null,
    imageHeight: typeof entry.image_height === "number" ? entry.image_height : null,
    heroImageUrl: absolute(entry.hero_image),
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

/** The hero renders this portrait slot at 520x594 CSS pixels. */
export const heroImageWidth = 520;
export const heroImageHeight = 594;

/**
 * Picks the hero card's photo: a purpose-made portrait upload when one exists,
 * otherwise the card image centre-cropped to the slot. Returns null when the
 * episode has no artwork at all, leaving the supplied hero artwork in place.
 */
export function heroPhotoUrl(episode: Episode): string | null {
  return episode.heroImageUrl ?? episode.imageUrl;
}

/** The episode the homepage hero features: the first one editors have ordered. */
export async function getHeroEpisode(): Promise<Episode | null> {
  const [first] = await getEpisodes();
  return first ?? null;
}
