import HomeClient from "./home-client";
import { placeholderCatalog } from "../../src/catalog";

export default function Page() {
  return <HomeClient initialGuides={placeholderCatalog} />;
}
