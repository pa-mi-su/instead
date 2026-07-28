import HomeClient from "./home-client";
import { fetchPublishedGuides } from "../shared/lib/supabase";
import type { Guide } from "../shared/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  let guides: Guide[] = [];

  try {
    guides = await fetchPublishedGuides();
  } catch {
    // The browser can recover from its last locally cached catalog.
  }

  return <HomeClient initialGuides={guides} />;
}
