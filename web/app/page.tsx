import HomeClient from "./home-client";
import { productCatalog } from "../../src/catalog";

export default function Page() {
  return <HomeClient initialGuides={productCatalog} />;
}
