import { productCatalog } from '../catalog';

// Use the bundled directory for product browsing. Legacy remote guides
// and caches belong to the previous product direction.
export function useGuideCatalog() {
  return { guides: productCatalog, isLoading: false };
}
