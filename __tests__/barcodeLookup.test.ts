import {
  classifyProduct,
  lookupBarcodeProduct,
  normalizeBarcode,
  parseProductLookup,
} from '../src/lib/barcodeLookup';
import { productCatalog } from '../src/catalog';

describe('barcodeLookup', () => {
  it('accepts standard UPC and EAN lengths and rejects other scans', () => {
    expect(normalizeBarcode('0123456789012')).toBe('0123456789012');
    expect(normalizeBarcode('12345678')).toBe('12345678');
    expect(normalizeBarcode('0 1234-5678 9012')).toBe('0123456789012');
    expect(normalizeBarcode(']d20109506000134352')).toBe('09506000134352');
    expect(normalizeBarcode('0109506000134352\u001d17281231')).toBe(
      '09506000134352',
    );
    expect(normalizeBarcode('12-34')).toBeNull();
    expect(normalizeBarcode('QR: 123456789012')).toBeNull();
  });

  it.each([
    [{ product_name: 'Colgate Total Toothpaste' }, 'natural-toothpaste'],
    [{ categories_tags: ['en:hair-shampoos'] }, 'natural-shampoo'],
    [{ generic_name: 'Antiperspirant deodorant' }, 'natural-deodorant'],
    [{ product_name: 'Dishwashing liquid' }, 'natural-dish-cleaner'],
    [{ product_name: 'Bar of Soap' }, 'natural-body-soap'],
    [{ categories_tags: ['en:soaps'] }, 'natural-body-soap'],
    [{ product_name: 'Solid shampoo bar' }, 'natural-shampoo'],
    [{ categories: 'Laundry detergent' }, 'natural-laundry-care'],
    [{ product_name: 'Window cleaner spray' }, 'natural-glass-cleaner'],
    [
      { generic_name: 'Multi purpose surface cleaner' },
      'natural-surface-cleaner',
    ],
    [{ product_name: 'Weed killer concentrate' }, 'natural-weed-killer'],
    [{ categories: 'Body lotion' }, 'natural-skin-care'],
    [{ product_name_en: 'Sun burn relief' }, 'natural-sunburn-care'],
    [
      { categories_hierarchy: ['en:personal-care', 'en:mosquito-bite-relief'] },
      'natural-bug-bite-care',
    ],
    [{ product_name: 'Throat lozenges' }, 'natural-cough-comfort'],
    [{ categories: 'Rodent repellent' }, 'natural-mouse-deterrents'],
    [{ product_name: 'Spider repellent' }, 'natural-spider-deterrents'],
    [{ product_name: 'Mystery household product' }, null],
  ])('classifies only a recognized product category', (product, expected) => {
    expect(classifyProduct(product)).toBe(expected);
  });

  it('maps every catalog guide title back to its own guide', () => {
    for (const guide of productCatalog) {
      expect(classifyProduct({ product_name: guide.title })).toBe(guide.id);
    }
  });

  it('parses the small product result and leaves unclear products unmatched', () => {
    expect(
      parseProductLookup('0123456789012', {
        status: 'success',
        product: {
          product_name: 'Fresh Toothpaste',
          brands: 'Example, Brand Two',
          categories_tags: ['en:toothpastes'],
          product_type: 'beauty',
        },
      }),
    ).toEqual({
      barcode: '0123456789012',
      name: 'Fresh Toothpaste',
      brand: 'Example',
      productType: 'beauty',
      guideId: 'natural-toothpaste',
    });

    expect(parseProductLookup('0123456789012', { status: 0 })).toBeNull();
  });

  it('tries UPC and EAN forms when a database stores a different GTIN variant', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        status: 0,
        ok: true,
        json: async () => ({ status: 0 }),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          status: 1,
          product: { product_name: 'Fresh toothpaste' },
        }),
      } as Response);

    try {
      const result = await lookupBarcodeProduct('04252614', 'upc-e');
      expect(result?.barcode).toBe('04252614');
      expect(result?.guideId).toBe('natural-toothpaste');
      expect(fetchMock.mock.calls[0]?.[0]).toContain('/04252614?');
      expect(fetchMock.mock.calls[1]?.[0]).toContain('/042100005264?');
    } finally {
      fetchMock.mockRestore();
    }
  });
});
