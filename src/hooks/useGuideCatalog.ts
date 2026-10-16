import { placeholderCatalog } from '../catalog';

// Use the bundled directory during the concept phase. Legacy remote guides
// and caches belong to the previous product direction.
export function useGuideCatalog() {
  return { guides: placeholderCatalog, isLoading: false };
}
