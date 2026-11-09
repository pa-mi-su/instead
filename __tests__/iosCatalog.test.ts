import { productCatalog as iosCatalog } from '../src/catalog.ios';
import { productCatalog as androidCatalog } from '../src/catalog.android';
import { productCatalog as sharedCatalog } from '../src/catalog.ts';
import { categories as iosCategories } from '../src/categories.ios';
import { categories as androidCategories } from '../src/categories.android';

it('Apple matches Android guide exclusions and leaves every remaining guide unchanged', () => {
  expect(iosCatalog).toEqual(androidCatalog);
  expect(iosCategories).toEqual(androidCategories);
  expect(sharedCatalog.length - iosCatalog.length).toBe(3);
  for (const guide of iosCatalog) {
    expect(guide).toBe(sharedCatalog.find(item => item.id === guide.id));
  }
});
