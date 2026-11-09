// Explicit extension selects the shared source rather than this Android override.
import { productCatalog as sharedCatalog } from './catalog.ts';

const excludedGuideIds = new Set([
  'natural-sunburn-care',
  'natural-bug-bite-care',
  'natural-cough-comfort',
]);

export const productCatalog = sharedCatalog.filter(
  guide => !excludedGuideIds.has(guide.id),
);
