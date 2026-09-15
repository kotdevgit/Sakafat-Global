import { getApiBaseUrl } from "./config";

/** Mirrors Django's Programme serializer; Django remains the authority for these values. */
export type Programme = {
  id: number;
  name: string;
  slug: string;
  pillar: string;
  pillarLabel: string;
  description: string;
  status: string;
  statusLabel: string;
  imageUrl: string | null;
};

/** Discovery filters on the programmes page, in the order they are shown. */
export const programmeFilters = ["All Programmes", "Open Now", "Upcoming", "In Development"] as const;
export type ProgrammeFilter = (typeof programmeFilters)[number];

/** "Open" and "Register Interest" are both currently actionable, so they share one filter. */
const filterForStatus: Record<string, ProgrammeFilter> = {
  open: "Open Now",
  register_interest: "Open Now",
  upcoming: "Upcoming",
  development: "In Development",
};

export function filterOf(programme: Programme): ProgrammeFilter | null {
  return filterForStatus[programme.status] ?? null;
}

export function matchesFilter(programme: Programme, filter: ProgrammeFilter): boolean {
  return filter === "All Programmes" || filterOf(programme) === filter;
}

/** Only "Open" programmes have an action today; the rest link to their details. */
export function actionLabel(programme: Programme): string {
  return programme.status === "open" || programme.status === "register_interest"
    ? "Register Interest"
    : "View Details";
}

function toProgramme(entry: Record<string, unknown>, base: string): Programme | null {
  const { id, name, slug, pillar, description, status } = entry;
  if (typeof id !== "number" || typeof name !== "string" || typeof slug !== "string") return null;
  if (typeof description !== "string" || typeof status !== "string" || typeof pillar !== "string") return null;
  let imageUrl: string | null = null;
  if (typeof entry.image === "string" && entry.image) {
    // Django returns a relative media path unless the request reaches it absolutely.
    try {
      imageUrl = new URL(entry.image, base).toString();
    } catch {
      imageUrl = null;
    }
  }
  return {
    id,
    name,
    slug,
    pillar,
    pillarLabel: typeof entry.pillar_label === "string" ? entry.pillar_label : pillar,
    description,
    status,
    statusLabel: typeof entry.status_label === "string" ? entry.status_label : status,
    imageUrl,
  };
}

/**
 * Reads the published programmes from Django.
 * Returns an empty list when the backend is unavailable so a page still renders.
 */
export async function getProgrammes(): Promise<Programme[]> {
  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return [];
  }
  try {
    const response = await fetch(new URL("programme/", base), {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      // Programmes change through the admin, so refresh them on a short cycle.
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
      .map((entry) => toProgramme(entry, base))
      .filter((programme): programme is Programme => programme !== null);
  } catch {
    return [];
  }
}

/**
 * Reads a single programme by slug from Django.
 * Returns null if not found or if the backend is unreachable.
 */
export async function getProgrammeBySlug(slug: string): Promise<Programme | null> {
  let base: string;
  try {
    base = getApiBaseUrl();
  } catch {
    return null;
  }
  try {
    const response = await fetch(new URL(`programme/${encodeURIComponent(slug)}/`, base), {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return toProgramme(data as Record<string, unknown>, base);
  } catch {
    return null;
  }
}
