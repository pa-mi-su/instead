import HomeClient from "./home-client";
import type { Guide } from "../../src/types";
import { fetchPublishedGuides } from "../lib/supabase";

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
