export const pillarDetails = [
  { slug: "idraak", name: "Idraak", meaning: "Understanding", introduction: "How do we understand? Perception, cognition and critical thinking that help people understand themselves, others and the world.", artwork: "Adraak.png", width: 473, height: 256, photo: "idrak-photo.png", alt: "An interview with a guest at a Sakafat exhibition" },
  { slug: "rabta", name: "Rabta", meaning: "Connection", introduction: "How do we connect? Meaningful dialogue and stronger relationships across people, communities, institutions and industries.", artwork: "Raabty.png", width: 402, height: 266, photo: "Rabta-photo.png", alt: "A Sakafat interviewer in conversation with a guest" },
  { slug: "ikhlakiat", name: "Ikhlakiat", meaning: "Ethics", introduction: "How should we act? Values, responsibility and ethical choices influencing public, professional and community life.", artwork: "Ikhlakiyat.png", width: 565, height: 271, photo: "ikhlakiat-photo.png", alt: "Two participants in conversation at a Sakafat exhibition" },
  { slug: "falah", name: "Falah", meaning: "Progress", introduction: "How do we move forward? Skills, confidence, careers, enterprise and practical pathways into opportunity.", artwork: "Hayalall Falah.png", width: 570, height: 258, photo: "falah-photo.png", alt: "Sakafat recording studio with microphones, cameras and seating" },
  { slug: "sama", name: "Sama", meaning: "Cultural Heritage", introduction: "What gives us depth and belonging? Pakistan’s living artistic heritage through music, poetry, performance and cultural storytelling.", artwork: "Sama.png", width: 361, height: 267, photo: "sama-photo.png", alt: "Four speakers taking part in Sakafat conversations" },
];

export type PillarDetail = (typeof pillarDetails)[number];
export function getPillar(slug: string) {
  return pillarDetails.find((pillar) => pillar.slug === slug);
}
