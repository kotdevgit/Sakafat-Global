/**
 * Layout facts about each pillar: its slug and the artwork and photograph that
 * belong to it. Every word — the name, its meaning, the introduction and the
 * photograph's description — lives in the dictionary under the same slug, so a
 * pillar page reads in whichever language it is served in.
 */
export const pillarDetails = [
  { slug: "idraak", artwork: "Adraak.png", width: 473, height: 256, photo: "idrak-photo.png" },
  { slug: "rabta", artwork: "Raabty.png", width: 402, height: 266, photo: "Rabta-photo.png" },
  { slug: "ikhlakiat", artwork: "Ikhlakiyat.png", width: 565, height: 271, photo: "ikhlakiat-photo.png" },
  { slug: "falah", artwork: "Hayalall Falah.png", width: 570, height: 258, photo: "falah-photo.png" },
  { slug: "sama", artwork: "Sama.png", width: 361, height: 267, photo: "sama-photo.png" },
] as const;

export type PillarDetail = (typeof pillarDetails)[number];
export type PillarSlug = PillarDetail["slug"];

export function getPillar(slug: string): PillarDetail | undefined {
  return pillarDetails.find((pillar) => pillar.slug === slug);
}
