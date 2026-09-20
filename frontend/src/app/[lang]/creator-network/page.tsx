import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { CreatorNetworkView } from "@/components/creator-network/creator-network-view";

export async function generateMetadata(): Promise<Metadata> {
  return getDictionary(await getLocale()).meta.creatorNetwork;
}

export default async function CreatorNetworkPage() {
  const dict = getDictionary(await getLocale());

  return <CreatorNetworkView dict={dict} />;
}
