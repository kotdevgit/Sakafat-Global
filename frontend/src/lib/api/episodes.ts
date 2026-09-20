import { getApiBaseUrl } from "./config";
import { missingApiBaseUrl, reportUnavailable } from "./unavailable";

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
  titleUr?: string;
  descriptionUr?: string;
  categoryLabelUr?: string;
  imageAltUr?: string;
};

function toEpisode(entry: Record<string, unknown>, base: string, locale?: string): Episode | null {
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
  const isUrdu = locale === "ur";
  const titleUr = typeof entry.title_ur === "string" ? entry.title_ur : undefined;
  const descriptionUr = typeof entry.description_ur === "string" ? entry.description_ur : undefined;
  const categoryLabelUr = typeof entry.category_label_ur === "string" ? entry.category_label_ur : undefined;
  const imageAltUr = typeof entry.image_alt_ur === "string" ? entry.image_alt_ur : undefined;

  const resolvedTitle = isUrdu && titleUr ? titleUr : title;
  const resolvedDescription = isUrdu && descriptionUr ? descriptionUr : description;
  const resolvedCategoryLabel = isUrdu && categoryLabelUr
    ? categoryLabelUr
    : typeof entry.category_label === "string"
      ? entry.category_label
      : category;
  const resolvedImageAlt = isUrdu && imageAltUr
    ? imageAltUr
    : typeof entry.image_alt === "string"
      ? entry.image_alt
      : "";

  return {
    id,
    title: resolvedTitle,
    slug,
    category,
    categoryLabel: resolvedCategoryLabel,
    description: resolvedDescription,
    imageUrl: absolute(entry.image),
    imageWidth: typeof entry.image_width === "number" ? entry.image_width : null,
    imageHeight: typeof entry.image_height === "number" ? entry.image_height : null,
    heroImageUrl: absolute(entry.hero_image),
    imageAlt: resolvedImageAlt,
    videoUrl: absolute(entry.video_url),
    titleUr,
    descriptionUr,
    categoryLabelUr,
    imageAltUr,
  };
}

/**
 * Reads the published episodes from Django.
 * Returns an empty list when the backend is unavailable so a page still renders.
 */
export async function getEpisodes(locale?: string): Promise<Episode[]> {
  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    reportUnavailable("Episodes", missingApiBaseUrl);
    return [];
  }
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (locale) headers["Accept-Language"] = locale;
    const response = await fetch(new URL("episode/", base), {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      // Episodes change through the admin, so refresh them on a short cycle.
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      reportUnavailable("Episodes", `Django answered ${response.status}. Check the backend is running and migrated.`);
      return [];
    }
    const data: unknown = await response.json();
    const entries = Array.isArray(data)
      ? data
      : Array.isArray((data as { results?: unknown }).results)
        ? (data as { results: unknown[] }).results
        : [];
    return entries
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => toEpisode(entry, base, locale))
      .filter((episode): episode is Episode => episode !== null);
  } catch (error) {
    reportUnavailable("Episodes", error);
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
export async function getHeroEpisode(locale?: string): Promise<Episode | null> {
  const [first] = await getEpisodes(locale);
  return first ?? null;
}
